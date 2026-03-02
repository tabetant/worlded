"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowLeft, Mail, CheckCircle2, AlertTriangle, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

// =============================================================================
// Types
// =============================================================================

type FormState = "idle" | "loading" | "success" | "error" | "rate-limited"

interface ApiErrorResponse {
    error: string
    retryAfter?: number
}

// =============================================================================
// Component
// =============================================================================

export default function ResetPasswordPage() {
    const [email, setEmail] = useState("")
    const [formState, setFormState] = useState<FormState>("idle")
    const [errorMessage, setErrorMessage] = useState("")
    const [retryMinutes, setRetryMinutes] = useState(0)
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

    const isValidEmail = (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedEmail = email.trim()
        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            setFormState("error")
            setErrorMessage("Please enter a valid email address.")
            return
        }

        setFormState("loading")
        setErrorMessage("")

        try {
            const res = await fetch("/api/auth/request-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmedEmail }),
            })

            if (res.status === 429) {
                const data: ApiErrorResponse = await res.json()
                setFormState("rate-limited")
                setRetryMinutes(data.retryAfter || 60)
                return
            }

            if (res.status === 400) {
                setFormState("error")
                setErrorMessage("Please enter a valid email address.")
                return
            }

            if (!res.ok) {
                setFormState("error")
                setErrorMessage("Something went wrong. Please try again.")
                return
            }

            const data = await res.json()
            setAttemptsRemaining(data.remaining ?? null)
            setFormState("success")
            setEmail("")
        } catch {
            setFormState("error")
            setErrorMessage("Network error. Please check your connection and try again.")
        }
    }

    return (
        <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">

            {/* Left Side: Branding Panel */}
            <div className="relative hidden h-full flex-col bg-gradient-to-br from-[var(--worlded-indigo)] via-[var(--worlded-purple)] to-[var(--worlded-pink)] text-white lg:flex">
                <div className="flex h-full flex-col items-center justify-center px-12">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <Globe className="text-white" size={36} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-3">
                        WorldEd
                    </h2>
                    <p className="text-white/80 text-center text-lg max-w-sm">
                        Don&apos;t worry — we&apos;ll help you get back into your account safely.
                    </p>
                    <div className="mt-8 flex items-center gap-2 text-white/60 text-sm">
                        <Mail size={14} />
                        <span>Check your inbox after submitting</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Reset Form */}
            <div className="lg:p-8 flex h-full items-center justify-center bg-gray-50/50">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">

                    {/* Header */}
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Reset your password
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter the email address associated with your account and we&apos;ll send you
                            instructions to reset your password.
                        </p>
                    </div>

                    <Card className="border shadow-sm">
                        <form onSubmit={handleSubmit}>
                            <CardHeader className="pb-4" />
                            <CardContent className="grid gap-4 pt-0">
                                {/* Email Input */}
                                <div className="grid gap-2">
                                    <Label htmlFor="reset-email">Email address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                        <Input
                                            id="reset-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value)
                                                if (formState === "error") setFormState("idle")
                                            }}
                                            disabled={formState === "loading"}
                                            className="pl-10"
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Status Messages */}
                                <AnimatePresence mode="wait">
                                    {formState === "success" && (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3"
                                        >
                                            <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                                            <div className="text-sm">
                                                <p className="font-medium text-emerald-800">Check your email</p>
                                                <p className="text-emerald-700 mt-0.5">
                                                    If an account exists with this email, you will receive reset instructions.
                                                </p>
                                                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                                                    <p className="text-emerald-600 mt-1 text-xs">
                                                        {attemptsRemaining} request{attemptsRemaining !== 1 ? 's' : ''} remaining this hour.
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {formState === "error" && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3"
                                        >
                                            <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={18} />
                                            <p className="text-sm text-red-700">{errorMessage}</p>
                                        </motion.div>
                                    )}

                                    {formState === "rate-limited" && (
                                        <motion.div
                                            key="rate-limited"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3"
                                        >
                                            <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                                            <div className="text-sm">
                                                <p className="font-medium text-amber-800">Too many requests</p>
                                                <p className="text-amber-700 mt-0.5">
                                                    Please try again in {retryMinutes} minute{retryMinutes !== 1 ? 's' : ''}.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    className="w-full bg-[var(--worlded-blue)] hover:bg-blue-900"
                                    disabled={formState === "loading" || formState === "rate-limited"}
                                >
                                    {formState === "loading" && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {formState === "success" ? "Send Again" : "Send Reset Link"}
                                </Button>

                                <Link
                                    href="/auth"
                                    className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Back to sign in
                                </Link>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Security note */}
                    <p className="px-8 text-center text-xs text-muted-foreground">
                        For security, we will always display the same message whether or not
                        an account exists with the given email address.
                    </p>
                </div>
            </div>
        </div>
    )
}
