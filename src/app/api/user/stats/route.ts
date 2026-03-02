import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { courses, modules, userProgress } from '@/app/db/drizzle/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getInProgressCourses } from '@/lib/progress/calculate-progress'
import { getCurrentStreak } from '@/lib/progress/streak-tracker'
import { errorResponse } from '@/lib/errors/error-handler'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get all courses
        const allCourses = await db.select().from(courses)

        // Get all modules
        const allModules = await db.select().from(modules)

        // Get user's progress
        const progress = await db.select()
            .from(userProgress)
            .where(eq(userProgress.userId, user.id))

        const completedModules = progress.filter(p => p.completed).length
        const totalModules = allModules.length
        const completionPercentage = totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0

        // Courses user has actually started (has progress records for)
        const startedCourseIds = new Set(progress.map(p => p.courseId))
        const coursesEnrolled = startedCourseIds.size

        // Calculate per-course progress
        const courseProgress = allCourses.map(course => {
            const courseModules = allModules.filter(m => m.courseId === course.id)
            const courseCompleted = progress.filter(
                p => p.courseId === course.id && p.completed
            ).length

            return {
                ...course,
                moduleCount: courseModules.length,
                completedCount: courseCompleted,
                progress: courseModules.length > 0
                    ? Math.round((courseCompleted / courseModules.length) * 100)
                    : 0,
            }
        })

        // Get in-progress courses for "pick up where you left off"
        const inProgressCourses = await getInProgressCourses(user.id)

        // Get streak data (has its own try-catch, returns defaults on error)
        const streak = await getCurrentStreak(user.id)

        // Determine if new user (created less than 5 minutes ago)
        const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
        const isNewUser = Date.now() - createdAt < 5 * 60 * 1000

        return NextResponse.json({
            stats: {
                coursesEnrolled,
                modulesCompleted: completedModules,
                totalModules,
                completionPercentage,
            },
            courseProgress,
            inProgressCourses,
            streak,
            isNewUser,
        })
    } catch (error) {
        return errorResponse(error, 500, 'user:stats')
    }
}
