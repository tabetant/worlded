/**
 * Redirect Validation — prevents open redirect vulnerabilities
 * by validating URLs against an allowlist of paths and domains.
 */

// Allowed internal path prefixes (add new routes here as they are created)
const ALLOWED_PATH_PREFIXES = [
    '/',
    '/courses',        // includes /courses/[id]
    '/modules',        // includes /modules/[id]
    '/quizzes',        // includes /quizzes/[id]
    '/dashboard',
    '/auth',
    '/profile',
    '/settings',
    '/support',
    '/resources',
    '/progress',
    '/questions',
    '/ticketsubmission',
    '/admin',
    '/reset-password',
]

// Allowed domains for absolute URL redirects
// TODO: Before deploying to production, update with actual domain
const ALLOWED_DOMAINS = [
    'localhost',
    'worlded.com',
    'www.worlded.com',
]

/**
 * Validates if a redirect URL is safe to use.
 * - Relative paths: must start with `/` and match an allowed prefix
 * - Absolute URLs: hostname must be in the allowed domains list
 * - Blocks protocol-relative URLs (`//evil.com`), javascript:, data:, etc.
 */
export function isValidRedirectUrl(url: string): boolean {
    // Block empty / whitespace
    if (!url || !url.trim()) return false

    // Block protocol-relative URLs (//evil.com)
    if (url.startsWith('//')) return false

    // Block dangerous schemes
    const lower = url.toLowerCase().trim()
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return false
    }

    // Relative path — check against allowed prefixes
    if (url.startsWith('/')) {
        // Normalize: strip query/hash for prefix matching
        const pathname = url.split('?')[0].split('#')[0]
        return ALLOWED_PATH_PREFIXES.some(prefix =>
            pathname === prefix || pathname.startsWith(prefix + '/')
        )
    }

    // Absolute URL — check domain
    try {
        const parsed = new URL(url)
        return ALLOWED_DOMAINS.some(
            domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        )
    } catch {
        return false
    }
}

/**
 * Safely redirects — returns the URL if valid, otherwise returns the fallback.
 */
export function safeRedirect(url: string, fallback: string = '/'): string {
    if (isValidRedirectUrl(url)) return url

    console.warn('[security] Blocked unsafe redirect:', url)
    return fallback
}
