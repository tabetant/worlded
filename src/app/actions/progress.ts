'use server'

import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { userProgress } from '@/app/db/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { safeActionError } from '@/lib/errors/error-handler'

export async function toggleModuleCompletion(moduleId: string, courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    try {
        const userId = user.id

        // Check current completion status
        const existing = await db.select()
            .from(userProgress)
            .where(
                and(
                    eq(userProgress.userId, userId),
                    eq(userProgress.moduleId, moduleId)
                )
            )
            .limit(1)

        if (existing[0]) {
            // Toggle completion
            const newCompletedStatus = !existing[0].completed

            await db.update(userProgress)
                .set({
                    completed: newCompletedStatus,
                    completedAt: newCompletedStatus ? new Date() : null,
                    updatedAt: new Date(),
                })
                .where(eq(userProgress.id, existing[0].id))
        } else {
            // Create new progress record (marked as complete)
            await db.insert(userProgress).values({
                userId,
                moduleId,
                courseId,
                completed: true,
                completedAt: new Date(),
                startedAt: new Date(),
            })
        }

        // Revalidate pages that show progress
        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath(`/courses/${courseId}`)

        return { success: true }
    } catch (error) {
        safeActionError(error, 'toggleModuleCompletion')
    }
}
