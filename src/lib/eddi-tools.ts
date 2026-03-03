import { db } from '@/db';
import { modules, courses, quizzes, resources, userProgress, userStreaks } from '@/app/db/drizzle/schema';
import { ilike, eq, or, and, sql, gt, lt, asc, count, isNotNull } from 'drizzle-orm';
import {
    getCourseProgress as calculateCourseProgress,
    getInProgressCourses,
    getOverallProgress,
} from '@/lib/progress/calculate-progress';

// ============================================================================
// FEATURE DETECTION UTILITIES
// ============================================================================

/**
 * Check if a table has any data (for graceful feature degradation)
 */
export async function checkTableHasData(tableName: 'resources' | 'user_progress'): Promise<boolean> {
    try {
        if (tableName === 'resources') {
            const result = await db.select({ count: count() }).from(resources);
            return (result[0]?.count ?? 0) > 0;
        }
        // user_progress doesn't exist yet, always return false
        return false;
    } catch (error) {
        console.error(`Error checking ${tableName} table:`, error);
        return false;
    }
}

/**
 * Get available features for the current state
 */
export async function getAvailableFeatures(): Promise<{
    resources: boolean;
    progress: boolean;
}> {
    const resourcesAvailable = await checkTableHasData('resources');
    return {
        resources: resourcesAvailable,
        progress: false, // Not implemented yet
    };
}

// ============================================================================
// MODULE RESOLUTION HELPER
// ============================================================================

/**
 * Resolve a module from a UUID, title, or URL slug.
 * URL slugs (e.g., "limits-and-continuity") need hyphens replaced with spaces
 * to match titles (e.g., "Limits and Continuity").
 *
 * IMPORTANT: modules.id is a uuid column. Passing a non-UUID string to
 * eq(modules.id, ...) causes a Postgres error: "invalid input syntax for type uuid".
 * We must validate UUID format before attempting an ID-based lookup.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveModule(moduleIdOrTitle: string) {
    console.log('[resolveModule] Input:', moduleIdOrTitle);

    // Strategy 1: If input looks like a UUID, try exact ID match
    if (UUID_REGEX.test(moduleIdOrTitle)) {
        const byId = await db.select()
            .from(modules)
            .where(eq(modules.id, moduleIdOrTitle))
            .limit(1);
        if (byId.length > 0) {
            console.log('[resolveModule] Found by UUID:', byId[0].title);
            return byId[0];
        }
    }

    // Strategy 2: Slug decode — replace hyphens with spaces (most common from URL context)
    // e.g., "limits-and-continuity" → "limits and continuity" → matches "Limits and Continuity"
    const decodedSlug = moduleIdOrTitle.replace(/-/g, ' ');
    if (decodedSlug !== moduleIdOrTitle) {
        const bySlug = await db.select()
            .from(modules)
            .where(ilike(modules.title, `%${decodedSlug}%`))
            .limit(1);
        if (bySlug.length > 0) {
            console.log('[resolveModule] Found by slug decode:', bySlug[0].title);
            return bySlug[0];
        }
    }

    // Strategy 3: Direct title ilike (handles proper titles passed as-is)
    const byTitle = await db.select()
        .from(modules)
        .where(ilike(modules.title, `%${moduleIdOrTitle}%`))
        .limit(1);
    if (byTitle.length > 0) {
        console.log('[resolveModule] Found by title match:', byTitle[0].title);
        return byTitle[0];
    }

    console.log('[resolveModule] Module not found for:', moduleIdOrTitle);
    return null;
}

// ============================================================================
// SEARCH & NAVIGATION TOOLS
// ============================================================================

/**
 * Search for courses or modules by title
 * Returns enriched data including quiz availability
 */
