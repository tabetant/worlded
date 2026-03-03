import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, BookOpen, Globe } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Page Not Found | WorldEd',
    description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-lg w-full text-center px-6">
                {/* Icon */}
                <div className="mx-auto mb-8 w-24 h-24 bg-gradient-to-br from-[var(--worlded-indigo)] to-[var(--worlded-cyan)] rounded-full flex items-center justify-center shadow-lg">
                    <Globe className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>

                {/* Message */}
                <h1 className="text-4xl font-bold text-foreground mb-2">
                    404
                </h1>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                    Page not found
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                    <Button
                        asChild
                        className="gap-2 bg-[var(--worlded-blue)] hover:bg-blue-900 px-6"
                    >
                        <Link href="/dashboard">
                            <Home size={16} />
                            Go to Dashboard
                        </Link>
                    </Button>

                    <Button variant="outline" asChild className="gap-2 px-6">
                        <Link href="/courses">
                            <BookOpen size={16} />
                            Browse Courses
                        </Link>
                    </Button>
                </div>

                {/* Suggestions */}
                <div className="bg-muted/50 rounded-xl p-6 text-left">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                        Here are some suggestions:
                    </h3>
                    <ul className="space-y-2">
                        <li>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Search size={14} className="shrink-0" />
                                Use the search bar to find what you need
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/courses"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <BookOpen size={14} className="shrink-0" />
                                Explore our course catalog
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/support"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Globe size={14} className="shrink-0" />
                                Contact support if you think this is a mistake
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
