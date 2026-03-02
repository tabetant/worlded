'use server'

import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { userProgress } from '@/app/db/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { updateStreakOnQuizCompletion } from '@/lib/progress/streak-tracker'
import { safeActionError } from '@/lib/errors/error-handler'

export async function saveQuizScore(
    moduleId: string,
    courseId: string,
    score: number,
    totalQuestions: number
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    try {
        const userId = user.id
        const percentageScore = Math.round((score / totalQuestions) * 100)

        // Update or create progress with quiz score
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
            await db.update(userProgress)
                .set({
                    quizScore: percentageScore,
                    completed: true,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(userProgress.id, existing[0].id))
        } else {
            await db.insert(userProgress).values({
                userId,
                moduleId,
                courseId,
                quizScore: percentageScore,
                completed: true,
                completedAt: new Date(),
                startedAt: new Date(),
            })
        }

        // Update streak on quiz completion
        const streakData = await updateStreakOnQuizCompletion(userId)

        return { success: true, score: percentageScore, streak: streakData }
    } catch (error) {
        safeActionError(error, 'saveQuizScore')
    }
}