export async function find_module(query: string) {
    console.log('\n=== FIND_MODULE DEBUG ===');
    console.log('Query received:', query);

    try {
        // First, let's see what's actually in the database
        const allCourses = await db.select({
            id: courses.id,
            title: courses.title,
        }).from(courses);
        console.log('All courses in DB:', allCourses.map(c => `${c.id}: ${c.title}`));

        const allModules = await db.select({
            id: modules.id,
            title: modules.title,
            courseId: modules.courseId,
        }).from(modules).limit(20);
        console.log('Sample modules in DB:', allModules.map(m => `${m.title} (${m.courseId})`));

        // Clean the query - remove common words and normalize
        const cleanQuery = query.toLowerCase().trim();
        console.log('Clean query:', cleanQuery);

        // Search modules with quiz count
        const moduleResults = await db.select({
            id: modules.id,
            title: modules.title,
            courseId: modules.courseId,
            orderIndex: modules.orderIndex,
            type: sql<string>`'module'`,
        })
            .from(modules)
            .where(
                or(
                    ilike(modules.title, `%${query}%`),
                    ilike(modules.contentMarkdown, `%${query}%`)
                )
            )
            .limit(5);

        console.log('Module search results:', moduleResults.length, moduleResults.map(m => m.title));

        // Get quiz counts for found modules
        const modulesWithQuizInfo = await Promise.all(
            moduleResults.map(async (mod) => {
                const quizCount = await db.select({ count: count() })
                    .from(quizzes)
                    .where(eq(quizzes.moduleId, mod.id));
                return {
                    ...mod,
                    hasQuiz: (quizCount[0]?.count ?? 0) > 0,
                };
            })
        );

        // Search courses - try multiple patterns
        let courseResults = await db.select({
            id: courses.id,
            title: courses.title,
            description: courses.description,
            type: sql<string>`'course'`,
        })
            .from(courses)
            .where(
                or(
                    ilike(courses.title, `%${query}%`),
                    ilike(courses.description, `%${query}%`)
                )
            )
            .limit(3);

        console.log('Course search results:', courseResults.length, courseResults.map(c => c.title));

        // If no results, try looser matching (first word only, or partial)
        if (courseResults.length === 0 && modulesWithQuizInfo.length === 0) {
            console.log('No results found, trying looser matching...');

            // Try matching just the first few characters
            const partialQuery = query.slice(0, Math.min(4, query.length));
            console.log('Trying partial query:', partialQuery);

            courseResults = await db.select({
                id: courses.id,
                title: courses.title,
                description: courses.description,
                type: sql<string>`'course'`,
            })
                .from(courses)
                .where(ilike(courses.title, `%${partialQuery}%`))
                .limit(3);

            console.log('Partial match course results:', courseResults.length, courseResults.map(c => c.title));
        }

        const result = {
            modules: modulesWithQuizInfo,
            courses: courseResults,
            totalResults: modulesWithQuizInfo.length + courseResults.length,
        };

        console.log('Final result:', JSON.stringify(result, null, 2));
        console.log('=== END FIND_MODULE DEBUG ===\n');

        return result;
    } catch (error) {
        console.error("Error finding module:", error);
        return { modules: [], courses: [], totalResults: 0, error: 'Search failed' };
    }
}

/**
 * Get all modules for a specific course
 */
export async function get_modules_by_course(courseIdOrTitle: string) {
    console.log('\n=== GET_MODULES_BY_COURSE DEBUG ===');
    console.log('courseIdOrTitle received:', courseIdOrTitle);

    try {
        // First try to find the course
        let courseId = courseIdOrTitle;

        // Check if it's a title match needed
        const courseMatch = await db.select()
            .from(courses)
            .where(or(
                eq(courses.id, courseIdOrTitle),
                ilike(courses.title, `%${courseIdOrTitle}%`)
            ))
            .limit(1);

        console.log('Course match:', courseMatch.length > 0 ? courseMatch[0] : 'NOT FOUND');

        if (courseMatch.length === 0) {
            console.log('=== END GET_MODULES_BY_COURSE (not found) ===\n');
            return { error: 'Course not found', modules: [] };
        }

        courseId = courseMatch[0].id;

        // Get all modules for this course
        const moduleResults = await db.select({
            id: modules.id,
            title: modules.title,
            orderIndex: modules.orderIndex,
            courseId: modules.courseId,
        })
            .from(modules)
            .where(eq(modules.courseId, courseId))
            .orderBy(asc(modules.orderIndex));

        // Add quiz info for each module
        const modulesWithQuizInfo = await Promise.all(
            moduleResults.map(async (mod) => {
                const quizCount = await db.select({ count: count() })
                    .from(quizzes)
                    .where(eq(quizzes.moduleId, mod.id));
                return {
                    ...mod,
                    hasQuiz: (quizCount[0]?.count ?? 0) > 0,
                };
            })
        );

        return {
            course: courseMatch[0],
            modules: modulesWithQuizInfo,
            totalModules: modulesWithQuizInfo.length,
        };
    } catch (error) {
        console.error("Error getting modules by course:", error);
        return { error: 'Failed to get modules', modules: [] };
    }
}

/**
 * Get quiz data for a specific module
 */
