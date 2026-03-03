import { db } from '@/db';
import { courses, userProgress } from '@/app/db/drizzle/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { CoursesGrid } from '@/components/courses/CoursesGrid';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    const [allCourses, enrolledRows] = await Promise.all([
        db.select().from(courses),
        db
            .selectDistinct({ courseId: userProgress.courseId })
            .from(userProgress)
            .where(eq(userProgress.userId, user.id)),
    ]);

    const enrolledCourseIds = enrolledRows.map(r => r.courseId);

    return (
        <div className="min-h-screen bg-[var(--background-subtle)]">
            {/* Page Header */}
            <div className="bg-white border-b border-[var(--border-subtle)]">
                <div className="container mx-auto px-6 py-8">
                    <h1 className="text-3xl font-bold text-foreground mb-1">All Courses</h1>
                    <p className="text-[var(--text-muted)]">
                        Explore our complete catalog of courses
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <CoursesGrid courses={allCourses} enrolledCourseIds={enrolledCourseIds} />
            </div>
        </div>
    );
}
