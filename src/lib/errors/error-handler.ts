/**
 * Error Handling Utilities
 *
 * Sanitize errors for client responses — NEVER expose raw errors, stack traces,
 * database queries, file paths, or internal IDs to users.
 *
 * Usage:
 *   API Routes     → errorResponse(error)      (returns NextResponse)
 *   Server Actions → safeActionError(error, 'actionName')  (throws sanitized Error)
 *   Anywhere       → sanitizeError(error)       (returns safe string)
 */

import { NextResponse } from 'next/server'

// =============================================================================
// Config
// =============================================================================

const isProduction = process.env.NODE_ENV === 'production'

const GENERIC_MESSAGE = 'An error occurred. Please try again later.'

/**
 * Patterns that should NEVER appear in client-facing error messages,
 * even in development mode. If a message matches, it is replaced with
 * the generic message.
 */
const SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /connection.*string/i,
    /postgres(ql)?:\/\//i,       // DB connection urls
    /supabase/i,
    /at\s+\S+\s+\(/,            // stack trace lines
    /\/Users\//i,                // macOS file paths
    /\/home\//i,                 // Linux file paths
    /node_modules/i,
    /SELECT\s+/i,                // SQL fragments
    /INSERT\s+INTO/i,
    /UPDATE\s+.*SET/i,
    /DELETE\s+FROM/i,
]

// =============================================================================
// Core: sanitizeError
// =============================================================================

/**
 * Extract a safe, user-facing message from an unknown error.
 *
 * - Production: always returns generic message
 * - Development: returns the error `.message`, scrubbed of sensitive patterns
 *
 * **Always logs the full error server-side.**
 */
export function sanitizeError(error: unknown, context?: string): string {
    // Structured server-side log — ALWAYS runs
    console.error('[server error]', {
        context: context || 'unknown',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: typeof error === 'object' ? error : undefined,
    })

    // Production — never reveal details
    if (isProduction) return GENERIC_MESSAGE

    // Development — show message but scrub sensitive content
    if (error instanceof Error) {
        const msg = error.message
        const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test(msg))
        if (hasSensitive) {
            return `Error: [message redacted — contains sensitive content] (see server logs)`
        }
        return `Error: ${msg}`
    }

    if (typeof error === 'string') {
        const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test(error))
        if (hasSensitive) {
            return `Error: [message redacted — contains sensitive content] (see server logs)`
        }
        return `Error: ${error}`
    }

    return 'An unexpected error occurred.'
}

// =============================================================================
// API Routes: errorResponse
// =============================================================================

/**
 * Standardized JSON error response for API routes.
 *
 * ```ts
 * catch (error) {
 *     return errorResponse(error)
 * }
 * ```
 */
export function errorResponse(error: unknown, status: number = 500, context?: string) {
    return NextResponse.json(
        { error: sanitizeError(error, context) },
        { status }
    )
}

// =============================================================================
// Server Actions: safeActionError
// =============================================================================

/**
 * For server actions: logs the full error, then **throws** a new Error
 * with a sanitized message. Use this in catch blocks inside `'use server'`
 * functions.
 *
 * ```ts
 * catch (error) {
 *     safeActionError(error, 'toggleModuleCompletion')
 * }
 * ```
 *
 * @throws {Error} Always — with a sanitized message
 */
export function safeActionError(error: unknown, actionName: string): never {
    throw new Error(sanitizeError(error, `action:${actionName}`))
}