export async function get_quiz_for_module(moduleIdOrTitle: string) {
    try {
        // Resolve the module (handles UUID, title, and URL slugs safely)
        const targetModule = await resolveModule(moduleIdOrTitle);

        if (!targetModule) {
            return { error: 'Module not found', quiz: null };
        }

        // Get quizzes for this module
        const quizResults = await db.select()
            .from(quizzes)
            .where(eq(quizzes.moduleId, targetModule.id));

        if (quizResults.length === 0) {
            return {
                module: targetModule,
                quiz: null,
                message: 'No quiz available for this module yet.',
            };
        }

        return {
            module: targetModule,
            quiz: quizResults,
            quizCount: quizResults.length,
        };
    } catch (error) {
        console.error("Error getting quiz:", error);
        return { error: 'Failed to get quiz', quiz: null };
    }
}

/**
 * Get the next module in sequence based on orderIndex
 */
export async function get_next_module(currentModuleId: string) {
    try {
        // Get current module
        const currentModule = await db.select()
            .from(modules)
            .where(eq(modules.id, currentModuleId))
            .limit(1);

        if (currentModule.length === 0) {
            return { error: 'Current module not found', nextModule: null };
        }

        const current = currentModule[0];

        // Find next module in same course with higher orderIndex
        const nextModule = await db.select()
            .from(modules)
            .where(and(
                eq(modules.courseId, current.courseId),
                gt(modules.orderIndex, current.orderIndex)
            ))
            .orderBy(asc(modules.orderIndex))
            .limit(1);

        if (nextModule.length === 0) {
            return {
                currentModule: current,
                nextModule: null,
                message: "You've reached the last module in this course! 🎉",
            };
        }

        return {
            currentModule: current,
            nextModule: nextModule[0],
        };
    } catch (error) {
        console.error("Error getting next module:", error);
        return { error: 'Failed to get next module', nextModule: null };
    }
}

/**
 * Search resources with graceful fallback
 */
export async function search_resources(query: string) {
    try {
        // Check if resources table has data
        const hasResources = await checkTableHasData('resources');

        if (!hasResources) {
            // Find a related module to suggest
            const relatedModule = await db.select({
                id: modules.id,
                title: modules.title,
                courseId: modules.courseId,
            })
                .from(modules)
                .where(ilike(modules.title, `%${query}%`))
                .limit(1);

            return {
                available: false,
                message: "Resource files are coming soon! For now, supplemental materials are built into module content.",
                suggestedModule: relatedModule.length > 0 ? relatedModule[0] : null,
            };
        }

        // Search resources
        const resourceResults = await db.select()
            .from(resources)
            .where(or(
                ilike(resources.title, `%${query}%`),
                ilike(resources.subject, `%${query}%`),
                ilike(resources.contentSummary, `%${query}%`)
            ))
            .limit(5);

        if (resourceResults.length === 0) {
            return {
                available: true,
                resources: [],
                message: `No resources found for "${query}". Try a different search term.`,
            };
        }

        return {
            available: true,
            resources: resourceResults,
            count: resourceResults.length,
        };
    } catch (error) {
        console.error("Error searching resources:", error);
        return { available: false, error: 'Search failed', resources: [] };
    }
}

/**
 * Get course details by ID or title
 */
export async function get_course(courseIdOrTitle: string) {
    try {
        const courseMatch = await db.select()
            .from(courses)
            .where(or(
                eq(courses.id, courseIdOrTitle),
                ilike(courses.title, `%${courseIdOrTitle}%`)
            ))
            .limit(1);

        if (courseMatch.length === 0) {
            return { error: 'Course not found', course: null };
        }

        return { course: courseMatch[0] };
    } catch (error) {
        console.error("Error getting course:", error);
        return { error: 'Failed to get course', course: null };
    }
}

/**
 * Get user's progress for a specific course
 * Uses the existing progress calculation utilities
 */
export async function get_course_progress(courseId: string, userId: string) {
    try {
        // Resolve course by ID or title
        const courseMatch = await db.select()
            .from(courses)
            .where(or(
                eq(courses.id, courseId),
                ilike(courses.title, `%${courseId}%`)
            ))
            .limit(1);

        if (courseMatch.length === 0) {
            return { error: 'Course not found' };
        }

        const resolvedCourseId = courseMatch[0].id;
        const progress = await calculateCourseProgress(resolvedCourseId, userId);

        return {
            ...progress,
            courseTitle: courseMatch[0].title,
            message: progress.percentage === 100
                ? `🎉 You've completed ${courseMatch[0].title}!`
                : `You're ${progress.percentage}% through ${courseMatch[0].title} (${progress.completedModules}/${progress.totalModules} modules).`,
        };
    } catch (error) {
        console.error('Error getting course progress:', error);
        return { error: 'Failed to get progress' };
    }
}

/**
 * Get progress across all courses the user has started
 */
