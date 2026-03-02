# Supabase JWT Configuration Guide

> **Step-by-step instructions for configuring JWT and session settings in the Supabase Dashboard.**

---

## Overview

WorldEd uses Supabase Auth for authentication. Supabase issues two tokens:

| Token | Purpose | Lifetime |
|-------|---------|----------|
| **Access Token (JWT)** | Authorizes API requests, contains user claims | Configurable (we use 7 days) |
| **Refresh Token** | Used to obtain a new access token when the current one expires | Long-lived (~90 days by default) |

---

## Step 1: Navigate to Auth Settings

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click on your **WorldEd** project
3. In the left sidebar, click **Authentication** (the lock icon)
4. Click the **Providers** tab at the top — you'll see your auth providers here
5. Now click **Settings** (gear icon) further down the left sidebar under "Configuration"
6. You are now on the **Auth Settings** page

> **Alternative path:** Project Settings (gear icon at bottom of sidebar) → Authentication

---

## Step 2: Configure JWT Expiry (Access Token Lifetime)

1. On the Auth Settings page, find the section labeled **"JWT Settings"** or **"Token"**
2. Look for **"JWT Expiry"** — this controls how long an access token is valid
3. Set the value to: **`604800`** (this is 7 days in seconds)
4. Click **Save**

### Calculation
```
7 days × 24 hours × 60 minutes × 60 seconds = 604,800 seconds
```

### Why 7 Days?

| Concern | Explanation |
|---------|-------------|
| **Security** | Shorter tokens reduce the window of exposure if a token is stolen |
| **User experience** | 7 days means students don't need to re-login every day |
| **Balance** | Industry standard for educational platforms (not as sensitive as banking) |

> **Note:** If your app handles sensitive financial data, consider 1 hour (`3600`). For WorldEd, 7 days is the right balance between security and UX.

---

## Step 3: Configure Refresh Token Rotation

1. On the same Auth Settings page, find the section labeled **"Sessions"**
2. Look for **"Enable Refresh Token Rotation"**
3. Ensure the toggle is **ON** (this should be the default)
4. Set **"Refresh Token Reuse Interval"** to: **`10`** seconds
5. Click **Save**

### What Is Refresh Token Rotation?

When refresh token rotation is enabled:

```
1. User logs in → gets Access Token + Refresh Token A
2. Access token expires → client sends Refresh Token A to get new tokens
3. Supabase returns new Access Token + Refresh Token B
4. Refresh Token A is now INVALIDATED — it can never be used again
5. Next refresh uses Refresh Token B → gets new tokens + Refresh Token C
6. And so on...
```

### Why This Matters

Without rotation:
```
❌ Attacker steals Refresh Token A
❌ Attacker can keep using it forever to generate new access tokens
❌ Even if user changes password, attacker still has access
```

With rotation:
```
✅ Attacker steals Refresh Token A
✅ Legitimate user's next request also uses Refresh Token A
✅ Supabase detects the reuse → INVALIDATES ALL tokens for that session
✅ Attacker is locked out, user is asked to sign in again
```

### What Is the Reuse Interval?

The **10-second reuse interval** is a grace period. If two requests arrive within 10 seconds using the same refresh token (common with concurrent browser tabs), Supabase won't flag it as a stolen token. This prevents false positives.

---

## Step 4: Configure Session Timebox (Optional)

1. In the Sessions section, find **"Session Timebox"**
2. If available, set to: **`604800`** (7 days)
3. This is the **absolute maximum** session lifetime, regardless of refresh activity

> **Note:** This setting may not be available in all Supabase plans. If absent, sessions are limited by the refresh token expiry (~90 days).

---

## Step 5: Email Template Configuration

While you're in Auth Settings, also configure:

1. **Email Templates** (under Authentication → Email Templates)
   - **Confirm signup** — customize the confirmation email
   - **Reset password** — customize the reset email (this is what the `/reset-password` page triggers)
   - **Magic link** — if you plan to add passwordless login

2. **Redirect URLs** (under Authentication → URL Configuration)
   - Add your callback URL: `http://localhost:3000/auth/reset-callback`
   - For production, add: `https://your-domain.com/auth/reset-callback`

---

## Summary: Recommended Settings

| Setting | Value | Where |
|---------|-------|-------|
| JWT expiry | `604800` (7 days) | Auth Settings → JWT |
| Refresh token rotation | `Enabled` | Auth Settings → Sessions |
| Reuse interval | `10` seconds | Auth Settings → Sessions |
| Session timebox | `604800` (7 days) | Auth Settings → Sessions |
| Email confirmations | As needed | Auth Settings → General |
| Reset password redirect | `http://localhost:3000/auth/reset-callback` | Auth Settings → URL Configuration |

---

## How This Integrates With Our Code

### Middleware (`src/middleware.ts`)
- Creates a Supabase client on every request
- Automatically refreshes tokens via `@supabase/ssr` cookie handling
- Validates user with `getUser()` (server-side JWT verification)
- Redirects unauthenticated users to `/auth`

### Server Components & Actions
- Use `createClient()` from `@/utils/supabase/server`
- Call `supabase.auth.getUser()` to validate sessions
- Never use `getSession()` (it doesn't validate server-side)

### Client Components
- Use `createClient()` from `@/utils/supabase/client`
- `@supabase/ssr` handles token refresh automatically in the background
- No manual refresh code needed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Users keep getting logged out | Check JWT expiry is set to `604800`, not `3600` |
| "Invalid refresh token" errors | Refresh token rotation may be detecting reuse — increase reuse interval to `10` |
| Sessions expire after 1 hour | JWT expiry is still at default `3600` — update in dashboard |
| Token refresh fails silently | Check that middleware is properly setting cookies (see `setAll` in middleware.ts) |
| Auth works locally but not in prod | Ensure redirect URLs are configured for your production domain |
