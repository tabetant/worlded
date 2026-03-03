# Token Refresh — How It Works in WorldEd

---

## Automatic Refresh (Default — No Code Needed)

Supabase handles token refresh automatically through `@supabase/ssr`. Here's the flow:

```
User makes request
      ↓
Middleware intercepts (src/middleware.ts)
      ↓
createServerClient reads session cookies
      ↓
Access token valid? ─── YES ──→ Continue normally
      │
      NO (expired)
      ↓
@supabase/ssr uses refresh token to get new access token
      ↓
New tokens set as cookies via setAll()
      ↓
Request continues with fresh session
```

### What Triggers a Refresh?

| Trigger | How |
|---------|-----|
| **Any page navigation** | Middleware runs on every request, checks token validity |
| **Any API call** | Server-side `createClient()` checks token validity |
| **Background tab becomes active** | `@supabase/ssr` detects stale session |
| **Manual call** | `supabase.auth.refreshSession()` |

### What Happens When Tokens Expire?

| Scenario | Result |
|----------|--------|
| Access token expired, refresh token valid | Auto-refreshed silently (user stays logged in) |
| Access token expired, refresh token expired | User redirected to `/auth` to sign in again |
| Refresh token reuse detected (stolen) | All sessions revoked, user must sign in again |

---

## Manual Token Refresh (If Needed)

In most cases, you **do not need to manually refresh tokens**. The middleware handles it. However, for edge cases (e.g., long-running client-side operations), you can force a refresh:

### Client-Side Refresh

```typescript
import { createClient } from '@/utils/supabase/client'

async function refreshUserSession() {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
        console.error('Session refresh failed:', error.message)
        // Redirect to login
        window.location.href = '/auth'
        return null
    }
    
    console.log('Session refreshed successfully')
    console.log('New expiry:', new Date(data.session!.expires_at! * 1000))
    
    return data.session
}
```

### Server-Side Refresh

```typescript
import { createClient } from '@/utils/supabase/server'

async function refreshServerSession() {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
        console.error('[server] Session refresh failed:', error.message)
        return null
    }
    
    return data.session
}
```

---

## Checking Session Status

### Server Component / Server Action

```typescript
import { createClient } from '@/utils/supabase/server'

export default async function SomePage() {
    const supabase = await createClient()
    
    // getUser() validates the JWT server-side (SAFE)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!user) {
        // Not authenticated
        redirect('/auth')
    }
    
    // User is authenticated
    console.log('User ID:', user.id)
    console.log('Email:', user.email)
}
```

### Client Component

```typescript
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useUser() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
        const supabase = createClient()
        
        // Get initial user
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
            setLoading(false)
        })
        
        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null)
            }
        )
        
        return () => subscription.unsubscribe()
    }, [])
    
    return { user, loading }
}
```

---

## Auth State Change Events

`@supabase/ssr` emits events you can listen to:

| Event | When |
|-------|------|
| `SIGNED_IN` | User signs in successfully |
| `SIGNED_OUT` | User signs out |
| `TOKEN_REFRESHED` | Access token was refreshed |
| `USER_UPDATED` | User profile was updated |
| `PASSWORD_RECOVERY` | User clicked password reset link |

### Listening to Events

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
        switch (event) {
            case 'SIGNED_IN':
                console.log('User signed in:', session?.user.email)
                break
            case 'SIGNED_OUT':
                console.log('User signed out')
                break
            case 'TOKEN_REFRESHED':
                console.log('Token refreshed at:', new Date().toISOString())
                break
            case 'PASSWORD_RECOVERY':
                console.log('Password recovery initiated')
                break
        }
    }
)
```

---

## Security Considerations

1. **Never store JWTs in `localStorage`** — Supabase SSR uses HTTP-only cookies, which are not accessible to JavaScript (protects against XSS)

2. **Always use `getUser()`, not `getSession()`**:
   - `getSession()` reads the JWT from the cookie and decodes it locally — it **trusts the token blindly**
   - `getUser()` sends the JWT to Supabase's server and validates it — catches tampered, expired, or revoked tokens

3. **Refresh tokens are single-use** — after a refresh token is used, it's invalidated. If an attacker tries to reuse it, Supabase revokes the entire session.

4. **Session timebox** — even with automatic refresh, sessions expire after the configured timebox (7 days). This limits exposure if a device is left unattended.

5. **Concurrent tabs** — the 10-second reuse interval prevents false positives when multiple tabs send refresh requests simultaneously.

---

## Related Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Automatic token refresh on every request |
| `src/utils/supabase/server.ts` | Server-side Supabase client (uses cookies) |
| `src/utils/supabase/client.ts` | Client-side Supabase client (browser) |
| `src/lib/auth/supabase-jwt-config.md` | How to configure JWT in Supabase Dashboard |
| `src/lib/auth/session.ts` | Server-side session helper functions |