export async function get_all_progress(userId: string) {
    try {
        const inProgress = await getInProgressCourses(userId);
        const overall = await getOverallProgress(userId);

        if (inProgress.length === 0) {
            return {
                message: "You haven't started any courses yet! Browse the courses page to get started.",
                courses: [],
                overall,
            };
        }

        return {
            courses: inProgress,
            overall,
            message: `You're working on ${inProgress.length} course${inProgress.length > 1 ? 's' : ''}. Overall: ${overall.completedModules}/${overall.totalModules} modules completed (${overall.percentage}%).`,
        };
    } catch (error) {
        console.error('Error getting all progress:', error);
        return { error: 'Failed to get progress' };
    }
}

// ============================================================================
// COMPOSITE MULTI-STEP TOOLS
// ============================================================================

/**
 * Find a quiz for a specific topic/course and return a navigation URL.
 * Chains: find course → find next incomplete module → find quiz → return nav action.
 * Handles ambiguous queries by returning multiple matches for clarification.
 */
export async function find_and_navigate_to_quiz(query: string, userId: string) {
    console.log('\n=== FIND_AND_NAVIGATE_TO_QUIZ ===');
    console.log('Query:', query, 'User:', userId);

    try {
        // Step 1: Find matching courses
        const courseResults = await db.select()
            .from(courses)
            .where(or(
                eq(courses.id, query.toLowerCase().replace(/\s+/g, '-')),
                ilike(courses.title, `%${query}%`),
                ilike(courses.description, `%${query}%`)
            ))
            .limit(5);

        if (courseResults.length === 0) {
            // Try finding a module directly by name
            const moduleResults = await db.select()
                .from(modules)
                .where(ilike(modules.title, `%${query}%`))
                .limit(3);

            if (moduleResults.length === 0) {
                return { error: `Could not find any course or module matching "${query}".` };
            }

            // Found modules directly — get quiz for the first match
            const targetModule = moduleResults[0];
            const quizResult = await db.select()
                .from(quizzes)
                .where(eq(quizzes.moduleId, targetModule.id))
                .limit(1);

            if (quizResult.length === 0) {
                return {
                    error: `The module "${targetModule.title}" doesn't have a quiz yet.`,
                    suggestion: 'Would you like to go to the module instead?',
                    navigate_url: `/courses/${targetModule.courseId}/${targetModule.id}`,
                    moduleTitle: targetModule.title,
                };
            }

            return {
                action: 'launch_quiz',
                path: `/courses/${targetModule.courseId}/${targetModule.id}`,
                scrollToQuiz: true,
                courseTitle: targetModule.courseId,
                moduleTitle: targetModule.title,
                message: `Taking you to the ${targetModule.title} quiz!`,
            };
        }

        // If multiple courses match, ask for clarification
        if (courseResults.length > 1) {
            return {
                ambiguous: true,
                message: `I found ${courseResults.length} courses matching "${query}". Which one?`,
                courses: courseResults.map(c => ({ id: c.id, title: c.title })),
            };
        }

        const course = courseResults[0];

        // Step 2: Find the user's next incomplete module (or first module)
        const allModulesInCourse = await db.select()
            .from(modules)
            .where(eq(modules.courseId, course.id))
            .orderBy(asc(modules.orderIndex));

        if (allModulesInCourse.length === 0) {
            return { error: `The course "${course.title}" doesn't have any modules yet.` };
        }

        // Check user progress to find the right module
        let targetModule = allModulesInCourse[0]; // default to first

        if (userId !== 'unknown') {
            const completedModules = await db.select()
                .from(userProgress)
                .where(and(
                    eq(userProgress.userId, userId),
                    eq(userProgress.courseId, course.id),
                    eq(userProgress.completed, true)
                ));

            const completedIds = new Set(completedModules.map(p => p.moduleId));
            const nextIncomplete = allModulesInCourse.find(m => !completedIds.has(m.id));

            if (nextIncomplete) {
                targetModule = nextIncomplete;
            } else {
                // All completed — use the last module
                targetModule = allModulesInCourse[allModulesInCourse.length - 1];
            }
        }

        // Step 3: Check if this module has a quiz
        const quizResult = await db.select()
            .from(quizzes)
            .where(eq(quizzes.moduleId, targetModule.id))
            .limit(1);

        if (quizResult.length === 0) {
            // Try to find ANY module with a quiz in this course
            const modulesWithQuizzes = await Promise.all(
                allModulesInCourse.map(async (mod) => {
                    const qCount = await db.select({ count: count() })
                        .from(quizzes)
                        .where(eq(quizzes.moduleId, mod.id));
                    return { module: mod, hasQuiz: (qCount[0]?.count ?? 0) > 0 };
                })
            );

            const moduleWithQuiz = modulesWithQuizzes.find(m => m.hasQuiz);
            if (moduleWithQuiz) {
                return {
                    action: 'launch_quiz',
                    path: `/courses/${course.id}/${moduleWithQuiz.module.id}`,
                    scrollToQuiz: true,
                    courseTitle: course.title,
                    moduleTitle: moduleWithQuiz.module.title,
                    message: `"${targetModule.title}" doesn't have a quiz, but "${moduleWithQuiz.module.title}" does! Taking you there.`,
                };
            }

            return {
                error: `No quizzes are available in ${course.title} yet.`,
                suggestion: 'Would you like to continue studying instead?',
                navigate_url: `/courses/${course.id}/${targetModule.id}`,
            };
        }

        console.log('=== END FIND_AND_NAVIGATE_TO_QUIZ (success) ===\n');

        return {
            action: 'launch_quiz',
            path: `/courses/${course.id}/${targetModule.id}`,
            scrollToQuiz: true,
            courseTitle: course.title,
            moduleTitle: targetModule.title,
            message: `Taking you to the ${targetModule.title} quiz in ${course.title}!`,
        };
    } catch (error) {
        console.error('Error in find_and_navigate_to_quiz:', error);
        return { error: 'Failed to find quiz. Try asking for a specific module.' };
    }
}

