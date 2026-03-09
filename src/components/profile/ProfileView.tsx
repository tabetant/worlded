'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen,
    Clock,
    Flame,
    Target,
    GraduationCap,
    CheckCircle2,
    Trophy,
    CalendarDays,
    Pencil,
    TrendingUp,
    Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityItem {
    moduleTitle: string;
    courseTitle: string;
    courseId: string;
    completedAt: string | null;
    quizScore: number | null;
    completed: boolean;
}

export interface ProfileData {
    user: {
        name: string;
        email: string;
        avatarUrl: string | null;
        initials: string;
        memberSince: string;
    };
    stats: {
        studyTimeMinutes: number;
        coursesEnrolled: number;
        modulesCompleted: number;
        totalModules: number;
        quizzesTaken: number;
        avgScore: number;
        currentStreak: number;
        longestStreak: number;
    };
    recentActivity: ActivityItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatStudyTime(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// ─── Achievement definitions ──────────────────────────────────────────────────

const ACHIEVEMENTS = [
    {
        id: 'first_module',
        emoji: '📖',
        title: 'First Step',
        desc: 'Completed your first module',
        check: (s: ProfileData['stats']) => s.modulesCompleted >= 1,
        color: 'bg-emerald-50 border-emerald-200',
    },
    {
        id: 'five_modules',
        emoji: '🚀',
        title: 'On a Roll',
        desc: 'Completed 5 modules',
        check: (s: ProfileData['stats']) => s.modulesCompleted >= 5,
        color: 'bg-blue-50 border-blue-200',
    },
    {
        id: 'ten_modules',
        emoji: '⭐',
        title: 'Knowledge Seeker',
        desc: 'Completed 10 modules',
        check: (s: ProfileData['stats']) => s.modulesCompleted >= 10,
        color: 'bg-amber-50 border-amber-200',
    },
    {
        id: 'perfect_score',
        emoji: '🎯',
        title: 'Perfect Score',
        desc: 'Scored 100% on a quiz',
        check: (s: ProfileData['stats']) => s.avgScore >= 100,
        color: 'bg-rose-50 border-rose-200',
    },
    {
        id: 'five_day_streak',
        emoji: '🔥',
        title: '5-Day Streak',
        desc: 'Kept a 5-day learning streak',
        check: (s: ProfileData['stats']) => s.longestStreak >= 5,
        color: 'bg-orange-50 border-orange-200',
    },
    {
        id: 'quiz_master',
        emoji: '🏆',
        title: 'Quiz Master',
        desc: 'Completed 10 quizzes',
        check: (s: ProfileData['stats']) => s.quizzesTaken >= 10,
        color: 'bg-purple-50 border-purple-200',
    },
    {
        id: 'half_way',
        emoji: '🌟',
        title: 'Halfway There',
        desc: '50% overall completion',
        check: (s: ProfileData['stats']) =>
            s.totalModules > 0 &&
            Math.round((s.modulesCompleted / s.totalModules) * 100) >= 50,
        color: 'bg-cyan-50 border-cyan-200',
    },
    {
        id: 'dedicated',
        emoji: '💪',
        title: 'Dedicated Learner',
        desc: '10-day streak achieved',
        check: (s: ProfileData['stats']) => s.longestStreak >= 10,
        color: 'bg-indigo-50 border-indigo-200',
    },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    icon,
    iconBg,
    delay,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    iconBg: string;
    delay: number;
}) {
    return (
        <motion.div
            className="bg-white rounded-2xl p-5 border border-[var(--border-subtle)] shadow-sm flex flex-col gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay }}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{label}</p>
                {sub && <p className="text-xs text-[var(--text-muted)]/70 mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
    const hasScore = item.quizScore !== null;
    const scoreColor =
        item.quizScore !== null
            ? item.quizScore >= 80
                ? 'bg-emerald-100 text-emerald-700'
                : item.quizScore >= 60
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
            : '';

    return (
        <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * index }}
        >
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center">
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        hasScore ? 'bg-[var(--primary)]/10' : 'bg-emerald-50'
                    }`}
                >
                    {hasScore ? (
                        <Target className="w-4 h-4 text-[var(--primary)]" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                </div>
                {index < 9 && (
                    <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1 mb-1 min-h-[20px]" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <Link href={`/courses/${item.courseId}`} className="group">
                            <p className="text-sm font-medium text-foreground group-hover:text-[var(--primary)] transition-colors truncate">
                                {item.moduleTitle}
                            </p>
                        </Link>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.courseTitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {hasScore && (
                            <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}
                            >
                                {item.quizScore}%
                            </span>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                            {formatDate(item.completedAt)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfileView({ data }: { data: ProfileData }) {
    const { user, stats, recentActivity } = data;
    const completionPct =
        stats.totalModules > 0
            ? Math.round((stats.modulesCompleted / stats.totalModules) * 100)
            : 0;

    const unlockedCount = ACHIEVEMENTS.filter(a => a.check(stats)).length;

    return (
        <div className="min-h-screen bg-[var(--background-subtle)]">
            {/* ── User Card ───────────────────────────────── */}
            <div className="bg-white border-b border-[var(--border-subtle)]">
                <div className="container mx-auto px-6 py-10">
                    <motion.div
                        className="flex flex-col sm:flex-row items-center sm:items-end gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <Avatar className="w-28 h-28 text-3xl ring-4 ring-white shadow-md">
                                {user.avatarUrl && (
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                )}
                                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary,#8b5cf6)] text-white text-3xl font-bold">
                                    {user.initials}
                                </AvatarFallback>
                            </Avatar>
                            {/* Online indicator */}
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
                        </div>

                        {/* Name + meta */}
                        <div className="text-center sm:text-left flex-1">
                            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                            <p className="text-[var(--text-muted)] mt-0.5">{user.email}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Member since {user.memberSince}
                                </span>
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Star className="w-3 h-3 text-amber-500" />
                                    {unlockedCount} achievement{unlockedCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>

                        {/* Edit button */}
                        <button
                            disabled
                            title="Coming soon"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-muted)] bg-[var(--background-subtle)] cursor-not-allowed opacity-60 flex-shrink-0"
                        >
                            <Pencil className="w-4 h-4" />
                            Edit Profile
                        </button>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 space-y-8">
                {/* ── Stats Grid ──────────────────────────────── */}
                <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Learning Stats</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Study Time"
                            value={formatStudyTime(stats.studyTimeMinutes)}
                            icon={<Clock className="w-5 h-5 text-[var(--primary)]" />}
                            iconBg="bg-[var(--primary)]/10"
                            delay={0.05}
                        />
                        <StatCard
                            label="Courses Enrolled"
                            value={stats.coursesEnrolled}
                            icon={<GraduationCap className="w-5 h-5 text-purple-500" />}
                            iconBg="bg-purple-50"
                            delay={0.1}
                        />
                        <StatCard
                            label="Modules Completed"
                            value={stats.modulesCompleted}
                            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            iconBg="bg-emerald-50"
                            delay={0.15}
                        />
                        <StatCard
                            label="Quizzes Taken"
                            value={stats.quizzesTaken}
                            icon={<Target className="w-5 h-5 text-amber-500" />}
                            iconBg="bg-amber-50"
                            delay={0.2}
                        />
                        <StatCard
                            label="Avg Quiz Score"
                            value={stats.quizzesTaken > 0 ? `${stats.avgScore}%` : '—'}
                            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                            iconBg="bg-blue-50"
                            delay={0.25}
                        />
                        <StatCard
                            label="Current Streak"
                            value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`}
                            icon={<Flame className="w-5 h-5 text-orange-500" />}
                            iconBg="bg-orange-50"
                            delay={0.3}
                        />
                        <StatCard
                            label="Best Streak"
                            value={`${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`}
                            icon={<Trophy className="w-5 h-5 text-amber-500" />}
                            iconBg="bg-amber-50"
                            delay={0.35}
                        />
                        {/* Overall completion — spans nicely as 8th card */}
                        <motion.div
                            className="bg-white rounded-2xl p-5 border border-[var(--border-subtle)] shadow-sm flex flex-col gap-3"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.4 }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10">
                                <BookOpen className="w-5 h-5 text-[var(--primary)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground leading-tight">
                                    {completionPct}%
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                    Completion Rate
                                </p>
                                <Progress
                                    value={completionPct}
                                    className="h-1.5 mt-2 bg-[var(--border-subtle)]"
                                />
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ── Two-column: Activity + Achievements ───── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Recent Activity */}
                    <motion.section
                        className="lg:col-span-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.45 }}
                    >
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Recent Activity
                        </h2>
                        <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-6">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-10">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-[var(--text-muted)]">
                                        No activity yet.{' '}
                                        <Link
                                            href="/courses"
                                            className="text-[var(--primary)] hover:underline"
                                        >
                                            Start a course →
                                        </Link>
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {recentActivity.map((item, i) => (
                                        <ActivityRow key={i} item={item} index={i} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* Achievements */}
                    <motion.section
                        className="lg:col-span-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">Achievements</h2>
                            <span className="text-sm text-[var(--text-muted)]">
                                {unlockedCount}/{ACHIEVEMENTS.length}
                            </span>
                        </div>
                        <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-4">
                            <div className="grid grid-cols-2 gap-3">
                                {ACHIEVEMENTS.map((ach, i) => {
                                    const unlocked = ach.check(stats);
                                    return (
                                        <motion.div
                                            key={ach.id}
                                            className={`relative rounded-xl border p-3 transition-all ${
                                                unlocked
                                                    ? `${ach.color} shadow-sm`
                                                    : 'bg-[var(--background-subtle)] border-[var(--border-subtle)] opacity-45'
                                            }`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: unlocked ? 1 : 0.45, scale: 1 }}
                                            transition={{ duration: 0.3, delay: 0.55 + i * 0.04 }}
                                        >
                                            {/* Lock overlay for locked badges */}
                                            {!unlocked && (
                                                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <span className="text-[8px]">🔒</span>
                                                </div>
                                            )}
                                            <div className="text-2xl mb-1.5">{ach.emoji}</div>
                                            <p className="text-xs font-semibold text-foreground leading-tight">
                                                {ach.title}
                                            </p>
                                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                                {ach.desc}
                                            </p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
