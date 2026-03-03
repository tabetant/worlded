'use client';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react'
import { safeRedirect } from '@/lib/security/redirect-validator';
import { StudentView } from '@/components/dashboard/StudentView';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { Button } from '@/components/ui/button';

interface UserStats {
    coursesEnrolled: number;
    modulesCompleted: number;
    totalModules: number;
    completionPercentage: number;
}

interface InProgressCourse {
    courseId: string;
    courseName: string;
    totalModules: number;
    completedModules: number;
    percentage: number;
    timeRemaining: string;
    lastModule?: {
        id: string;
        title: string;
    };
}

interface StreakData {
    currentStreak: number;
    longestStreak: number;
}

interface CourseWithProgress {
    id: string;
    title: string;
    description: string;
    iconName: string;
    moduleCount: number;
    completedCount: number;
    progress: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [firstName, setFirstName] = useState('there');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [inProgressCourses, setInProgressCourses] = useState<InProgressCourse[]>([]);
    const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 });
    const [isNewUser, setIsNewUser] = useState(false);
    const [courseProgress, setCourseProgress] = useState<CourseWithProgress[]>([]);
    const [userRole, setUserRole] = useState<'student' | 'mentor'>('student');

    useEffect(() => {
        const checkLoggedin = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push(safeRedirect('/auth'));
            } else {
                // Extract user's first name from metadata or email
                const user = session.user;
                const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
                const nameFromMeta = fullName ? fullName.split(' ')[0] : '';
                const nameFromEmail = user.email ? user.email.split('@')[0] : '';
                setFirstName(nameFromMeta || nameFromEmail || 'there');
                setLoading(false);

                // Fetch user stats
                try {
                    const res = await fetch('/api/user/stats');
                    if (res.ok) {
                        const data = await res.json();
                        setStats(data.stats);
                        setInProgressCourses(data.inProgressCourses || []);
                        setStreak(data.streak || { currentStreak: 0, longestStreak: 0 });
                        setIsNewUser(data.isNewUser || false);
                        setCourseProgress(data.courseProgress || []);
                    }
                } catch (e) {
                    console.error('Failed to fetch stats:', e);
                }
            }
        };
        checkLoggedin();
    }, [router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="relative">
            {/* Dev Toggle for demo purposes */}
            <div className="fixed bottom-4 left-4 z-40 opacity-50 hover:opacity-100 transition-opacity">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserRole(r => r === 'student' ? 'mentor' : 'student')}
                >
                    Switch to {userRole === 'student' ? 'Mentor' : 'Student'} View
                </Button>
            </div>

            {userRole === 'student'
                ? <StudentView
                    firstName={firstName}
                    stats={stats}
                    inProgressCourses={inProgressCourses}
                    streak={streak}
                    isNewUser={isNewUser}
                    courseProgress={courseProgress}
                />
                : <MentorDashboard />
            }
        </div>
    );
}
