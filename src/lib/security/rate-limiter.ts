/**
 * In-memory rate limiter.
 * For production at scale, replace with Redis or database-backed limiter.
 */

const store = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitConfig {
    maxAttempts: number
    windowMs: number // time window in milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number // timestamp (ms) when the window resets
}

/**
 * Check if a request should be rate-limited.
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
    const now = Date.now()
    const record = store.get(key)

    // No record or window expired — allow and start fresh
    if (!record || now > record.resetAt) {
        const resetAt = now + config.windowMs
        store.set(key, { count: 1, resetAt })
        return { allowed: true, remaining: config.maxAttempts - 1, resetAt }
    }

    // Within limit
    if (record.count < config.maxAttempts) {
        record.count++
        store.set(key, record)
        return { allowed: true, remaining: config.maxAttempts - record.count, resetAt: record.resetAt }
    }

    // Exceeded
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
}

/**
 * Clean up expired records (call periodically or on-demand).
 */
export function cleanupRateLimits() {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
        if (now > record.resetAt) store.delete(key)
    }
}

// Auto-cleanup every 10 minutes
if (typeof globalThis !== 'undefined') {
    const interval = setInterval(cleanupRateLimits, 10 * 60 * 1000)
    // Don't block Node.js exit
    if (interval.unref) interval.unref()
}
