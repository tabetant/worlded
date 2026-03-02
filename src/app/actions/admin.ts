'use server'

/**
 * Admin-only server actions.
 *
 * These demonstrate how to protect sensitive operations using
 * `requireRoleInAction()` from the RBAC utilities.
 */

import { db } from '@/db'
import { users, courses } from '@/app/db/drizzle/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRoleInAction, type UserRole } from '@/lib/auth/roles'
import { safeActionError } from '@/lib/errors/error-handler'

// =============================================================================
// User management (admin only)
// =============================================================================

/**
 * Update a user's role. Only admins can do this.
 */
export async function updateUserRole(targetUserId: string, newRole: UserRole) {
    await requireRoleInAction('admin')

    try {
        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, targetUserId))

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        safeActionError(error, 'updateUserRole')
    }
}

/**
 * Delete a user from the platform. Only admins can do this.
 */
export async function deleteUser(targetUserId: string) {
    await requireRoleInAction('admin')

    try {
        await db.delete(users)
            .where(eq(users.id, targetUserId))

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        safeActionError(error, 'deleteUser')
    }
}

// =============================================================================
// Course management (mentor or admin)
// =============================================================================

/**
 * Update a course's title and description. Mentors and admins can do this.
 */
export async function updateCourse(
    courseId: string,
    data: { title?: string; description?: string }
) {
    await requireRoleInAction(['mentor', 'admin'])

    try {
        await db.update(courses)
            .set(data)
            .where(eq(courses.id, courseId))

        revalidatePath('/courses')
        revalidatePath(`/courses/${courseId}`)
        return { success: true }
    } catch (error) {
        safeActionError(error, 'updateCourse')
    }
}

