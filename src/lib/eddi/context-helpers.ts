// ============================================================================
// EDDI CONTEXT HELPERS
// Utilities for extracting page context from URL pathnames
// ============================================================================

export type PageType = 'dashboard' | 'course' | 'module' | 'quiz' | 'profile' | 'support' | 'other';

export interface EddiContext {
    pathname: string;
    pageType: PageType;
    courseId: string | null;
    moduleId: string | null;
    quizId: string | null;
}

/**
 * Extract course ID from pathname
 * e.g., /courses/calculus → 'calculus'
 * e.g., /courses/calculus/some-module → 'calculus'
 */
export function getCourseIdFromPath(pathname: string): string | null {
    const match = pathname.match(/\/courses\/([^\/]+)/);
    return match ? match[1] : null;
}

/**
 * Extract module ID from pathname
 * e.g., /courses/calculus/limits-and-continuity → 'limits-and-continuity'
 */
export function getModuleIdFromPath(pathname: string): string | null {
    const match = pathname.match(/\/courses\/[^\/]+\/([^\/]+)/);
    return match ? match[1] : null;
}

/**
 * Extract quiz ID from pathname
 * e.g., /quizzes/some-quiz-id → 'some-quiz-id'
 */
export function getQuizIdFromPath(pathname: string): string | null {
    const match = pathname.match(/\/quizzes\/([^\/]+)/);
    return match ? match[1] : null;
}

/**
 * Determine page type from pathname
 */
export function getPageType(pathname: string): PageType {
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
    if (/\/courses\/[^\/]+\/[^\/]+/.test(pathname)) return 'module';
    if (pathname.startsWith('/courses/')) return 'course';
    if (pathname.startsWith('/quizzes/')) return 'quiz';
    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/support') || pathname.startsWith('/ticketsubmission')) return 'support';
    return 'other';
}

/**
 * Build a complete context object from a pathname
 */
export function buildEddiContext(pathname: string): EddiContext {
    return {
        pathname,
        pageType: getPageType(pathname),
        courseId: getCourseIdFromPath(pathname),
        moduleId: getModuleIdFromPath(pathname),
        quizId: getQuizIdFromPath(pathname),
    };
}
