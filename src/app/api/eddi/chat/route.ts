import { google } from '@ai-sdk/google';
import { generateText, tool, stepCountIs } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eddiConversations, eddiMessages } from '@/app/db/drizzle/schema';
import { eq, asc } from 'drizzle-orm';
import { errorResponse } from '@/lib/errors/error-handler';
import { getCurrentUser } from '@/lib/auth/session';
import { generateConversationTitle } from '@/lib/eddi/conversation-helpers';
import {
    find_module,
    get_modules_by_course,
    get_quiz_for_module,
    get_next_module,
    search_resources,
    parseUserContext,
    Maps_to,
    launch_quiz,
    display_list,
    create_ticket,
    feature_unavailable,
    getAvailableFeatures,
    get_course_progress,
    get_all_progress,
    find_and_navigate_to_quiz,
    get_next_incomplete_module,
    get_study_recommendations,
    get_quiz_questions_for_tutoring,
    get_module_content_for_topic,
} from '@/lib/eddi-tools';
import { buildEddiContext, type EddiContext } from '@/lib/eddi/context-helpers';

// Allow responses up to 30 seconds
export const maxDuration = 30;

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

const SearchSchema = z.object({
    query: z.string().describe('The name of the module or course to search for.'),
});

const CourseModulesSchema = z.object({
    courseIdOrTitle: z.string().describe('The course ID (slug) or title to get modules for.'),
});

const QuizSchema = z.object({
    moduleIdOrTitle: z.string().describe('The module ID or title to get quiz for.'),
});

const NextModuleSchema = z.object({
    currentModuleId: z.string().describe('The current module UUID to find the next module from.'),
});

const ResourceSearchSchema = z.object({
    query: z.string().describe('Search term for resources (PDFs, videos, articles).'),
});

const NavigateSchema = z.object({
    path: z.string().describe('The internal path to navigate to (e.g., "/courses/calculus/limits").'),
});

const LaunchQuizSchema = z.object({
    moduleId: z.string().describe('The module ID (from URL) to launch quiz for.'),
    courseId: z.string().describe('The course ID (slug) the module belongs to.'),
});

const DisplayListSchema = z.object({
    items: z.array(z.object({
        title: z.string(),
        path: z.string().optional(),
        description: z.string().optional(),
    })).describe('List of items to display'),
    listTitle: z.string().describe('Title for the list'),
});

