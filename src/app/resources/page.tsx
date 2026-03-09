import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { resources, courses } from '@/app/db/drizzle/schema';
import { ResourcesView } from '@/components/resources/ResourcesView';
import { ResourcesComingSoon } from '@/components/resources/ResourcesComingSoon';
import type { Resource } from '@/components/resources/ResourcesView';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth');

    // Try to fetch resources — table may not exist or may be empty
    let allResources: typeof resources.$inferSelect[] = [];
    let hasResources = false;

    try {
        allResources = await db.select().from(resources);
        hasResources = allResources.length > 0;
    } catch {
        hasResources = false;
    }

    if (!hasResources) {
        return <ResourcesComingSoon />;
    }

    // Fetch course names to label grouped sections
    const allCourses = await db.select({ id: courses.id, title: courses.title }).from(courses);
    const courseMap = Object.fromEntries(allCourses.map(c => [c.id, c.title]));

    // Enrich with resolved course name
    const enriched: Resource[] = allResources.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        url: r.url,
        subject: r.subject,
        contentSummary: r.contentSummary,
        courseId: r.courseId,
        courseName: r.courseId ? (courseMap[r.courseId] ?? r.courseId) : null,
    }));

    return <ResourcesView resources={enriched} />;
}
