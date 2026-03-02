# Supabase Session & JWT Configuration

> **Important:** WorldEd uses **Supabase Auth**, not Clerk. All JWT and session configuration is managed through the Supabase Dashboard.

---

## How It Works

Supabase handles JWT issuance, refresh token rotation, and session persistence automatically via `@supabase/ssr`. The flow is:

```
User logs in → Supabase issues Access Token (JWT) + Refresh Token
                ↓
Access Token expires (1 hour) → @supabase/ssr auto-refreshes using Refresh Token
                ↓
Refresh Token is rotated → old one invalidated, new one issued
                ↓
Session timeboxed (7 days) → user must re-authenticate after inactivity
```

---

## Step-by-Step: Configure in Supabase Dashboard

### 1. Navigate to Auth Settings

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **WorldEd** project
3. Click **Authentication** in the left sidebar
4. Click **Settings** → **Auth** tab

### 2. Configure JWT Expiry

1. Find **JWT expiry** (under "General" section)
2. Set to: `3600` (1 hour — this is the access token lifetime)
3. Click **Save**

> **Why 1 hour?** Short-lived access tokens limit the damage window if a token is stolen. The refresh token handles seamless renewal behind the scenes.

### 3. Configure Session Timebox

1. Find **Session timebox** (under "Sessions" section)
2. Set to: `604800` (7 days = 604,800 seconds)
3. Click **Save**

> **Why 7 days?** This is the maximum duration a session can live, even with active refresh. After 7 days, the user must sign in again. This balances security with user convenience.

### 4. Verify Refresh Token Rotation

1. Find **Refresh token rotation** (under "Sessions" section)
2. Ensure it is **Enabled** (this is the default)
3. Set **Refresh token reuse interval** to: `10` seconds
4. Click **Save**

> **Why rotation?** Each refresh token can only be used once. When a token is used, it's invalidated and a new one is issued. This prevents replay attacks.

---

## Recommended Settings Summary

| Setting | Value | Purpose |
|---------|-------|---------|
| JWT expiry | `3600` (1 hour) | Access token lifetime |
| Session timebox | `604800` (7 days) | Maximum session duration |
| Refresh token rotation | `Enabled` | Prevents replay attacks |
| Refresh token reuse interval | `10` seconds | Grace period for concurrent requests |
| MFA | Optional | Enable for admin accounts |

---

## How Our Middleware Handles Sessions

Our `src/middleware.ts` uses `createServerClient` from `@supabase/ssr` which automatically:

1. **Reads** session cookies on every request
2. **Refreshes** the access token if expired (using the refresh token)
3. **Sets** updated cookies on the response
4. **Validates** the user with `supabase.auth.getUser()` — this verifies the JWT server-side, making it safe from token tampering

### Why `getUser()` and NOT `getSession()`?

- `getSession()` reads the JWT from the cookie and decodes it **without server validation** — it trusts the token blindly
- `getUser()` sends the JWT to Supabase's API and validates it server-side — this catches tampered, expired, or revoked tokens

We use `getUser()` everywhere in the codebase for this reason.

---

## Token Refresh Behavior

### Automatic (handled by @supabase/ssr)

When a user makes a request and their access token is expired:

1. The middleware's `createServerClient` detects the expired token
2. It automatically uses the refresh token to get a new access token
3. The new tokens are set as cookies in the response
4. The request continues with the fresh session

**No client-side code changes needed** — this is seamless.

### Manual (if needed)

In rare cases where you need to force a token refresh client-side:

```typescript
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

// Force session refresh
const { data, error } = await supabase.auth.refreshSession()
if (error) {
  // Session expired or invalid — redirect to /auth
  window.location.href = '/auth'
}
```

### Session Expiry Behavior

| Scenario | Behavior |
|----------|----------|
| User active within 7 days | Session auto-refreshes, stays logged in |
| User inactive for 7+ days | Session expires, redirected to /auth |
| Refresh token reused (stolen) | All sessions invalidated (security feature) |
| User signs out | All tokens invalidated immediately |

---

## Custom JWT Claims (Optional — For Future Use)

To include the user's role in the JWT (useful for edge functions or middleware-level role checks):

```sql
-- Run in Supabase SQL Editor:
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = (event->>'user_id');
  IF user_role IS NOT NULL THEN
    event := jsonb_set(event, '{claims,user_role}', to_jsonb(user_role));
  END IF;
  RETURN event;
END;
$$;
```

Then enable the hook in: **Dashboard → Auth → Hooks → Customize Access Token**.

> **Note:** We currently check roles via a database query in `getUserRole()`. Adding it to the JWT would allow role checks without a DB query, which is faster for middleware but requires careful cache invalidation when roles change.

---

## Security Considerations

1. **Never store JWTs in localStorage** — Supabase SSR uses HTTP-only cookies
2. **Always use `getUser()` for auth checks** — validates server-side
3. **Refresh tokens are single-use** — rotation prevents replay attacks
4. **Session timebox limits exposure** — even active sessions expire after 7 days
5. **All auth state is server-side** — client components receive auth status via props
