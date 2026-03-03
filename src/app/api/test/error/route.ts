import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/errors/error-handler'

/**
 * Test route to verify error sanitization works correctly.
 *
 * GET /api/test/error?type=error|string|unknown|db|path
 *
 * Only available in development mode.
 */
export async function GET(request: Request) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const errorType = url.searchParams.get('type') || 'error'

    try {
        switch (errorType) {
            case 'error':
                throw new Error('Something went wrong in the test route')

            case 'string':
                throw 'A raw string error was thrown'

            case 'unknown':
                throw { code: 12345, nested: { data: 'unknown object' } }

            case 'db':
                // Simulates a database error that might leak sensitive info
                throw new Error(
                    'connection error: password authentication failed for user "admin" at postgres://db.supabase.co:5432/postgres'
                )

            case 'path':
                // Simulates an error with file path information
                throw new Error(
                    'ENOENT: no such file or directory, open \'/Users/antoinetabet/Developer/worlded/src/secret-config.json\''
                )

            case 'sql':
                // Simulates a SQL leak
                throw new Error(
                    'error: SELECT * FROM users WHERE email = \'admin@worlded.com\' AND password_hash = \'abc123\''
                )

            case 'stack':
                // Create an error with a real stack trace
                const err = new Error('Test error with stack trace')
                err.stack = `Error: Test error\n    at GET (/Users/antoinetabet/Developer/worlded/src/app/api/test/error/route.ts:50:19)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)`
                throw err

            default:
                return NextResponse.json({
                    message: 'Test error route',
                    availableTypes: ['error', 'string', 'unknown', 'db', 'path', 'sql', 'stack'],
                    usage: 'GET /api/test/error?type=<type>',
                })
        }
    } catch (error) {
        return errorResponse(error, 500, 'test:error')
    }
}
