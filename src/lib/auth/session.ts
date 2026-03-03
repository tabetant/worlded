/**
 * Server-side session helpers for Supabase Auth.
 *
 * Use these in Server Components, Server Actions, and Route Handlers
 * to check authentication and get user data.
 *
 * Usage:
 *   const user = await getCurrentUser()        // get user or null
 *   const user = await requireAuth()           // get user or redirect to /auth
 *   const session = await getSession()         // get full session or null
 */

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'

// =============================================================================
// Get current user (returns null if unauthenticated)
// =============================================================================

/**
 * Get the current authenticated user, or `null` if not authenticated.
 *
 * Uses `getUser()` which validates the JWT server-side — safe from tampering.
 *
 * ```tsx
 * // Server Component
 * const user = await getCurrentUser()
 * if (!user) return <p>Not logged in</p>
 * return <p>Hello, {user.email}</p>
 * ```
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null
    return user
}

// =============================================================================
// Get full session (returns null if unauthenticated)
// =============================================================================

/**
 * Get the current session including access token and expiry info.
 * Returns `null` if not authenticated.
 *
 * **Note:** Prefer `getCurrentUser()` for auth checks. Use this only when you
 * need session metadata (e.g., token expiry time).
 *
 * ```tsx
 * const session = await getSession()
 * if (session) {
 *     console.log('Expires:', new Date(session.expires_at! * 1000))
 * }
 * ```
 */
export async function getSession(): Promise<Session | null> {
    const supabase = await createClient()

    // We first validate with getUser() to ensure the session is legitimate
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    // Now safely get the session (we've verified the user exists)
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

// =============================================================================
// Require authentication (redirects if unauthenticated)
// =============================================================================

/**
 * Require authentication. Redirects to `/auth` if the user is not logged in.
 * Returns the authenticated user on success.
 *
 * Use in Server Components and Server Actions where authentication is mandatory.
 *
 * ```tsx
 * // Server Component
 * export default async function DashboardPage() {
 *     const user = await requireAuth()
 *     // If we reach here, user is definitely authenticated
 *     return <div>Welcome, {user.email}</div>
 * }
 * ```
 *
 * ```tsx
 * // Server Action
 * 'use server'
 * export async function deleteModule(moduleId: string) {
 *     const user = await requireAuth()
 *     // ... delete logic
 * }
 * ```
 */
export async function requireAuth(redirectTo: string = '/auth'): Promise<User> {
    const user = await getCurrentUser()

    if (!user) {
        redirect(redirectTo)
    }

    return user
}

// =============================================================================
// Require authentication for server actions (throws instead of redirect)
// =============================================================================

/**
 * Like `requireAuth()`, but throws an Error instead of redirecting.
 * Use this in Server Actions where you need to return an error response
 * instead of a redirect.
 *
 * ```tsx
 * 'use server'
 * export async function updateProfile(data: FormData) {
 *     const user = await requireAuthOrThrow()
 *     // ... update logic
 * }
 * ```
 *
 * @throws {Error} 'Unauthorized' if user is not authenticated
 */
export async function requireAuthOrThrow(): Promise<User> {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    return user
}
