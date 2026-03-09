import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { courses, modules, userProgress } from '@/app/db/drizzle/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { getOverallProgress } from '@/lib/progress/calculate-progress';
import { getCurrentStreak } from '@/lib/progress/streak-tracker';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth');

    // Fetch everything in parallel
    const [overall, allCourses, allModules, allUserProgress, quizRows, streak] =
        await Promise.all([
            getOverallProgress(user.id),
            db.select().from(courses),
            db.select().from(modules),
            db.select().from(userProgress).where(eq(userProgress.userId, user.id)),
            db
                .select()
                .from(userProgress)
                .where(
                    and(
                        eq(userProgress.userId, user.id),
                        isNotNull(userProgress.quizScore),
                    ),
                )
                .orderBy(desc(userProgress.completedAt))
                .limit(20),
            getCurrentStreak(user.id),
        ]);

    // Build per-course progress for all courses the user has enrolled in
    const enrolledIds = [...new Set(allUserProgress.map(p => p.courseId))];
    const courseMap = Object.fromEntries(allCourses.map(c => [c.id, c]));
    const modulesPerCourse = allModules.reduce<Record<string, number>>((acc, m) => {
        acc[m.courseId] = (acc[m.courseId] ?? 0) + 1;
        return acc;
    }, {});

    const coursesWithProgress = enrolledIds.map(courseId => {
        const course = courseMap[courseId];
        const totalMods = modulesPerCourse[courseId] ?? 0;
        const completed = allUserProgress.filter(
            p => p.courseId === courseId && p.completed,
        ).length;
        return {
            id: courseId,
            title: course?.title ?? courseId,
            iconName: course?.iconName ?? 'book',
            completedModules: completed,
            totalModules: totalMods,
            percentage: totalMods > 0 ? Math.round((completed / totalMods) * 100) : 0,
        };
    });

    // Quiz scores — reversed to chronological order (oldest → newest) for the chart
    const quizScores = quizRows
        .filter(p => p.quizScore !== null)
        .map(p => ({
            score: p.quizScore as number,
            courseName: courseMap[p.courseId]?.title ?? p.courseId,
            date: p.completedAt
                ? new Date(p.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                  })
                : '—',
        }))
        .reverse();

    const avgScore =
        quizScores.length > 0
            ? Math.round(quizScores.reduce((s, q) => s + q.score, 0) / quizScores.length)
            : 0;

    // Unique completion dates (YYYY-MM-DD) for the last 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const completionDates = [
        ...new Set(
            allUserProgress
                .filter(p => p.completedAt && new Date(p.completedAt) >= twelveWeeksAgo)
                .map(p => {
                    const d = new Date(p.completedAt!);
                    const y = d.getFullYear();
                    const mo = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${y}-${mo}-${dd}`;
                }),
        ),
    ];

    return (
        <ProgressDashboard
            overallProgress={{
                totalModules: Number(overall.totalModules),
                completedModules: Number(overall.completedModules),
                percentage: overall.percentage,
            }}
            coursesWithProgress={coursesWithProgress}
            quizScores={quizScores}
            avgScore={avgScore}
            streak={streak}
            completionDates={completionDates}
        />
    );
}
