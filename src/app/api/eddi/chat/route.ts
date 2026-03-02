import { google } from '@ai-sdk/google';
import { generateText, tool, stepCountIs } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/errors/error-handler';
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
} from '@/lib/eddi-tools';

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

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(context: { currentPath?: string; features: { resources: boolean; progress: boolean } }) {
    const userContext = context.currentPath ? parseUserContext(context.currentPath) : null;

    let contextInfo = '';
    if (userContext?.type === 'module') {
        contextInfo = `
**CURRENT CONTEXT:** User is viewing a module.
- Course: ${userContext.courseId}
- Module URL segment: ${userContext.moduleId}
When user says "next", "what's next", or "continue" → find and navigate to the next module.
When user says "quiz me" or "start quiz" → launch the quiz for this module.`;
    } else if (userContext?.type === 'course') {
        contextInfo = `
**CURRENT CONTEXT:** User is viewing course overview.
- Course: ${userContext.courseId}
When user asks about modules, show them the list for this course.`;
    } else {
        contextInfo = `
**CURRENT CONTEXT:** User is on the dashboard or another page.`;
    }

    const featuresInfo = `
**FEATURE AVAILABILITY:**
- Resources/PDFs: ${context.features.resources ? '✓ Available' : '✗ Coming soon'}
- Progress tracking: ${context.features.progress ? '✓ Available' : '✗ Coming soon'}`;

    return `You are Eddi, an autonomous and proactive learning assistant for WorldEd.
Your goal is to help users navigate courses, find content, take quizzes, and get support.

${contextInfo}

${featuresInfo}

**CORE BEHAVIOR RULES:**

1. **ACT IMMEDIATELY** — When a user wants to go somewhere or do something, execute the action. Don't ask "Would you like me to open it?" — just do it and confirm.

2. **SEARCH FIRST** — If user mentions a topic/module/course by name, call \`find_module\` to get the ID, then navigate.

3. **NEVER ASK FOR IDs** — Users don't know UUIDs or slugs. Always search by title/topic.

4. **HANDLE MULTIPLE RESULTS** — If search returns multiple matches, briefly list them and ask which one. If single match, navigate immediately.

5. **GRACEFUL FALLBACKS** — If a feature isn't ready (like resources or progress tracking), use \`feature_unavailable\` and suggest alternatives.

6. **CONTEXT-AWARE** — Use the current context to understand relative requests like "next module" or "quiz me".

**YOUR TOOLS:**

| Tool | Use When |
|------|----------|
| \`find_module\` | User wants to find/open a module or course |
| \`get_course_modules\` | User wants to see all modules in a course |
| \`get_quiz\` | User wants to know about quizzes for a module |
| \`get_next\` | User says "next", "continue", "what's next" |
| \`search_resources\` | User asks for PDFs, resources, supplemental materials |
| \`navigate_to\` | Navigate user to a specific path |
| \`start_quiz\` | Launch quiz for a module |
| \`show_list\` | Display a formatted list in chat |
| \`create_ticket\` | Create a support ticket |
| \`feature_unavailable\` | Feature isn't ready yet |

**EXAMPLE FLOWS:**

User: "Open the derivatives module"
→ Call \`find_module("derivatives")\`
→ Found 1 result: "Limits and Derivatives" in calculus
→ Call \`navigate_to("/courses/calculus/limits-and-derivatives")\`
→ Say: "Opening Limits and Derivatives..."

User: "What quizzes are available in linear algebra?"
→ Call \`get_course_modules("linear-algebra")\`
→ Filter to modules with hasQuiz: true
→ Call \`show_list\` with the quiz-enabled modules
→ Say: "Here are the modules with quizzes in Linear Algebra:"

User: "Quiz me" (while on a module page)
→ Use context to get current module ID
→ Call \`start_quiz\` with module and course IDs
→ Say: "Starting the quiz for [Module Name]..."

User: "Find the PDF for eigenvalues"
→ Call \`search_resources("eigenvalues")\`
→ If unavailable: suggest the related module instead

User: "How far am I in calculus?"
→ Call \`feature_unavailable("Progress tracking", "I can show you all modules in Calculus so you can see what's available")\`

**TONE:** Friendly, direct, and efficient. Keep responses brief — prefer action over explanation.`;
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
    const { messages, context = {} } = await req.json();

    try {
        // Get feature availability
        const features = await getAvailableFeatures();

        // Build context-aware system prompt
        const systemPrompt = buildSystemPrompt({
            currentPath: context.currentPath,
            features,
        });

        const result = await generateText({
            model: google('gemini-2.0-flash'),
            system: systemPrompt,
            messages,
            stopWhen: stepCountIs(5),
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

                // Fallback
                feature_unavailable: tool({
                    description: 'Indicate a feature is not yet available and suggest alternatives.',
                    inputSchema: FeatureUnavailableSchema,
                    execute: async ({ featureName, alternativeSuggestion }) => {
                        return await feature_unavailable(featureName, alternativeSuggestion);
                    },
                }),
            },
        });

        // Log for debugging
        console.log("Eddi Steps:", result.steps.length);
        console.log("Eddi Response:", result.text?.substring(0, 100));

        // Debug: Log ALL tool calls and results
        if (result.steps?.length > 0) {
            for (let i = 0; i < result.steps.length; i++) {
                const step = result.steps[i];
                console.log(`\n=== STEP ${i + 1} ===`);
                if (step.toolCalls && Array.isArray(step.toolCalls)) {
                    for (const tc of step.toolCalls) {
                        console.log(`Tool Called: ${tc.toolName}`);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        console.log(`Args:`, JSON.stringify((tc as any).args || tc).substring(0, 200));
                    }
                }
                if (step.toolResults && Array.isArray(step.toolResults)) {
                    for (const tr of step.toolResults) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const output = (tr as any).result || (tr as any).output || tr;
                        console.log(`Tool Result (${tr.toolName}):`, JSON.stringify(output).substring(0, 300));
                    }
                }
            }
        }

        // Extract action payload from tool results
        let actionPayload = null;

        if (result.steps?.length > 0) {
            for (const step of result.steps) {
                if (step.toolResults && Array.isArray(step.toolResults)) {
                    for (const toolResult of step.toolResults) {
                        // Check for action-producing tools (AI SDK uses 'result' or 'output')
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const output = ((toolResult as any).result || (toolResult as any).output) as { action?: string } | undefined;
                        if (output?.action) {
                            console.log('Found action payload:', output);
                            actionPayload = output;
                        }
                    }
                }
            }
        }

        console.log('Final actionPayload being returned:', actionPayload);

        return NextResponse.json({
            text: result.text,
            action: actionPayload,
        });

    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

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
