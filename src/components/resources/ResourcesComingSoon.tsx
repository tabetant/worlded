import Link from 'next/link';
import { FileText, Video, BookOpen, ArrowRight, Sparkles, Download } from 'lucide-react';

const PREVIEW_CARDS = [
    {
        icon: FileText,
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
        badge: 'PDF',
        badgeStyle: 'bg-rose-100 text-rose-600',
        title: 'Calculus Cheat Sheet',
        desc: 'Key formulas, derivative rules, and integration techniques',
    },
    {
        icon: Video,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        badge: 'Video',
        badgeStyle: 'bg-blue-100 text-blue-600',
        title: 'Linear Algebra Visualised',
        desc: 'Interactive video walkthrough of vector spaces and transformations',
    },
    {
        icon: BookOpen,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
        badge: 'Article',
        badgeStyle: 'bg-emerald-100 text-emerald-600',
        title: 'Physics Problem Sets',
        desc: 'Graded practice problems with worked solutions',
    },
];

export function ResourcesComingSoon() {
    return (
        <div className="min-h-screen bg-[var(--background-subtle)]">
            {/* Header */}
            <div className="bg-white border-b border-[var(--border-subtle)]">
                <div className="container mx-auto px-6 py-8">
                    <h1 className="text-3xl font-bold text-foreground mb-1">Resources</h1>
                    <p className="text-[var(--text-muted)]">Supplemental learning materials</p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12">
                {/* Main coming-soon card */}
                <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm p-12 text-center max-w-2xl mx-auto mb-10">
                    {/* Icon cluster */}
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent,#6366f1)]/10 rounded-2xl" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className="w-10 h-10 text-[var(--primary)]" />
                        </div>
                        {/* Floating badges */}
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="absolute -bottom-2 -left-2 w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="absolute -top-2 -left-3 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-3">
                        Resources are being prepared!
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-md mx-auto leading-relaxed mb-8">
                        Check back soon for PDFs, reference materials, video lectures, and
                        additional learning content to support every course.
                    </p>

                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-full text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        In the meantime, explore our courses
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Preview cards — what's coming */}
                <p className="text-center text-sm font-medium text-[var(--text-muted)] mb-4 uppercase tracking-wider">
                    Coming soon
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PREVIEW_CARDS.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-[var(--border-subtle)] p-5 opacity-60 select-none"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}
                                    >
                                        <Icon className={`w-5 h-5 ${card.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeStyle}`}
                                            >
                                                {card.badge}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-foreground text-sm leading-snug">
                                            {card.title}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                    {card.desc}
                                </p>
                                <div className="mt-4 w-full h-8 bg-[var(--background-subtle)] rounded-lg" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