const TicketSchema = z.object({
    subject: z.string().describe('The subject line of the ticket.'),
    body: z.string().describe('The main content/description of the issue.'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const FeatureUnavailableSchema = z.object({
    featureName: z.string().describe('Name of the unavailable feature'),
    alternativeSuggestion: z.string().optional().describe('Alternative action to suggest'),
});

const CourseProgressSchema = z.object({
    courseId: z.string().describe('The course ID (slug) or title to get progress for.'),
    userId: z.string().describe('The user ID to get progress for.'),
});

const AllProgressSchema = z.object({
    userId: z.string().describe('The user ID to get overall progress for.'),
});

const FindAndNavigateToQuizSchema = z.object({
    query: z.string().describe('The course or topic name to find a quiz for (e.g., "calculus", "linear algebra", "limits").'),
    userId: z.string().describe('The user ID to check progress for.'),
});

const NextIncompleteModuleSchema = z.object({
    courseIdOrTitle: z.string().describe('The course ID (slug) or title to find the next incomplete module in.'),
    userId: z.string().describe('The user ID to check progress for.'),
});

const StudyRecommendationsSchema = z.object({
    userId: z.string().describe('The user ID to get study recommendations for.'),
});

// Tutoring Tools
const QuizTutoringSchema = z.object({
    moduleIdOrTitle: z.string().describe('The module ID (UUID or URL slug) or title to get quiz questions for.'),
    questionNumber: z.number().optional().describe('Optional 1-based question number to get a specific question. Omit to get all questions.'),
});

const ModuleContentSchema = z.object({
    moduleIdOrTitle: z.string().describe('The module ID (UUID or URL slug) or title.'),
    topic: z.string().optional().describe('Optional topic to search for within the module content (e.g., "derivatives", "limits", "power rule").'),
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

interface SystemPromptContext {
    currentPath?: string;
    pageType?: string;
    courseId?: string | null;
    moduleId?: string | null;
    userId?: string;
    features: { resources: boolean; progress: boolean };
}

function buildSystemPrompt(context: SystemPromptContext) {
    const userContext = context.currentPath ? parseUserContext(context.currentPath) : null;

    let contextInfo = '';
    let tutorModeInfo = '';
    if (userContext?.type === 'module') {
        contextInfo = `
**CURRENT CONTEXT:** User is viewing a module.
- Page type: module
- Course slug: ${userContext.courseId}
- Module URL segment: ${userContext.moduleId}
- Full path: ${context.currentPath}

**CONTEXT-AWARE ACTIONS for module pages:**
- "what's next?" / "next" / "continue" → Use \`find_module\` to search for the current module by URL segment, then call \`get_next\` with its UUID
- "quiz me" / "start quiz" → Call \`start_quiz\` with moduleId="${userContext.moduleId}" and courseId="${userContext.courseId}"
- "how am I doing?" → Call \`get_course_progress\` for course "${userContext.courseId}"
- "go back" → Find previous module in the course
- "help with quiz" / "stuck" / "having trouble" / "don't understand" → Enter TUTOR MODE (see below)`;

        // Tutor mode is available when on a module page (quizzes live on module pages)
        tutorModeInfo = `

📚 **TUTOR MODE — ACTIVE ON MODULE PAGES**

You are currently on a module page, which means the user may be working on module content or a quiz.
When a user asks for HELP with a quiz, concept, or says they're struggling — BECOME A TUTOR, not a ticket creator.

**DETECTING TUTOR SITUATIONS:**
Trigger tutor mode when the user says any of these (or similar):
- "having trouble with this quiz"
- "I'm stuck on question 3"
- "I don't understand this"
- "help me with this problem"
- "what's the answer to..." (guide them, don't answer)
- "can you explain..."
- "I'm confused about..."
- "this is hard"

Do NOT create a support ticket for learning/quiz help. Tickets are only for technical issues.

**TUTOR MODE TOOLS:**
| Tool | Use When |
|------|----------|
| \`get_quiz_questions\` | Fetch quiz question(s) WITHOUT answers — to understand what the student is working on |
| \`get_module_content\` | Fetch module markdown content — to reference material while tutoring |

**TUTOR MODE RULES:**

1. **NEVER give the direct answer** to a quiz question. If the user asks for the answer directly, say:
   "I can't give you the answer, but I can help you figure it out! What part is confusing?"

2. **Use the Socratic method** — guide with leading questions:
   - "What do you think the first step would be?"
   - "Which formula applies to this type of problem?"
   - "Can you identify the key variable here?"

3. **Break down complex problems** into smaller, manageable steps:
   - Step 1: Identify what the question is asking
   - Step 2: Recall the relevant concept or formula
   - Step 3: Apply it to this specific problem
   - Step 4: Check the answer

4. **Provide hints, not solutions:**
   - Gentle hint: "Think about what happens when you take the derivative of x^n..."
   - Moderate hint: "The formula you need is d/dx[x^n] = n·x^(n-1). Can you apply it here?"
   - Strong hint: "If f(x) = x^3, then f'(x) = 3·x^(3-1). Now try applying this pattern to your function."

5. **Give examples of SIMILAR problems** (not the exact one):
   - "Here's a similar problem: If f(x) = x^4, what's f'(x)? Try working through this, then apply the same logic to your question."

6. **Celebrate progress:** When they get something right, acknowledge it:
   - "Exactly! 🎯 You've got it!"
   - "Perfect! That's the right approach!"

7. **Offer fallback to module content** if they're really stuck:
   - "Would you like to review the module content on [topic] before trying again?"
   - Call \`get_module_content\` to find the relevant section and reference it

8. **Track their progress** in the conversation:
   - Remember which questions they've asked about
   - If they keep struggling, escalate hints from gentle → moderate → strong
   - After 3+ attempts on the same question, offer to go back to the module

**TUTOR MODE EXAMPLE FLOWS:**

User: "having trouble with this quiz"
→ Say: "I'm here to help! Which question are you stuck on? Tell me the question number or describe what's confusing you."
→ Do NOT create a ticket. Do NOT navigate away.

User: "question 3 is confusing"
→ Call \`get_quiz_questions("${userContext.moduleId}", 3)\`
→ Read the question and options
→ Ask: "Let's work through this! [Describe what the question is about]. What do you think the first step would be?"

User: "I don't know which formula to use"
→ Call \`get_module_content("${userContext.moduleId}", "[relevant topic]")\`
→ Reference the module content: "According to the module, [concept explanation]."
→ Ask: "Based on that, which formula do you think applies here?"

User: "just tell me the answer"
→ Say: "I want to help you really understand this! Let me give you a hint instead..."
→ Provide a moderate-level hint
→ Say: "Try applying that and let me know what you get!"

User: "I got 3x^2!"
→ Say: "That's correct! 🎉 Great job working through that! Ready for the next question?"
`;
    } else if (userContext?.type === 'course') {
        contextInfo = `
**CURRENT CONTEXT:** User is viewing a course overview.
- Page type: course
- Course slug: ${userContext.courseId}
- Full path: ${context.currentPath}

**CONTEXT-AWARE ACTIONS for course pages:**
- "show modules" / "what's in this course?" → Call \`get_course_modules\` with "${userContext.courseId}"
- "how am I doing?" / "my progress" → Call \`get_course_progress\` for "${userContext.courseId}"
- "what's next?" → Call \`get_course_progress\` to find the next incomplete module
- "quiz me" → Show modules with quizzes in this course`;
    } else if (userContext?.type === 'dashboard') {
        contextInfo = `
**CURRENT CONTEXT:** User is on the dashboard.
- Page type: dashboard

**CONTEXT-AWARE ACTIONS for dashboard:**
- "what's next?" → Call \`get_all_progress\` to find courses in progress, then suggest continuing
- "how am I doing?" → Call \`get_all_progress\` to show overall stats
- "show courses" → Navigate to courses page or list available courses`;
    } else {
        contextInfo = `
**CURRENT CONTEXT:** User is on page: ${context.currentPath || 'unknown'}
- Page type: ${context.pageType || 'other'}
- No specific course/module context available.
- If user asks context-dependent questions, ask them to specify which course or module.`;
    }

    const userId = context.userId || 'unknown';
    const userIdInfo = userId !== 'unknown'
        ? `\n**USER:** Authenticated (userId: ${userId}). Use this when calling progress tools.`
        : `\n**USER:** Not authenticated. Progress features may not work.`;

    const featuresInfo = `
**FEATURE AVAILABILITY:**
- Resources/PDFs: ${context.features.resources ? '✓ Available' : '✗ Coming soon'}
- Progress tracking: ✓ Available (via get_course_progress and get_all_progress)`;

    return `You are Eddi, an autonomous and proactive learning assistant for WorldEd.
Your goal is to help users navigate courses, find content, take quizzes, track progress, AND tutor students who need help understanding material.

${contextInfo}${tutorModeInfo}
${userIdInfo}
${featuresInfo}

**CORE BEHAVIOR RULES:**

1. **ACT IMMEDIATELY** — When a user wants to go somewhere or do something, execute the action. Don't ask "Would you like me to open it?" — just do it and confirm.

2. **CHAIN TOOLS** — You can call multiple tools in sequence to accomplish complex tasks. For example, to "take me to the calculus quiz", use \`find_and_navigate_to_quiz\` which handles the entire flow automatically. For multi-step tasks where no composite tool exists, call tools one after another — each result feeds into your next decision.

3. **PREFER COMPOSITE TOOLS** — For complex requests, prefer the composite tools (\`find_and_navigate_to_quiz\`, \`get_next_incomplete_module\`, \`get_study_recommendations\`) over chaining basic tools manually. They handle error cases and ambiguity automatically.

4. **SEARCH FIRST** — If user mentions a topic/module/course by name, call \`find_module\` to get the ID, then navigate.

5. **NEVER ASK FOR IDs** — Users don't know UUIDs or slugs. Always search by title/topic.

6. **HANDLE MULTIPLE RESULTS** — If search returns multiple matches, briefly list them and ask which one. If single match, navigate immediately.

7. **GRACEFUL FALLBACKS** — If a feature isn't ready (like resources), use \`feature_unavailable\` and suggest alternatives.

8. **CONTEXT-AWARE** — Use the current context to understand relative requests like "next module", "quiz me", or "how am I doing?". The CONTEXT-AWARE ACTIONS section above tells you exactly what to do for each page type.

9. **PROGRESS-AWARE** — When users ask about progress, use \`get_course_progress\` (for a specific course) or \`get_all_progress\` (for overall stats).

10. **NEVER REPEAT YOURSELF** — Never send the same message or call the same tool twice in a row for the same purpose. If the previous messages contain a recommendation or analysis, build on it rather than re-doing it.

**YOUR TOOLS:**

| Tool | Use When |
|------|----------|
| \`find_module\` | User wants to find/open a module or course |
| \`get_course_modules\` | User wants to see all modules in a course |
| \`get_quiz\` | User wants to know about quizzes for a module |
| \`get_next\` | User says "next", "continue", "what's next" (when you already have the UUID) |
| \`search_resources\` | User asks for PDFs, resources, supplemental materials |
| \`navigate_to\` | Navigate user to a specific path |
| \`start_quiz\` | Launch quiz for a module (when you already know module/course IDs) |
| \`show_list\` | Display a formatted list in chat |
| \`create_ticket\` | Create a support ticket |
| \`get_course_progress\` | User asks about progress in a specific course |
| \`get_all_progress\` | User asks about overall progress across all courses |
| \`feature_unavailable\` | Feature isn't ready yet |
| **\`find_and_navigate_to_quiz\`** | **"Take me to the X quiz" — finds course, module, quiz in one step** |
| **\`get_next_incomplete_module\`** | **"Continue X" — finds next incomplete module based on progress** |
| **\`get_study_recommendations\`** | **"What should I study?" / "Any advice?" — comprehensive recommendations based on scores, progress, and streaks** |
| **\`get_quiz_questions\`** | **"Help with question 3" — fetch quiz questions WITHOUT answers for tutoring guidance** |
| **\`get_module_content\`** | **"Explain derivatives" — fetch module content to reference while tutoring** |

**STUDY RECOMMENDATIONS & ADVICE:**

When the user asks for study advice, what to review, or how to improve:
→ Call \`get_study_recommendations(userId)\`
→ The tool returns a \`suggestion\` field. Respond based on its value:

  IF suggestion === 'review_weak_areas':
    - List the weak modules with their scores
    - Offer to navigate to the weakest one for review
    - Example: "I noticed you scored below 70% on these modules:
      • Integration Basics (60%) — Calculus
      • Matrix Operations (65%) — Linear Algebra
      Would you like to review Integration Basics first?"

  IF suggestion === 'continue_learning':
    - Tell the user their scores are strong
    - Show their in-progress modules
    - Offer to continue where they left off
    - Example: "All your scores are solid! You have 3 modules in progress:
      • Optimization — Calculus
      • Eigenvalues — Linear Algebra
      Ready to continue with Optimization?"

  IF suggestion === 'explore_advanced':
    - Congratulate high completion rate
    - Suggest new courses or advanced topics
    - Example: "Impressive! You've completed 92% of available modules with great scores.
      Ready for advanced topics or a new course?"

  IF suggestion === 'keep_going':
    - Encourage continued progress
    - Mention their completion stats
    - Suggest a next module to work on
    - Example: "You're doing great — all scores above 70%! Keep building momentum."

  IF suggestion === 'get_started':
    - Warmly welcome them
    - Suggest browsing courses
    - Navigate them to the courses page

**HANDLING USER CONFIRMATIONS ("yes", "sure", "ok", "let's do it"):**

CRITICAL: When a user responds with a confirmation (yes/sure/ok/etc.) to something you just said or offered:
1. Look at what YOU suggested in the previous assistant message.
2. DO NOT re-call the same analysis tool again. You already have the information.
3. Instead, EXECUTE the action you proposed:
   - If you offered to navigate to a module → call \`navigate_to\` with the URL you mentioned
   - If you offered to start a quiz → call \`start_quiz\` with the module and course IDs
   - If you offered to show a list → call \`show_list\` with the items
   - If you offered to review a weak module → navigate to it
4. Confirm the action briefly: "Opening Integration Basics! 📚" or "Let's go! Taking you to Optimization."

Examples of CORRECT multi-turn behavior:
  You: "Would you like to review Integration Basics first?"
  User: "yes"
  You: [Call navigate_to("/courses/calculus/integration-basics")] "Opening Integration Basics for review! 📚"

  You: "Ready to continue with Optimization?"
  User: "sure"
  You: [Call navigate_to("/courses/calculus/optimization")] "Let's go! Continuing with Optimization."

Examples of WRONG behavior (never do this):
  You: "All your quiz scores are above 70%! Would you like me to recommend modules to review?"
  User: "yes"
  You: "Great job! All your quiz scores are above 70%..." ← NEVER repeat the same message

**MULTI-STEP EXAMPLE FLOWS:**

User: "Take me to the calculus quiz"
→ Call \`find_and_navigate_to_quiz("calculus", userId)\`
→ Function finds course, checks user's progress, locates quiz
→ Returns navigation action with quiz URL
→ Say: "Taking you to the [Module] quiz in Calculus!"

User: "Continue calculus" / "Continue my calculus course"
→ Call \`get_next_incomplete_module("calculus", userId)\`
→ Returns the next module the user hasn't completed
→ Call \`navigate_to(navigate_url)\` with the URL from the result
→ Say: "Continuing Calculus! Next up: [Module Name]"

User: "What should I study?" / "Any study advice?"
→ Call \`get_study_recommendations(userId)\`
→ Read the suggestion type and respond accordingly (see STUDY RECOMMENDATIONS section above)
→ Provide specific, actionable next steps

User: "Quiz me on my weakest topic"
→ Call \`get_study_recommendations(userId)\`
→ If weakModules exist, take the one with the lowest score
→ Call \`start_quiz(moduleId, courseId)\` for that module
→ Say: "Let's work on [Module] — you scored [X]% last time!"

User: "Show me what's next in all my courses"
→ Call \`get_all_progress(userId)\`
→ For each course with progress, extract next module info
→ Call \`show_list\` with the next modules across courses
→ Say: "Here's what's next in each of your courses:"

**BASIC EXAMPLE FLOWS:**

User: "Open the derivatives module"
→ Call \`find_module("derivatives")\`
→ Found 1 result → Call \`navigate_to\` with the path
→ Say: "Opening Limits and Derivatives..."

User: "Quiz me" (while on a module page)
→ Use context to get current module and course IDs
→ Call \`start_quiz\` with module and course IDs from context
→ Say: "Starting the quiz for [Module Name]..."

User: "What's next?" (while on a module page)
→ Use context: course is "${userContext?.courseId || 'unknown'}", module segment is "${userContext?.moduleId || 'unknown'}"
→ Call \`find_module\` with the module URL segment to get the UUID
→ Call \`get_next\` with the UUID
→ Navigate to the next module

User: "How am I doing?" (on a course page)
→ Call \`get_course_progress("${userContext?.courseId || 'unknown'}", userId)\`
→ Say: "You're 50% through Calculus — 2 of 4 modules done!"

**TONE:** Friendly, direct, and efficient. Keep responses brief — prefer action over explanation.`;
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
    const { messages: clientMessages, context = {}, conversationId: incomingConversationId } = await req.json();

    try {
        // ====================================================================
        // AUTHENTICATION
        // ====================================================================
        const user = await getCurrentUser();
        const userId = user?.id || 'unknown';

        // ====================================================================
        // CONVERSATION PERSISTENCE
        // ====================================================================
        let conversationId: string | null = incomingConversationId || null;

        // Extract the latest user message (last item in clientMessages array)
        const latestUserMessage = clientMessages
            ?.filter((m: { role: string }) => m.role === 'user')
            ?.at(-1);

        if (userId !== 'unknown' && latestUserMessage) {
            // Create conversation on first message
            if (!conversationId) {
                const title = generateConversationTitle(latestUserMessage.content);
                const newConv = await db.insert(eddiConversations)
                    .values({ userId, title })
                    .returning();
                conversationId = newConv[0].id;
                console.log('[eddi:chat] Created new conversation:', conversationId, 'title:', title);
            }

            // Save user message to DB
            await db.insert(eddiMessages).values({
                conversationId,
                role: 'user',
                content: latestUserMessage.content,
            });
        }

        // Load full message history from DB (if conversation exists)
        // This ensures server has the authoritative history, not the client
        let messages = clientMessages;
        if (conversationId) {
            const dbMessages = await db.select()
                .from(eddiMessages)
                .where(eq(eddiMessages.conversationId, conversationId))
                .orderBy(asc(eddiMessages.createdAt));

            if (dbMessages.length > 0) {
                messages = dbMessages.map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                }));
            }
        }

        // ====================================================================
        // CONTEXT & PROMPT BUILDING
        // ====================================================================
        const features = await getAvailableFeatures();

        const eddiContext: EddiContext | null = context.pathname
            ? buildEddiContext(context.pathname)
            : context.currentPath
                ? buildEddiContext(context.currentPath)
                : null;

        console.log('[eddi:chat] Context:', {
            path: eddiContext?.pathname || context.currentPath,
            pageType: eddiContext?.pageType,
            courseId: eddiContext?.courseId,
            moduleId: eddiContext?.moduleId,
            userId,
            conversationId,
            messageCount: messages.length,
        });

        const systemPrompt = buildSystemPrompt({
            currentPath: eddiContext?.pathname || context.currentPath,
            pageType: eddiContext?.pageType,
            courseId: eddiContext?.courseId,
            moduleId: eddiContext?.moduleId,
            userId,
            features,
        });

        // ====================================================================
        // GEMINI CALL
        // ====================================================================

        // Sanitize messages: filter out empty content (can cause Gemini to return no candidates)
        const sanitizedMessages = messages
            .filter((m: { role: string; content: string }) => m.content && m.content.trim().length > 0)
            .map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content.trim(),
            }));

        // Ensure we have at least one message
        if (sanitizedMessages.length === 0) {
            return NextResponse.json({
                text: "I didn't catch that — could you try again?",
                action: null,
                conversationId,
            });
        }

        const result = await generateText({
            model: google('gemini-2.0-flash'),
            system: systemPrompt,
            messages: sanitizedMessages,
            stopWhen: stepCountIs(8),
            tools: {
                // Search & Discovery
                find_module: tool({
                    description: 'Search for courses or modules by title/topic. Returns matches with IDs.',
                    inputSchema: SearchSchema,
                    execute: async ({ query }) => {
                        console.log('\n=== API ROUTE: find_module TOOL CALLED ===');
                        console.log('Query param:', query);
                        const results = await find_module(query);
                        console.log('Tool returning results:', JSON.stringify(results).substring(0, 500));
                        console.log('=== END API ROUTE TOOL CALL ===\n');
                        return JSON.stringify(results);
                    },
                }),

                get_course_modules: tool({
                    description: 'Get all modules for a specific course. Use when user wants to see course contents.',
                    inputSchema: CourseModulesSchema,
                    execute: async ({ courseIdOrTitle }) => {
                        const results = await get_modules_by_course(courseIdOrTitle);
                        return JSON.stringify(results);
                    },
                }),

                get_quiz: tool({
                    description: 'Check if a module has a quiz and get quiz info.',
                    inputSchema: QuizSchema,
                    execute: async ({ moduleIdOrTitle }) => {
                        const results = await get_quiz_for_module(moduleIdOrTitle);
                        return JSON.stringify(results);
                    },
                }),

                get_next: tool({
                    description: 'Get the next module in sequence. Use when user says "next" or "continue".',
                    inputSchema: NextModuleSchema,
                    execute: async ({ currentModuleId }) => {
                        const results = await get_next_module(currentModuleId);
                        return JSON.stringify(results);
                    },
                }),

                search_resources: tool({
                    description: 'Search for supplemental resources (PDFs, videos, articles). May return "unavailable" if feature not ready.',
                    inputSchema: ResourceSearchSchema,
                    execute: async ({ query }) => {
                        const results = await search_resources(query);
                        return JSON.stringify(results);
                    },
                }),

                // Navigation Actions
                navigate_to: tool({
                    description: 'Navigate user to a specific path. Returns action for frontend.',
                    inputSchema: NavigateSchema,
                    execute: async ({ path }) => {
                        return await Maps_to(path);
                    },
                }),

                start_quiz: tool({
                    description: 'Launch quiz for a module. Navigates to module and scrolls to quiz section.',
                    inputSchema: LaunchQuizSchema,
                    execute: async ({ moduleId, courseId }) => {
                        return await launch_quiz(moduleId, courseId);
                    },
                }),

                // Display Actions
                show_list: tool({
                    description: 'Display a formatted list of items in the chat interface.',
                    inputSchema: DisplayListSchema,
                    execute: async ({ items, listTitle }) => {
                        return await display_list(items, listTitle);
                    },
                }),

                // Support
                create_ticket: tool({
                    description: 'Create a support ticket for user to review.',
                    inputSchema: TicketSchema,
                    execute: async ({ subject, body, priority }) => {
                        return await create_ticket(subject, body, priority);
                    },
                }),

                // Progress Tracking
                get_course_progress: tool({
                    description: 'Get user\'s progress for a specific course. Shows completed/total modules, percentage, and next module.',
                    inputSchema: CourseProgressSchema,
                    execute: async ({ courseId, userId: toolUserId }) => {
                        const results = await get_course_progress(courseId, toolUserId || userId);
                        return JSON.stringify(results);
                    },
                }),

                get_all_progress: tool({
                    description: 'Get user\'s progress across all courses they have started. Use for dashboard-level progress queries.',
                    inputSchema: AllProgressSchema,
                    execute: async ({ userId: toolUserId }) => {
                        const results = await get_all_progress(toolUserId || userId);
                        return JSON.stringify(results);
                    },
                }),

                // Fallback
                feature_unavailable: tool({
                    description: 'Indicate a feature is not yet available and suggest alternatives.',
                    inputSchema: FeatureUnavailableSchema,
                    execute: async ({ featureName, alternativeSuggestion }) => {
                        return await feature_unavailable(featureName, alternativeSuggestion);
                    },
                }),

                // Composite Multi-Step Tools
                find_and_navigate_to_quiz: tool({
                    description: 'Find a quiz for a topic/course and navigate directly. Handles the entire flow: find course → find next incomplete module → find quiz → return navigation. Use when user says "take me to the X quiz" or "quiz me on X".',
                    inputSchema: FindAndNavigateToQuizSchema,
                    execute: async ({ query, userId: toolUserId }) => {
                        const results = await find_and_navigate_to_quiz(query, toolUserId || userId);
                        return JSON.stringify(results);
                    },
                }),

                get_next_incomplete_module: tool({
                    description: 'Find the next module a user has not completed in a specific course. Use when user says "continue X" or "what\'s next in X" or "take me to my next module in X". Returns the next module to study based on progress.',
                    inputSchema: NextIncompleteModuleSchema,
                    execute: async ({ courseIdOrTitle, userId: toolUserId }) => {
                        const results = await get_next_incomplete_module(courseIdOrTitle, toolUserId || userId);
                        return JSON.stringify(results);
                    },
                }),

                get_study_recommendations: tool({
                    description: 'Get comprehensive study recommendations based on quiz scores, progress, and activity. Use when user asks "what should I study?", "any study advice?", "what should I review?", "where am I weak?", "how can I improve?", or wants a study plan. Returns prioritized suggestions with weak modules, incomplete modules, and completion stats.',
                    inputSchema: StudyRecommendationsSchema,
                    execute: async ({ userId: toolUserId }) => {
                        const results = await get_study_recommendations(toolUserId || userId);
                        return JSON.stringify(results);
                    },
                }),

                // Tutoring Tools
                get_quiz_questions: tool({
                    description: 'Fetch quiz questions for a module WITHOUT correct answers. Use in TUTOR MODE when helping a student with a quiz. Returns question text and answer options but deliberately excludes the correct answer — Eddi must guide, not reveal.',
                    inputSchema: QuizTutoringSchema,
                    execute: async ({ moduleIdOrTitle, questionNumber }) => {
                        const results = await get_quiz_questions_for_tutoring(moduleIdOrTitle, questionNumber);
                        return JSON.stringify(results);
                    },
                }),

                get_module_content: tool({
                    description: 'Fetch module content (markdown) to reference while tutoring. Optionally filter by topic to get only relevant sections. Use when explaining concepts, providing hints, or helping students understand material.',
                    inputSchema: ModuleContentSchema,
                    execute: async ({ moduleIdOrTitle, topic }) => {
                        const results = await get_module_content_for_topic(moduleIdOrTitle, topic);
                        return JSON.stringify(results);
                    },
                }),
            },
        });

        // ==================================================================
        // MULTI-STEP LOGGING
        // ==================================================================
        const totalSteps = result.steps?.length || 0;
        const toolCallNames: string[] = [];

        console.log(`\n=== EDDI MULTI-STEP EXECUTION ===`);
        console.log(`Total steps: ${totalSteps}`);
        console.log(`Final response: ${result.text?.substring(0, 100)}...`);

        if (result.steps?.length > 0) {
            for (let i = 0; i < result.steps.length; i++) {
                const step = result.steps[i];
                console.log(`\n--- Step ${i + 1}/${totalSteps} ---`);
                if (step.toolCalls && Array.isArray(step.toolCalls)) {
                    for (const tc of step.toolCalls) {
                        toolCallNames.push(tc.toolName);
                        console.log(`  Tool: ${tc.toolName}`);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        console.log(`  Args:`, JSON.stringify((tc as any).args || tc).substring(0, 200));
                    }
                }
                if (step.toolResults && Array.isArray(step.toolResults)) {
                    for (const tr of step.toolResults) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const output = (tr as any).result || (tr as any).output || tr;
                        console.log(`  Result (${tr.toolName}):`, JSON.stringify(output).substring(0, 300));
                    }
                }
            }
        }

        console.log(`\nTool chain: ${toolCallNames.join(' → ') || 'none'}`);

        // ==================================================================
        // EXTRACT ACTION PAYLOAD (last navigation-producing action wins)
        // ==================================================================
        let actionPayload = null;

        if (result.steps?.length > 0) {
            for (const step of result.steps) {
                if (step.toolResults && Array.isArray(step.toolResults)) {
                    for (const toolResult of step.toolResults) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        let output = ((toolResult as any).result || (toolResult as any).output) as Record<string, unknown> | string | undefined;

                        // Composite tools return JSON.stringify'd results — parse them
                        if (typeof output === 'string') {
                            try {
                                output = JSON.parse(output) as Record<string, unknown>;
                            } catch {
                                // Not JSON, skip
                                continue;
                            }
                        }

                        if (output && typeof output === 'object' && 'action' in output) {
                            console.log(`  Action found from ${toolResult.toolName}:`, (output as Record<string, unknown>).action);
                            actionPayload = output;
                        }
                    }
                }
            }
        }

        console.log('Final action payload:', actionPayload ? JSON.stringify(actionPayload).substring(0, 200) : 'none');
        console.log(`=== END EDDI EXECUTION ===\n`);

        // ==================================================================
        // SAVE ASSISTANT RESPONSE TO DB
        // ==================================================================
        if (conversationId && userId !== 'unknown') {
            await db.insert(eddiMessages).values({
                conversationId,
                role: 'assistant',
                content: result.text || '',
                actionPayload: actionPayload ? JSON.parse(JSON.stringify(actionPayload)) : null,
            });

            // Update conversation timestamp
            await db.update(eddiConversations)
                .set({ updatedAt: new Date() })
                .where(eq(eddiConversations.id, conversationId));
        }

        return NextResponse.json({
            text: result.text,
            action: actionPayload,
            conversationId,
        });

    } catch (error: unknown) {
        const err = error as { status?: number; message?: string; name?: string };

        // Handle Gemini returning no candidates (empty response)
        if (err.name === 'AI_APICallError' || err.message?.includes('Invalid JSON response') || err.message?.includes('candidates')) {
            console.error('[eddi:chat] Gemini returned no candidates:', err.message?.substring(0, 200));
            return NextResponse.json({
                text: "Hmm, I had trouble processing that. Could you rephrase your question?",
                action: null,
                conversationId: incomingConversationId || null,
            });
        }

        if (err.status === 429 || err.message?.includes('429')) {
            console.error('[eddi:chat] Rate limited by AI provider:', err.message);
            return NextResponse.json(
                { text: "I'm a bit overwhelmed right now. Give me a moment and try again!" },
                { status: 429 }
            );
        }

        return errorResponse(error, 500, 'eddi:chat');
    }
}