/**
 * Find the next incomplete module for a user in a specific course.
 * Returns the module the user should work on next based on their progress.
 */
export async function get_next_incomplete_module(courseIdOrTitle: string, userId: string) {
    console.log('\n=== GET_NEXT_INCOMPLETE_MODULE ===');
    console.log('Course:', courseIdOrTitle, 'User:', userId);

    try {
        // Resolve course
        const courseMatch = await db.select()
            .from(courses)
            .where(or(
                eq(courses.id, courseIdOrTitle),
                ilike(courses.title, `%${courseIdOrTitle}%`)
            ))
            .limit(1);

        if (courseMatch.length === 0) {
            return { error: `Course "${courseIdOrTitle}" not found.` };
        }

        const course = courseMatch[0];

        // Get all modules ordered
        const allModules = await db.select()
            .from(modules)
            .where(eq(modules.courseId, course.id))
            .orderBy(asc(modules.orderIndex));

        if (allModules.length === 0) {
            return { error: `Course "${course.title}" has no modules.` };
        }

        // Get completed modules
        const completedModules = await db.select()
            .from(userProgress)
            .where(and(
                eq(userProgress.userId, userId),
                eq(userProgress.courseId, course.id),
                eq(userProgress.completed, true)
            ));

        const completedIds = new Set(completedModules.map(p => p.moduleId));
        const nextModule = allModules.find(m => !completedIds.has(m.id));

        if (!nextModule) {
            return {
                completed: true,
                courseTitle: course.title,
                message: `🎉 You've completed all ${allModules.length} modules in ${course.title}!`,
                totalModules: allModules.length,
                completedModules: completedIds.size,
            };
        }

        const position = allModules.indexOf(nextModule) + 1;

        return {
            nextModule: {
                id: nextModule.id,
                title: nextModule.title,
                courseId: course.id,
                orderIndex: nextModule.orderIndex,
            },
            courseTitle: course.title,
            position,
            totalModules: allModules.length,
            completedModules: completedIds.size,
            navigate_url: `/courses/${course.id}/${nextModule.id}`,
            message: `Next up in ${course.title}: "${nextModule.title}" (module ${position} of ${allModules.length}).`,
        };
    } catch (error) {
        console.error('Error in get_next_incomplete_module:', error);
        return { error: 'Failed to find next module.' };
    }
}

/**
 * Get comprehensive study recommendations based on user's progress, scores, and activity.
 * Analyzes: weak quiz areas, incomplete modules, completion rate, and streaks.
 * Returns a prioritized recommendation with a clear suggestion type.
 */
