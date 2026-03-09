'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import {
    BookOpen,
    Flame,
    Target,
    GraduationCap,
    CheckCircle2,
    Trophy,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseProgress {
    id: string;
    title: string;
    iconName: string;
    completedModules: number;
    totalModules: number;
    percentage: number;
}

interface QuizScore {
    score: number;
    courseName: string;
    date: string; // formatted "Jan 15"
}

export interface ProgressDashboardProps {
    overallProgress: {
        totalModules: number;
        completedModules: number;
        percentage: number;
    };
    coursesWithProgress: CourseProgress[];
    quizScores: QuizScore[];
    avgScore: number;
    streak: { currentStreak: number; longestStreak: number };
    completionDates: string[]; // YYYY-MM-DD
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
    calculator: '🧮',
    activity: '📊',
    atom: '⚛️',
    cpu: '💻',
    code: '💻',
    book: '📚',
    'book-open': '📖',
    flask: '🧪',
    brain: '🧠',
    zap: '⚡',
};

function getEmoji(iconName: string) {
    return ICON_MAP[iconName.toLowerCase()] ?? '📚';
}

function barColor(score: number) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#f87171';
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

type CalendarDay = {
    date: string;
    active: boolean;
    isToday: boolean;
    isFuture: boolean;
};

function buildCalendarWeeks(completionDates: string[]): CalendarDay[][] {
    const dateSet = new Set(completionDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from the Sunday of the week 11 weeks before the current week
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - today.getDay() - 11 * 7);

    const weeks: CalendarDay[][] = [];

    for (let w = 0; w < 12; w++) {
        const week: CalendarDay[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + w * 7 + d);
            const y = date.getFullYear();
            const mo = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${mo}-${dd}`;
            week.push({
                date: dateStr,
                active: dateSet.has(dateStr),
                isToday: date.getTime() === today.getTime(),
                isFuture: date > today,
            });
        }
        weeks.push(week);
    }

    return weeks;
}

function getMonthLabels(weeks: CalendarDay[][]) {
    const labels: Array<{ label: string; colIndex: number }> = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const month = new Date(week[0].date).getMonth();
        if (month !== lastMonth) {
            labels.push({
                label: new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' }),
                colIndex: wi,
            });
            lastMonth = month;
        }
    });
    return labels;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

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
            className="bg-white rounded-2xl p-6 border border-[var(--border-subtle)] shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                    {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
                </div>
                <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProgressDashboard({
    overallProgress,
    coursesWithProgress,
    quizScores,
    avgScore,
    streak,
    completionDates,
}: ProgressDashboardProps) {
    const calendarWeeks = useMemo(() => buildCalendarWeeks(completionDates), [completionDates]);
    const monthLabels = useMemo(() => getMonthLabels(calendarWeeks), [calendarWeeks]);

    const isEmpty = coursesWithProgress.length === 0;

    return (
        <div className="min-h-screen bg-[var(--background-subtle)]">
            {/* Page header */}
            <div className="bg-white border-b border-[var(--border-subtle)]">
                <div className="container mx-auto px-6 py-8">
                    <h1 className="text-3xl font-bold text-foreground mb-1">My Progress</h1>
                    <p className="text-[var(--text-muted)]">Track your learning journey</p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Courses Enrolled"
                        value={coursesWithProgress.length}
                        icon={<GraduationCap className="w-5 h-5 text-[var(--primary)]" />}
                        iconBg="bg-[var(--primary)]/10"
                        delay={0.05}
                    />
                    <StatCard
                        label="Modules Completed"
                        value={`${overallProgress.completedModules}/${overallProgress.totalModules}`}
                        sub={`${overallProgress.percentage}% overall`}
                        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        iconBg="bg-emerald-50"
                        delay={0.1}
                    />
                    <StatCard
                        label="Avg Quiz Score"
                        value={quizScores.length > 0 ? `${avgScore}%` : '—'}
                        sub={
                            quizScores.length > 0
                                ? `${quizScores.length} quiz${quizScores.length === 1 ? '' : 'zes'} taken`
                                : 'No quizzes yet'
                        }
                        icon={<Target className="w-5 h-5 text-amber-500" />}
                        iconBg="bg-amber-50"
                        delay={0.15}
                    />
                    <StatCard
                        label="Current Streak"
                        value={`${streak.currentStreak} ${streak.currentStreak === 1 ? 'day' : 'days'}`}
                        sub={`Best: ${streak.longestStreak} days`}
                        icon={<Flame className="w-5 h-5 text-orange-500" />}
                        iconBg="bg-orange-50"
                        delay={0.2}
                    />
                </div>

                {/* Empty state */}
                {isEmpty ? (
                    <motion.div
                        className="bg-white rounded-2xl border border-[var(--border-subtle)] p-16 text-center shadow-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25 }}
                    >
                        <GraduationCap className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Start a course to track your progress!
                        </h2>
                        <p className="text-[var(--text-muted)] mb-6 max-w-sm mx-auto text-sm">
                            Your course completion, quiz scores, and learning streak will all appear
                            here once you begin.
                        </p>
                        <Link
                            href="/courses"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                        >
                            <BookOpen className="w-4 h-4" />
                            Browse Courses
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25 }}
                    >
                        <Tabs defaultValue="overview">
                            <TabsList className="mb-6 bg-white border border-[var(--border-subtle)] p-1 rounded-xl h-auto">
                                <TabsTrigger value="overview" className="rounded-lg px-5 py-2">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="quizzes" className="rounded-lg px-5 py-2">
                                    Quiz History
                                </TabsTrigger>
                                <TabsTrigger value="streak" className="rounded-lg px-5 py-2">
                                    Streak
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Overview ──────────────────────────────── */}
                            <TabsContent value="overview" className="mt-0">
                                <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
                                    {coursesWithProgress.map(course => (
                                        <Link
                                            key={course.id}
                                            href={`/courses/${course.id}`}
                                            className="group block"
                                        >
                                            <div className="flex items-center gap-4 px-6 py-5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-subtle)] transition-colors">
                                                <div className="text-3xl leading-none w-10 text-center flex-shrink-0">
                                                    {getEmoji(course.iconName)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2 gap-4">
                                                        <h3 className="font-semibold text-foreground group-hover:text-[var(--primary)] transition-colors truncate">
                                                            {course.title}
                                                        </h3>
                                                        <span className="text-sm text-[var(--text-muted)] flex-shrink-0">
                                                            {course.completedModules}/{course.totalModules} modules
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Progress
                                                            value={course.percentage}
                                                            className="flex-1 h-2 bg-[var(--border-subtle)]"
                                                        />
                                                        <span
                                                            className={`text-sm font-semibold flex-shrink-0 w-10 text-right ${
                                                                course.percentage === 100
                                                                    ? 'text-emerald-600'
                                                                    : 'text-[var(--primary)]'
                                                            }`}
                                                        >
                                                            {course.percentage}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {course.percentage === 100 && (
                                                    <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* ── Quiz History ──────────────────────────── */}
                            <TabsContent value="quizzes" className="mt-0">
                                <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-6">
                                    {quizScores.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                                            <p className="text-[var(--text-muted)]">
                                                No quiz scores yet. Complete a module quiz to see
                                                your results here.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Legend + heading */}
                                            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                                                <h2 className="text-lg font-semibold text-foreground">
                                                    Quiz Scores
                                                </h2>
                                                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                                        ≥ 80%
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                                        60–79%
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                                                        &lt; 60%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bar chart */}
                                            <ResponsiveContainer width="100%" height={260}>
                                                <BarChart
                                                    data={quizScores}
                                                    margin={{ top: 5, right: 10, left: 0, bottom: 55 }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="#e5e7eb"
                                                        vertical={false}
                                                    />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                        angle={-40}
                                                        textAnchor="end"
                                                        interval={0}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                                        tickFormatter={v => `${v}%`}
                                                        width={42}
                                                    />
                                                    <Tooltip
                                                        formatter={value => [`${value}%`, 'Score']}
                                                        contentStyle={{
                                                            borderRadius: '12px',
                                                            border: '1px solid #e5e7eb',
                                                            fontSize: '13px',
                                                            boxShadow:
                                                                '0 4px 6px -1px rgba(0,0,0,0.08)',
                                                        }}
                                                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                                    />
                                                    <Bar
                                                        dataKey="score"
                                                        radius={[4, 4, 0, 0]}
                                                        maxBarSize={48}
                                                    >
                                                        {quizScores.map((entry, i) => (
                                                            <Cell
                                                                key={`cell-${i}`}
                                                                fill={barColor(entry.score)}
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>

                                            {/* Score list below chart */}
                                            <div className="mt-6 space-y-0 divide-y divide-[var(--border-subtle)]">
                                                {[...quizScores].reverse().map((q, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between py-3"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                {q.courseName}
                                                            </p>
                                                            <p className="text-xs text-[var(--text-muted)]">
                                                                {q.date}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                                q.score >= 80
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : q.score >= 60
                                                                      ? 'bg-amber-100 text-amber-700'
                                                                      : 'bg-rose-100 text-rose-700'
                                                            }`}
                                                        >
                                                            {q.score}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            {/* ── Streak ────────────────────────────────── */}
                            <TabsContent value="streak" className="mt-0 space-y-4">
                                {/* Streak stat cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-6 text-center">
                                        <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                                        <p className="text-4xl font-bold text-foreground">
                                            {streak.currentStreak}
                                        </p>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">
                                            Current streak (days)
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-6 text-center">
                                        <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                                        <p className="text-4xl font-bold text-foreground">
                                            {streak.longestStreak}
                                        </p>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">
                                            Best streak (days)
                                        </p>
                                    </div>
                                </div>

                                {/* Activity calendar */}
                                <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-foreground mb-1">
                                        Activity Calendar
                                    </h2>
                                    <p className="text-xs text-[var(--text-muted)] mb-5">
                                        Last 12 weeks — each cell is a day you completed a module
                                    </p>

                                    {/* Month labels */}
                                    <div className="flex gap-1 mb-1 pl-5">
                                        {calendarWeeks.map((week, wi) => {
                                            const label = monthLabels.find(l => l.colIndex === wi);
                                            return (
                                                <div
                                                    key={wi}
                                                    className="w-3 flex-shrink-0 text-[9px] text-[var(--text-muted)]"
                                                >
                                                    {label?.label ?? ''}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Grid: day-of-week labels + week columns */}
                                    <div className="flex gap-1">
                                        {/* Day-of-week labels (S M T W T F S) */}
                                        <div className="flex flex-col gap-1 mr-1">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                <div
                                                    key={i}
                                                    className="w-3 h-3 text-[9px] text-[var(--text-muted)] flex items-center justify-center"
                                                >
                                                    {i % 2 === 0 ? d : ''}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Week columns */}
                                        {calendarWeeks.map((week, wi) => (
                                            <div key={wi} className="flex flex-col gap-1">
                                                {week.map(day => (
                                                    <div
                                                        key={day.date}
                                                        title={`${day.date}${day.active ? ' · Active' : ''}`}
                                                        className={`w-3 h-3 rounded-sm transition-colors ${
                                                            day.isFuture
                                                                ? 'bg-transparent'
                                                                : day.active
                                                                  ? 'bg-[var(--primary)]'
                                                                  : 'bg-[var(--border-subtle)]'
                                                        } ${day.isToday ? 'ring-1 ring-offset-[1px] ring-[var(--primary)]' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex items-center justify-end gap-1.5 mt-4">
                                        <span className="text-xs text-[var(--text-muted)] mr-1">
                                            Less
                                        </span>
                                        {[
                                            'bg-[var(--border-subtle)]',
                                            'bg-[var(--primary)]/30',
                                            'bg-[var(--primary)]/60',
                                            'bg-[var(--primary)]',
                                        ].map((cls, i) => (
                                            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
                                        ))}
                                        <span className="text-xs text-[var(--text-muted)] ml-1">
                                            More
                                        </span>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
