/**
 * Role-Based Access Control (RBAC) utilities
 *
 * Uses the `users` table `role` column (enum: student | mentor | admin)
 * backed by Supabase Auth.
 *
 * Usage:
 *   Server Components → requireRole() / requireAdmin() / requireMentor()
 *   Server Actions     → requireRoleInAction()  (throws instead of redirect)
 *   UI branching       → getUserRole() / isAdmin() / isMentor() / hasRole()
 */

import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { users } from '@/app/db/drizzle/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'student' | 'mentor' | 'admin'

/** Hierarchy value — higher = more privileged (useful for "at least" checks). */
const ROLE_LEVEL: Record<UserRole, number> = {
    student: 0,
    mentor: 1,
    admin: 2,
}

// =============================================================================
// Core helpers
// =============================================================================

/**
 * Get the authenticated Supabase user, or null if unauthenticated.
 */
async function getAuthUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

/**
 * Get the current user's role from the database.
 * Returns 'student' if the user is unauthenticated or has no role set.
 */
export async function getUserRole(): Promise<UserRole> {
    const user = await getAuthUser()
    if (!user) return 'student'

    const [dbUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

    return (dbUser?.role as UserRole) || 'student'
}

/**
 * Check if current user has one of the required roles.
 */
export async function hasRole(requiredRole: UserRole | UserRole[]): Promise<boolean> {
    const userRole = await getUserRole()
    return Array.isArray(requiredRole)
        ? requiredRole.includes(userRole)
        : userRole === requiredRole
}

/**
 * Check if user's role is at least as privileged as the given role.
 * e.g. `hasMinimumRole('mentor')` returns true for mentors AND admins.
 */
export async function hasMinimumRole(minimumRole: UserRole): Promise<boolean> {
    const userRole = await getUserRole()
    return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minimumRole]
}

// =============================================================================
// Guard helpers — Server Components (redirect on failure)
// =============================================================================

/**
 * Require a specific role or redirect.
 * Use at the top of **server components** and **page components**.
 */
export async function requireRole(
    requiredRole: UserRole | UserRole[],
    redirectTo: string = '/'
): Promise<void> {
    const user = await getAuthUser()
    if (!user) redirect('/auth')

    const allowed = await hasRole(requiredRole)
    if (!allowed) redirect(redirectTo)
}

/**
 * Require admin role or redirect.
 */
export async function requireAdmin(redirectTo: string = '/'): Promise<void> {
    await requireRole('admin', redirectTo)
}

/**
 * Require mentor (or admin) role or redirect.
 */
export async function requireMentor(redirectTo: string = '/'): Promise<void> {
    await requireRole(['mentor', 'admin'], redirectTo)
}

// =============================================================================
// Guard helpers — Server Actions (throw on failure)
// =============================================================================

/**
 * Require a specific role inside a Server Action.
 * Throws an error instead of redirecting (actions can't redirect).
 */
export async function requireRoleInAction(
    requiredRole: UserRole | UserRole[]
): Promise<void> {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized: not authenticated')

    const allowed = await hasRole(requiredRole)
    if (!allowed) {
        const needed = Array.isArray(requiredRole)
            ? requiredRole.join(' | ')
            : requiredRole
        throw new Error(`Forbidden: requires role ${needed}`)
    }
}

// =============================================================================
// Shorthand boolean checks
// =============================================================================

/** Is the current user an admin? */
export async function isAdmin(): Promise<boolean> {
    return hasRole('admin')
}

/** Is the current user a mentor (or admin)? */
export async function isMentor(): Promise<boolean> {
    return hasMinimumRole('mentor')
}

/** Is the current user authenticated? */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getAuthUser()
    return user !== null
}