export async function get_study_recommendations(userId: string) {
    console.log('\n=== GET_STUDY_RECOMMENDATIONS ===');
    console.log('User:', userId);

    try {
        // ----------------------------------------------------------------
        // 1. Check for weak modules (quiz score < 70%)
        // ----------------------------------------------------------------
        const weakEntries = await db.select({
            progressId: userProgress.id,
            moduleId: userProgress.moduleId,
            courseId: userProgress.courseId,
            quizScore: userProgress.quizScore,
            completed: userProgress.completed,
        })
            .from(userProgress)
            .where(and(
                eq(userProgress.userId, userId),
                isNotNull(userProgress.quizScore),
                lt(userProgress.quizScore, 70)
            ))
            .orderBy(asc(userProgress.quizScore))
            .limit(5);

        // Enrich weak modules with names
        const weakModules = await Promise.all(
            weakEntries.map(async (entry) => {
                const mod = await db.select()
                    .from(modules)
                    .where(eq(modules.id, entry.moduleId))
                    .limit(1);
                const course = await db.select()
                    .from(courses)
                    .where(eq(courses.id, entry.courseId))
                    .limit(1);
                return {
                    moduleTitle: mod[0]?.title || 'Unknown module',
                    courseTitle: course[0]?.title || 'Unknown course',
                    courseId: entry.courseId,
                    moduleId: entry.moduleId,
                    score: entry.quizScore,
                    navigate_url: `/courses/${entry.courseId}/${entry.moduleId}`,
                };
            })
        );

        // ----------------------------------------------------------------
        // 2. Check for incomplete (in-progress) modules
        // ----------------------------------------------------------------
        const incompleteEntries = await db.select({
            moduleId: userProgress.moduleId,
            courseId: userProgress.courseId,
        })
            .from(userProgress)
            .where(and(
                eq(userProgress.userId, userId),
                eq(userProgress.completed, false)
            ))
            .limit(5);

        const incompleteModules = await Promise.all(
            incompleteEntries.map(async (entry) => {
                const mod = await db.select()
                    .from(modules)
                    .where(eq(modules.id, entry.moduleId))
                    .limit(1);
                const course = await db.select()
                    .from(courses)
                    .where(eq(courses.id, entry.courseId))
                    .limit(1);
                return {
                    moduleTitle: mod[0]?.title || 'Unknown module',
                    courseTitle: course[0]?.title || 'Unknown course',
                    courseId: entry.courseId,
                    moduleId: entry.moduleId,
                    navigate_url: `/courses/${entry.courseId}/${entry.moduleId}`,
                };
            })
        );

        // ----------------------------------------------------------------
        // 3. Overall completion rate
        // ----------------------------------------------------------------
        const totalModulesResult = await db.select({ count: count() }).from(modules);
        const completedModulesResult = await db.select({ count: count() })
            .from(userProgress)
            .where(and(
                eq(userProgress.userId, userId),
                eq(userProgress.completed, true)
            ));

        const totalModules = totalModulesResult[0]?.count ?? 0;
        const completedModules = completedModulesResult[0]?.count ?? 0;
        const completionRate = totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0;

        // ----------------------------------------------------------------
        // 4. Streak info
        // ----------------------------------------------------------------
        let currentStreak = 0;
        try {
            const streakRows = await db.select()
                .from(userStreaks)
                .where(eq(userStreaks.userId, userId))
                .limit(1);
            currentStreak = streakRows[0]?.currentStreak ?? 0;
        } catch {
            // userStreaks table might not exist yet — ignore
        }

        // ----------------------------------------------------------------
        // 5. Check if user has any progress at all
        // ----------------------------------------------------------------
        const anyProgress = await db.select({ count: count() })
            .from(userProgress)
            .where(eq(userProgress.userId, userId));

        if ((anyProgress[0]?.count ?? 0) === 0) {
            return {
                suggestion: 'get_started' as const,
                weakModules: [],
                incompleteModules: [],
                completionRate: 0,
                totalModules,
                completedModules: 0,
                currentStreak,
                message: "You haven't started any modules yet! Browse the courses page to begin your learning journey.",
            };
        }

        // ----------------------------------------------------------------
        // 6. Determine suggestion type
        // ----------------------------------------------------------------
        let suggestion: 'review_weak_areas' | 'continue_learning' | 'explore_advanced' | 'keep_going';
        let message: string;

        if (weakModules.length > 0) {
            suggestion = 'review_weak_areas';
            const weakList = weakModules
                .map(m => `• ${m.moduleTitle} (${m.score}%) — ${m.courseTitle}`)
                .join('\n');
            message = `I found ${weakModules.length} module${weakModules.length > 1 ? 's' : ''} with quiz scores below 70%:\n${weakList}\nWould you like to start reviewing the weakest one?`;
        } else if (incompleteModules.length > 0) {
            suggestion = 'continue_learning';
            const incList = incompleteModules.slice(0, 3)
                .map(m => `• ${m.moduleTitle} — ${m.courseTitle}`)
                .join('\n');
            message = `All your quiz scores are strong! 🌟 You have ${incompleteModules.length} module${incompleteModules.length > 1 ? 's' : ''} in progress:\n${incList}\nReady to continue where you left off?`;
        } else if (completionRate >= 90) {
            suggestion = 'explore_advanced';
            message = `Impressive! 🏆 You've completed ${completionRate}% of all available modules with solid scores. You're ready for advanced topics or a new course!`;
        } else {
            suggestion = 'keep_going';
            message = `Great work — all your quiz scores are above 70%! 🌟 You've completed ${completedModules} of ${totalModules} modules (${completionRate}%). Keep building momentum!`;
        }

        // Add streak info to message
        if (currentStreak > 0) {
            message += `\n🔥 You're on a ${currentStreak}-day streak!`;
        }

        console.log('Suggestion:', suggestion, 'Weak:', weakModules.length, 'Incomplete:', incompleteModules.length, 'Completion:', completionRate);

        return {
            suggestion,
            weakModules,
            incompleteModules: incompleteModules.slice(0, 3),
            completionRate,
            totalModules,
            completedModules,
            currentStreak,
            message,
        };
    } catch (error) {
        console.error('Error in get_study_recommendations:', error);
        return { error: 'Failed to get study recommendations.', suggestion: 'keep_going', weakModules: [], incompleteModules: [] };
    }
}

