import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// =============================================================================
// CORS Configuration
// TODO: Before deploying to production, update ALLOWED_ORIGINS with actual domain
// Example: 'https://worlded.app' or 'https://app.worlded.com'
// =============================================================================
const ALLOWED_ORIGINS = [
    'http://localhost:3000',        // Development
    'https://worlded.com',          // TODO: Replace with actual production domain
    'https://www.worlded.com',      // TODO: Replace with actual production domain
]

// =============================================================================
// Route Protection Configuration
// Routes that do NOT require authentication
// =============================================================================
const PUBLIC_ROUTES = [
    '/auth',                // Login / signup
    '/reset-password',      // Password reset
    '/',                    // Landing page (redirects based on auth state)
]

/** Check if a pathname matches any public route prefix */
function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )
}

/** Check if the pathname is a static asset or Next.js internal */
function isStaticAsset(pathname: string): boolean {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    )
}

// =============================================================================
// Middleware
// =============================================================================

export async function middleware(request: NextRequest) {
    const origin = request.headers.get('origin')
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')

    // -------------------------------------------------------------------------
    // Handle CORS preflight (OPTIONS) for API routes
    // -------------------------------------------------------------------------
    if (isApiRoute && request.method === 'OPTIONS') {
        const preflightResponse = new NextResponse(null, { status: 204 })
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            preflightResponse.headers.set('Access-Control-Allow-Origin', origin)
            preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            preflightResponse.headers.set('Access-Control-Max-Age', '86400')
        }
        return preflightResponse
    }

    // -------------------------------------------------------------------------
    // Block cross-origin API requests from unknown origins
    // -------------------------------------------------------------------------
    if (isApiRoute && origin && !ALLOWED_ORIGINS.includes(origin)) {
        console.warn('[middleware] CORS violation:', {
            origin,
            path: request.nextUrl.pathname,
            timestamp: new Date().toISOString(),
        })
        return new NextResponse('CORS policy violation', { status: 403 })
    }

    // -------------------------------------------------------------------------
    // Supabase Auth session handling
    // Refreshes tokens automatically via @supabase/ssr
    // -------------------------------------------------------------------------
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Validate session server-side (uses getUser, NOT getSession)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // -------------------------------------------------------------------------
    // Route protection: redirect unauthenticated users to /auth
    // -------------------------------------------------------------------------
    const pathname = request.nextUrl.pathname

    if (!user && !isPublicRoute(pathname) && !isApiRoute && !isStaticAsset(pathname)) {
        // Log unauthenticated access attempt
        if (process.env.NODE_ENV === 'development') {
            console.log('[middleware] Unauthenticated access blocked:', {
                path: pathname,
                timestamp: new Date().toISOString(),
            })
        }

        const url = request.nextUrl.clone()
        url.pathname = '/auth'
        return NextResponse.redirect(url)
    }

    // -------------------------------------------------------------------------
    // Set CORS headers on actual API responses
    // -------------------------------------------------------------------------
    if (isApiRoute && origin && ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}

