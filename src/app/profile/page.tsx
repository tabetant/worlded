import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { modules, courses, userProgress } from '@/app/db/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentStreak } from '@/lib/progress/streak-tracker';
import { ProfileView, type ProfileData } from '@/components/profile/ProfileView';

export const dynamic = 'force-dynamic';

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth');

    // ── Data fetching ────────────────────────────────────────────────────────
    const [allProgress, recentRows, streak] = await Promise.all([
        // All progress records for stats
        db.select().from(userProgress).where(eq(userProgress.userId, user.id)),

        // Last 10 activity items: progress + module + course
        db
            .select({
                moduleTitle: modules.title,
                courseTitle: courses.title,
                courseId: courses.id,
                completed: userProgress.completed,
                completedAt: userProgress.completedAt,
                quizScore: userProgress.quizScore,
            })
            .from(userProgress)
            .innerJoin(modules, eq(modules.id, userProgress.moduleId))
            .innerJoin(courses, eq(courses.id, userProgress.courseId))
            .where(eq(userProgress.userId, user.id))
            .orderBy(desc(userProgress.completedAt))
            .limit(10),

        getCurrentStreak(user.id),
    ]);

    // ── Compute stats ────────────────────────────────────────────────────────
    const completedRows = allProgress.filter(p => p.completed);
    const quizRows = allProgress.filter(p => p.quizScore !== null);
    const modulesCompleted = completedRows.length;
    const coursesEnrolled = new Set(allProgress.map(p => p.courseId)).size;
    const quizzesTaken = quizRows.length;
    const avgScore =
        quizzesTaken > 0
            ? Math.round(quizRows.reduce((s, p) => s + (p.quizScore ?? 0), 0) / quizzesTaken)
            : 0;
    // Estimate 15 min of study time per completed module
    const studyTimeMinutes = modulesCompleted * 15;

    // Total modules in the system (for completion rate)
    const allModules = await db.select({ id: modules.id }).from(modules);
    const totalModules = allModules.length;

    // ── User metadata ────────────────────────────────────────────────────────
    const rawName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        '';
    const displayName = rawName || user.email?.split('@')[0] || 'User';
    const avatarUrl =
        (user.user_metadata?.avatar_url as string | undefined) ||
        (user.user_metadata?.picture as string | undefined) ||
        null;
    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
          })
        : 'Unknown';

    // ── Build typed payload ──────────────────────────────────────────────────
    const profileData: ProfileData = {
        user: {
            name: displayName,
            email: user.email ?? '',
            avatarUrl,
            initials: getInitials(displayName),
            memberSince,
        },
        stats: {
            studyTimeMinutes,
            coursesEnrolled,
            modulesCompleted,
            totalModules,
            quizzesTaken,
            avgScore,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
        },
        recentActivity: recentRows.map(r => ({
            moduleTitle: r.moduleTitle,
            courseTitle: r.courseTitle,
            courseId: r.courseId,
            completed: r.completed ?? false,
            completedAt: r.completedAt?.toISOString() ?? null,
            quizScore: r.quizScore,
        })),
    };

    return <ProfileView data={profileData} />;
}