/**
 * Parse current context from pathname to understand where user is
 */
export function parseUserContext(pathname: string): {
    type: 'module' | 'course' | 'dashboard' | 'other';
    courseId?: string;
    moduleId?: string;
} {
    // Match /courses/[courseId]/[moduleId]
    const moduleMatch = pathname.match(/^\/courses\/([^\/]+)\/([^\/]+)/);
    if (moduleMatch) {
        return {
            type: 'module',
            courseId: moduleMatch[1],
            moduleId: moduleMatch[2],
        };
    }

    // Match /courses/[courseId]
    const courseMatch = pathname.match(/^\/courses\/([^\/]+)$/);
    if (courseMatch) {
        return {
            type: 'course',
            courseId: courseMatch[1],
        };
    }

    // Dashboard
    if (pathname === '/dashboard' || pathname === '/') {
        return { type: 'dashboard' };
    }

    return { type: 'other' };
}

// ============================================================================
// ACTION TOOLS (Return payloads for frontend)
// ============================================================================

/**
 * Navigate user to a specific path
 */
export async function Maps_to(path: string) {
    return {
        action: 'navigate',
        path,
    };
}

/**
 * Navigate to module with quiz and trigger quiz mode
 */
export async function launch_quiz(moduleId: string, courseId: string) {
    return {
        action: 'launch_quiz',
        path: `/courses/${courseId}/${moduleId}`,
        scrollToQuiz: true,
    };
}

/**
 * Display a formatted list of items in chat
 */
export async function display_list(items: { title: string; path?: string; description?: string }[], listTitle: string) {
    return {
        action: 'display_list',
        listTitle,
        items,
    };
}

/**
 * Draft a support ticket for user to confirm
 */
export async function create_ticket(subject: string, body: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    return {
        action: 'draft_ticket',
        ticket: {
            subject,
            body,
            priority,
        },
    };
}

/**
 * Return a friendly "feature not ready" message
 */
export async function feature_unavailable(featureName: string, alternativeSuggestion?: string) {
    return {
        action: 'feature_unavailable',
        feature: featureName,
        message: `${featureName} is coming soon!`,
        suggestion: alternativeSuggestion,
    };
}

// ============================================================================
// TUTORING TOOLS
// ============================================================================

/**
 * Get quiz questions for tutoring — returns questions WITHOUT correct answers.
 * This lets Eddi see the questions to guide the student without revealing solutions.
 *
 * @param moduleIdOrTitle - Module UUID or URL slug or title
 * @param questionNumber  - Optional 1-based index of a specific question
 */
