import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { z } from 'zod'
import { errorResponse } from '@/lib/errors/error-handler'

const requestSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = requestSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Please provide a valid email address.' },
                { status: 400 }
            )
        }

        const { email } = parsed.data
        const normalizedEmail = email.toLowerCase().trim()

        // Rate limit: max 3 requests per email per hour
        const rateLimitKey = `password-reset:${normalizedEmail}`
        const rateLimit = checkRateLimit(rateLimitKey, {
            maxAttempts: 3,
            windowMs: 60 * 60 * 1000,
        })

        // Security logging — always log attempts
        console.log('[password-reset] Attempt:', {
            email: normalizedEmail,
            timestamp: new Date().toISOString(),
            allowed: rateLimit.allowed,
            remaining: rateLimit.remaining,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
        })

        if (!rateLimit.allowed) {
            const retryAfterSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
            const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60)

            const response = NextResponse.json(
                {
                    error: 'Too many reset requests. Please try again later.',
                    retryAfter: retryAfterMinutes,
                },
                { status: 429 }
            )
            response.headers.set('Retry-After', String(retryAfterSeconds))
            return response
        }

        // Use Supabase's built-in password reset
        const supabase = await createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-callback`,
        })

        if (error) {
            console.error('[password-reset] Supabase error:', error.message)
            // Don't reveal if the email exists — always return success message
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive reset instructions.',
            remaining: rateLimit.remaining,
        })
    } catch (error) {
        return errorResponse(error, 500, 'auth:request-reset')
    }
}
