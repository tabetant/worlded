'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
    Search,
    FileText,
    Video,
    BookOpen,
    ExternalLink,
    Download,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Resource = {
    id: string;
    title: string;
    type: string;
    url: string;
    subject: string;
    contentSummary: string | null;
    courseId: string | null;
    courseName: string | null;
};

type TypeFilter = 'all' | 'pdf' | 'video' | 'article';

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
    string,
    {
        icon: React.ElementType;
        iconBg: string;
        iconColor: string;
        badge: string;
        badgeStyle: string;
        actionLabel: string;
        actionIcon: React.ElementType;
    }
> = {
    pdf: {
        icon: FileText,
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
        badge: 'PDF',
        badgeStyle: 'bg-rose-100 text-rose-600 border-rose-200',
        actionLabel: 'Download',
        actionIcon: Download,
    },
    video: {
        icon: Video,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        badge: 'Video',
        badgeStyle: 'bg-blue-100 text-blue-600 border-blue-200',
        actionLabel: 'Watch',
        actionIcon: ExternalLink,
    },
    article: {
        icon: BookOpen,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
        badge: 'Article',
        badgeStyle: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        actionLabel: 'Read',
        actionIcon: ExternalLink,
    },
    link: {
        icon: ExternalLink,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
        badge: 'Link',
        badgeStyle: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        actionLabel: 'Open',
        actionIcon: ExternalLink,
    },
};

const DEFAULT_TYPE_CONFIG = {
    icon: FileText,
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-400',
    badge: 'File',
    badgeStyle: 'bg-gray-100 text-gray-600 border-gray-200',
    actionLabel: 'Open',
    actionIcon: ExternalLink,
};

function getTypeConfig(type: string) {
    return TYPE_CONFIG[type.toLowerCase()] ?? DEFAULT_TYPE_CONFIG;
}

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pdf', label: 'PDFs' },
    { value: 'video', label: 'Videos' },
    { value: 'article', label: 'Articles' },
];

// ─── Grouping ─────────────────────────────────────────────────────────────────

type ResourceGroup = { key: string; label: string; items: Resource[] };

