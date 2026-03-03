'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw, LifeBuoy } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log to monitoring service in production (e.g. Sentry)
        // NEVER show error.message to the user
        console.error('[app error boundary]', {
            message: error.message,
            digest: error.digest,
            timestamp: new Date().toISOString(),
        })
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-lg w-full text-center px-6">
                {/* Icon */}
                <div className="relative mx-auto mb-8 w-24 h-24">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-10 h-10 text-red-500" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Message — NEVER show error.message */}
                <h1 className="text-2xl font-bold text-foreground mb-3">
                    Something went wrong
                </h1>
                <p className="text-muted-foreground mb-2 leading-relaxed">
                    We&apos;re sorry, but something unexpected happened. This error has been
                    logged and our team will look into it.
                </p>

                {/* Error digest (safe — Next.js generated hash, not the raw error) */}
                {error.digest && (
                    <p className="text-xs text-muted-foreground/60 font-mono mb-8">
                        Reference: {error.digest}
                    </p>
                )}

                {!error.digest && <div className="mb-8" />}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                        onClick={reset}
                        className="gap-2 bg-[var(--worlded-blue)] hover:bg-blue-900 px-6"
                    >
                        <RefreshCw size={16} />
                        Try again
                    </Button>

                    <Button variant="outline" asChild className="gap-2 px-6">
                        <Link href="/dashboard">
                            <Home size={16} />
                            Go to Dashboard
                        </Link>
                    </Button>
                </div>

                {/* Support link */}
                <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                        Need help? We&apos;re here for you.
                    </p>
                    <Link
                        href="/support"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--worlded-blue)] hover:underline"
                    >
                        <LifeBuoy size={14} />
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    )
}