export async function get_quiz_questions_for_tutoring(
    moduleIdOrTitle: string,
    questionNumber?: number,
) {
    console.log('\n=== GET_QUIZ_QUESTIONS_FOR_TUTORING ===');
    console.log('Module:', moduleIdOrTitle, 'Question#:', questionNumber);

    try {
        // Resolve module — accept UUID, slug, or title
        const targetModule = await resolveModule(moduleIdOrTitle);

        if (!targetModule) {
            console.log('Module not found for:', moduleIdOrTitle);
            return {
                error: `Module "${moduleIdOrTitle}" not found.`,
                debug: { input: moduleIdOrTitle, decodedSlug: moduleIdOrTitle.replace(/-/g, ' ') },
            };
        }

        console.log('Resolved module:', targetModule.id, targetModule.title);

        // Fetch quiz rows for this module (each row = one question)
        const quizRows = await db.select({
            id: quizzes.id,
            question: quizzes.question,
            options: quizzes.options,
            // NOTE: correctAnswer is deliberately EXCLUDED
        })
            .from(quizzes)
            .where(eq(quizzes.moduleId, targetModule.id));

        if (quizRows.length === 0) {
            return {
                moduleTitle: targetModule.title,
                error: 'No quiz questions found for this module.',
            };
        }

        // If a specific question was requested
        if (questionNumber !== undefined) {
            const idx = questionNumber - 1;
            if (idx < 0 || idx >= quizRows.length) {
                return {
                    moduleTitle: targetModule.title,
                    totalQuestions: quizRows.length,
                    error: `Question ${questionNumber} doesn't exist. This quiz has ${quizRows.length} question${quizRows.length > 1 ? 's' : ''}.`,
                };
            }

            const q = quizRows[idx];
            return {
                moduleTitle: targetModule.title,
                totalQuestions: quizRows.length,
                questionNumber,
                questionText: q.question,
                options: q.options, // answer choices (JSONB array of strings)
                // correctAnswer is NOT included — Eddi must guide, not reveal
            };
        }

        // Return all questions (without answers) for overview
        return {
            moduleTitle: targetModule.title,
            totalQuestions: quizRows.length,
            questions: quizRows.map((q, i) => ({
                questionNumber: i + 1,
                questionText: q.question,
                options: q.options,
            })),
        };
    } catch (error) {
        console.error('Error in get_quiz_questions_for_tutoring:', error);
        return { error: 'Failed to fetch quiz questions.' };
    }
}

/**
 * Get module content (markdown) relevant to a specific topic.
 * Useful for Eddi to reference source material when tutoring a student.
 *
 * If a topic is provided, returns only the section(s) of markdown that
 * mention that topic. Otherwise returns the first ~2000 chars as a summary.
 */
export async function get_module_content_for_topic(
    moduleIdOrTitle: string,
    topic?: string,
) {
    console.log('\n=== GET_MODULE_CONTENT_FOR_TOPIC ===');
    console.log('Module:', moduleIdOrTitle, 'Topic:', topic);

    try {
        const targetModule = await resolveModule(moduleIdOrTitle);

        if (!targetModule) {
            return {
                error: `Module "${moduleIdOrTitle}" not found.`,
                debug: { input: moduleIdOrTitle, decodedSlug: moduleIdOrTitle.replace(/-/g, ' ') },
            };
        }
        const markdown = targetModule.contentMarkdown || '';

        if (!markdown) {
            return {
                moduleTitle: targetModule.title,
                content: null,
                message: 'This module has no written content yet.',
            };
        }

        // If a topic is specified, extract relevant sections
        if (topic) {
            const topicLower = topic.toLowerCase();
            const lines = markdown.split('\n');
            const relevantSections: string[] = [];
            let currentSection = '';
            let isRelevant = false;

            for (const line of lines) {
                // Detect section headers (## or ###)
                if (/^#{1,3}\s/.test(line)) {
                    // Save previous section if it was relevant
                    if (isRelevant && currentSection.trim()) {
                        relevantSections.push(currentSection.trim());
                    }
                    currentSection = line + '\n';
                    isRelevant = line.toLowerCase().includes(topicLower);
                } else {
                    currentSection += line + '\n';
                    if (line.toLowerCase().includes(topicLower)) {
                        isRelevant = true;
                    }
                }
            }
            // Capture last section
            if (isRelevant && currentSection.trim()) {
                relevantSections.push(currentSection.trim());
            }

            if (relevantSections.length > 0) {
                // Cap total output to ~3000 chars
                let combined = relevantSections.join('\n\n---\n\n');
                if (combined.length > 3000) {
                    combined = combined.substring(0, 3000) + '\n\n[...content truncated]';
                }
                return {
                    moduleTitle: targetModule.title,
                    topic,
                    sectionsFound: relevantSections.length,
                    content: combined,
                };
            }

            // Topic not found in sections — return a general summary instead
            return {
                moduleTitle: targetModule.title,
                topic,
                sectionsFound: 0,
                content: markdown.substring(0, 2000) + (markdown.length > 2000 ? '\n\n[...content truncated]' : ''),
                message: `No section specifically about "${topic}" was found. Here's the module overview instead.`,
            };
        }

        // No topic — return general overview
        return {
            moduleTitle: targetModule.title,
            content: markdown.substring(0, 2000) + (markdown.length > 2000 ? '\n\n[...content truncated]' : ''),
        };
    } catch (error) {
        console.error('Error in get_module_content_for_topic:', error);
        return { error: 'Failed to fetch module content.' };
    }
}