function groupResources(list: Resource[]): ResourceGroup[] {
    const order: string[] = [];
    const map: Record<string, ResourceGroup> = {};

    for (const r of list) {
        const key = r.courseId ?? `subject:${r.subject}`;
        const label = r.courseName ?? r.subject;
        if (!map[key]) {
            map[key] = { key, label, items: [] };
            order.push(key);
        }
        map[key].items.push(r);
    }

    return order.map(k => map[k]);
}

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: Resource }) {
    const cfg = getTypeConfig(resource.type);
    const Icon = cfg.icon;
    const ActionIcon = cfg.actionIcon;

    return (
        <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-subtle)] hover:bg-white hover:shadow-sm transition-all duration-150 group">
            {/* Type icon */}
            <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}
            >
                <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-[var(--primary)] transition-colors">
                        {resource.title}
                    </h3>
                    <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeStyle}`}
                    >
                        {cfg.badge}
                    </span>
                </div>
                {resource.contentSummary && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">
                        {resource.contentSummary}
                    </p>
                )}
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 uppercase tracking-wide font-medium">
                    {resource.subject}
                </p>
            </div>

            {/* Action button */}
            <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/8 hover:bg-[var(--primary)] hover:text-white border border-[var(--primary)]/20 transition-all flex-shrink-0"
            >
                <ActionIcon className="w-3.5 h-3.5" />
                {cfg.actionLabel}
            </a>
        </div>
    );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function ResourceSection({
    group,
    isOpen,
    onToggle,
    courseId,
}: {
    group: ResourceGroup;
    isOpen: boolean;
    onToggle: () => void;
    courseId: string | null;
}) {
    return (
        <div className="bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--background-subtle)] transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <span className="font-semibold text-foreground">{group.label}</span>
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--background-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
                        {group.items.length}
                    </span>
                </div>
                {courseId && (
                    <Link
                        href={`/courses/${courseId}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-[var(--primary)] hover:underline"
                    >
                        View course →
                    </Link>
                )}
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="px-4 pb-4 space-y-2 border-t border-[var(--border-subtle)] pt-4">
                            {group.items.map(resource => (
                                <ResourceCard key={resource.id} resource={resource} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ResourcesViewProps {
    resources: Resource[];
}

export function ResourcesView({ resources }: ResourcesViewProps) {
    const [search, setSearch] = useState('');
    const [activeType, setActiveType] = useState<TypeFilter>('all');
    const [activeCourse, setActiveCourse] = useState<string>('all');

    // Build unique course options from the data
    const courseOptions = useMemo(() => {
        const seen = new Map<string, string>();
        for (const r of resources) {
            if (r.courseId && r.courseName && !seen.has(r.courseId)) {
                seen.set(r.courseId, r.courseName);
            }
        }
        return [...seen.entries()].map(([id, name]) => ({ id, name }));
    }, [resources]);

    // Start with all sections open
    const [openSections, setOpenSections] = useState<Set<string>>(
        () => new Set(groupResources(resources).map(g => g.key)),
    );

    function toggleSection(key: string) {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    const filteredGroups = useMemo(() => {
        let list = resources;

        if (activeType !== 'all') {
            // 'article' filter also catches 'link'
            list = list.filter(r =>
                activeType === 'article'
                    ? r.type === 'article' || r.type === 'link'
                    : r.type === activeType,
            );
        }

        if (activeCourse !== 'all') {
            list = list.filter(r => r.courseId === activeCourse);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                r =>
                    r.title.toLowerCase().includes(q) ||
                    r.contentSummary?.toLowerCase().includes(q) ||
                    r.subject.toLowerCase().includes(q),
            );
        }

        return groupResources(list);
    }, [resources, activeType, activeCourse, search]);

    const totalVisible = filteredGroups.reduce((s, g) => s + g.items.length, 0);

    return (
        <div className="min-h-screen bg-[var(--background-subtle)]">
            {/* Page header */}
            <div className="bg-white border-b border-[var(--border-subtle)]">
                <div className="container mx-auto px-6 py-8">
                    <h1 className="text-3xl font-bold text-foreground mb-1">Resources</h1>
                    <p className="text-[var(--text-muted)]">
                        Supplemental learning materials for all courses
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Search + filters */}
                <div className="flex flex-col gap-4 mb-8">
                    {/* Search bar */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                        <Input
                            placeholder="Search resources..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>

                    {/* Filter row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Type chips */}
                        <div className="flex flex-wrap gap-2">
                            {TYPE_FILTERS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setActiveType(f.value)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                        activeType === f.value
                                            ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                            : 'bg-white text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Course filter — only shown when courses exist */}
                        {courseOptions.length > 0 && (
                            <select
                                value={activeCourse}
                                onChange={e => setActiveCourse(e.target.value)}
                                className="ml-auto text-sm border border-[var(--border-subtle)] rounded-full px-4 py-1.5 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer"
                            >
                                <option value="all">All courses</option>
                                {courseOptions.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Count */}
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    {totalVisible === resources.length
                        ? `${resources.length} resource${resources.length === 1 ? '' : 's'}`
                        : `Showing ${totalVisible} of ${resources.length} resources`}
                </p>

                {/* Sections */}
                {filteredGroups.length > 0 ? (
                    <motion.div
                        className="space-y-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.06 } },
                        }}
                    >
                        {filteredGroups.map(group => (
                            <motion.div
                                key={group.key}
                                variants={{
                                    hidden: { opacity: 0, y: 16 },
                                    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                                }}
                            >
                                <ResourceSection
                                    group={group}
                                    isOpen={openSections.has(group.key)}
                                    onToggle={() => toggleSection(group.key)}
                                    courseId={
                                        group.key.startsWith('subject:') ? null : group.key
                                    }
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="bg-white rounded-2xl border border-[var(--border-subtle)] p-16 text-center shadow-sm">
                        <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-lg font-medium text-muted-foreground">
                            No resources found
                        </p>
                        {(search || activeType !== 'all' || activeCourse !== 'all') && (
                            <p className="text-sm text-[var(--text-muted)] mt-2">
                                Try adjusting your search or filters.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
