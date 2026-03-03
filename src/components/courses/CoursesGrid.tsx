'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, GraduationCap } from 'lucide-react';

type Course = {
    id: string;
    title: string;
    description: string;
    iconName: string;
    createdAt: Date | null;
};

type Category = 'All' | 'Mathematics' | 'Physics' | 'Computer Science';

const CATEGORIES: Category[] = ['All', 'Mathematics', 'Physics', 'Computer Science'];

const ICON_MAP: Record<string, string> = {
    calculator: '🧮',
    activity: '📊',
    atom: '⚛️',
    cpu: '💻',
    code: '💻',
    book: '📚',
    'book-open': '📖',
    flask: '🧪',
    'graduation-cap': '🎓',
    'bar-chart': '📈',
    function: 'ƒ',
    sigma: '∑',
    pi: 'π',
    integral: '∫',
    brain: '🧠',
    zap: '⚡',
};

function getEmoji(iconName: string): string {
    return ICON_MAP[iconName.toLowerCase()] ?? '📚';
}

type DerivedCategory = Exclude<Category, 'All'>;

function deriveCategory(id: string, title: string): DerivedCategory {
    const text = `${id} ${title}`.toLowerCase();
    if (/physics|quantum|mechanics|thermodyn|optic|electro|magnetic|wave|relativity/.test(text)) {
        return 'Physics';
    }
    if (/computer|programming|algorithm|software|data.struct|machine.learn|artificial|neural|network|javascript|python|typescript|react/.test(text)) {
        return 'Computer Science';
    }
    return 'Mathematics';
}

const CATEGORY_STYLES: Record<DerivedCategory, string> = {
    Mathematics: 'bg-purple-100 text-purple-700 border-purple-200',
    Physics: 'bg-blue-100 text-blue-700 border-blue-200',
    'Computer Science': 'bg-green-100 text-green-700 border-green-200',
};

const DIFFICULTY = 'Beginner';
const DIFFICULTY_STYLE = 'bg-amber-100 text-amber-700 border-amber-200';

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.07 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

interface CoursesGridProps {
    courses: Course[];
    enrolledCourseIds: string[];
}

export function CoursesGrid({ courses, enrolledCourseIds }: CoursesGridProps) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<Category>('All');

    const enrolledSet = useMemo(() => new Set(enrolledCourseIds), [enrolledCourseIds]);

    const enrichedCourses = useMemo(
        () =>
            courses.map(c => ({
                ...c,
                category: deriveCategory(c.id, c.title),
                emoji: getEmoji(c.iconName),
                isEnrolled: enrolledSet.has(c.id),
            })),
        [courses, enrolledSet],
    );

    const filtered = useMemo(() => {
        let result = enrichedCourses;
        if (activeCategory !== 'All') {
            result = result.filter(c => c.category === activeCategory);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                c =>
                    c.title.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q),
            );
        }
        return result;
    }, [enrichedCourses, activeCategory, search]);

    return (
        <div>
            {/* Search & Filters */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    <Input
                        placeholder="Search courses..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 bg-white"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                activeCategory === cat
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                    : 'bg-white text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course count */}
            <p className="text-sm text-[var(--text-muted)] mb-4">
                {filtered.length === courses.length
                    ? `${courses.length} courses available`
                    : `Showing ${filtered.length} of ${courses.length} courses`}
            </p>

            {/* Grid */}
            {filtered.length > 0 ? (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key={`${activeCategory}-${search}`}
                >
                    {filtered.map(course => (
                        <motion.div key={course.id} variants={cardVariants}>
                            <Link href={`/courses/${course.id}`} className="group block h-full">
                                <div className="bg-white rounded-2xl p-6 border border-[var(--border-subtle)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 h-full flex flex-col">
                                    {/* Icon row with enrollment badge */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="text-4xl leading-none">{course.emoji}</div>
                                        {course.isEnrolled && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Enrolled
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                        {course.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-[var(--text-muted)] text-sm mb-5 line-clamp-2 flex-1">
                                        {course.description}
                                    </p>

                                    {/* Badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[course.category]}`}>
                                            {course.category}
                                        </span>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLE}`}>
                                            {DIFFICULTY}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="text-center py-20">
                    <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-xl font-medium text-muted-foreground">No courses found</p>
                    {(search || activeCategory !== 'All') && (
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            Try adjusting your search or selecting a different category.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
