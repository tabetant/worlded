"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Mic } from "lucide-react"
import { safeRedirect } from "@/lib/security/redirect-validator"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Zod Schemas ---
const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>

// --- Component ---
export default function AuthForm() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("login")

    // Login Form
    const loginForm = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    // Signup Form
    const signupForm = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: "", email: "", password: "" },
    })

    // Handlers
    const onLoginSubmit = async (data: LoginFormValues) => {
        setIsLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                toast.error("Login failed", {
                    description: error.message,
                })
                return
            }

            toast.success("Welcome back!", {
                description: "Successfully logged in to WorldEd.",
            })
            router.push(safeRedirect("/dashboard"))
            router.refresh()
        } catch (error) {
            toast.error("Something went wrong", {
                description: "Please try again later.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const onSignupSubmit = async (data: SignupFormValues) => {
        setIsLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.name,
                    },
                },
            })

            if (error) {
                toast.error("Signup failed", {
                    description: error.message,
                })
                return
            }

            toast.success("Account created!", {
                description: "Please check your email to verify your account.",
            })
            // Check if email confirmation is required, otherwise redirect
            router.push(safeRedirect("/dashboard"))
            router.refresh()
        } catch (error) {
            toast.error("Something went wrong", {
                description: "Please try again later.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleVoiceAuth = () => {
        toast.info("Voice Authentication", {
            description: "Voiceprint recognition is coming soon to the platform.",
            icon: <Mic className="h-4 w-4" />
        })
    }

    return (
        <div className="flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--worlded-blue)] uppercase">
                    WorldEd
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to continue your journey.
                </p>
            </div>

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: activeTab === "login" ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: activeTab === "login" ? 20 : -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TabsContent value="login">
                            <Card className="border-none shadow-none">
                                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                                    <CardContent className="grid gap-4 pt-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="m@example.com"
                                                disabled={isLoading}
                                                {...loginForm.register("email")}
                                            />
                                            {loginForm.formState.errors.email && (
                                                <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                disabled={isLoading}
                                                {...loginForm.register("password")}
                                            />
                                            {loginForm.formState.errors.password && (
                                                <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                                            )}
                                        </div>
                                        <div className="flex justify-end">
                                            <Link
                                                href="/reset-password"
                                                className="text-xs text-muted-foreground hover:text-[var(--worlded-blue)] transition-colors"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-4">
                                        <Button className="w-full bg-[var(--worlded-blue)] hover:bg-blue-900" type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Sign In
                                        </Button>
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    Or continue with
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="outline" type="button" className="w-full" onClick={handleVoiceAuth}>
                                            <Mic className="mr-2 h-4 w-4" />
                                            Voice Authentication
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="signup">
                            <Card className="border-none shadow-none">
                                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)}>
                                    <CardContent className="grid gap-4 pt-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="John Doe"
                                                disabled={isLoading}
                                                {...signupForm.register("name")}
                                            />
                                            {signupForm.formState.errors.name && (
                                                <p className="text-xs text-red-500">{signupForm.formState.errors.name.message}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="m@example.com"
                                                disabled={isLoading}
                                                {...signupForm.register("email")}
                                            />
                                            {signupForm.formState.errors.email && (
                                                <p className="text-xs text-red-500">{signupForm.formState.errors.email.message}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                disabled={isLoading}
                                                {...signupForm.register("password")}
                                            />
                                            {signupForm.formState.errors.password && (
                                                <p className="text-xs text-red-500">{signupForm.formState.errors.password.message}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-[var(--worlded-orange)] hover:bg-orange-600 text-white" type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Account
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>
        </div>
    )
}
