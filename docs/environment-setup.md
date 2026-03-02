# Environment Setup Guide

This guide explains how to configure all environment variables for the WorldEd platform.

---

## Quick Start

```bash
# Copy the example file
cp .env.example .env

# Fill in your values (see instructions below)
nano .env   # or open in your editor
```

---

## Variable Reference

### `DATABASE_URL`

**What:** PostgreSQL connection string for Drizzle ORM.

**Where to find it:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your WorldEd project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
5. **Important:** Use the **Transaction (port 6543)** pooler for Next.js serverless

**Format:**
```
postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Security:**
- ❌ NEVER commit this to git
- ❌ NEVER expose in client-side code (no `NEXT_PUBLIC_` prefix)
- ✅ Only used server-side by Drizzle ORM

---

### `NEXT_PUBLIC_SUPABASE_URL`

**What:** Your Supabase project URL. Used by both client and server Supabase clients.

**Where to find it:**
1. Supabase Dashboard → **Settings** → **API**
2. Copy the **Project URL**

**Format:**
```
https://[project-ref].supabase.co
```

**Security:**
- ✅ Safe to expose publicly (it's a project identifier, not a secret)
- The `NEXT_PUBLIC_` prefix makes it available in client-side code

---

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**What:** Supabase anonymous/public API key. Used for unauthenticated operations and client-side initialization.

**Where to find it:**
1. Supabase Dashboard → **Settings** → **API**
2. Copy the **anon / public** key (NOT the service_role key)

**Security:**
- ✅ Safe to expose publicly — it's designed for client-side use
- ❌ Row Level Security (RLS) must be enabled on all tables to restrict access
- ❌ NEVER use the `service_role` key here — it bypasses RLS

---

### `GOOGLE_GENERATIVE_AI_API_KEY`

**What:** API key for Google's Gemini AI, used by the Eddi chatbot.

**Where to get it:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

**Security:**
- ❌ NEVER commit to git
- ❌ No `NEXT_PUBLIC_` prefix — server-side only
- ✅ Only used in `/api/eddi/chat/route.ts`

---

### `NEXT_PUBLIC_SITE_URL`

**What:** The public URL of your application. Used for constructing callback URLs (e.g., password reset redirects).

**Values:**
| Environment | Value |
|-------------|-------|
| Development | `http://localhost:3000` |
| Production | `https://your-domain.com` |

**Used in:**
- Password reset redirect URL (`/api/auth/request-reset`)

---

### `NODE_ENV`

**What:** Standard Node.js environment flag. Controls error verbosity, test routes, and logging behavior.

**Values:**
| Value | Behavior |
|-------|----------|
| `development` | Verbose error messages (scrubbed), test routes enabled, auth logging |
| `production` | Generic errors only, test routes disabled, minimal logging |

**Usually set automatically** by your deployment platform (Vercel, Railway, etc.).

---

## Production Deployment Checklist

Before deploying, ensure:

1. [ ] `DATABASE_URL` points to your production database
2. [ ] `NEXT_PUBLIC_SUPABASE_URL` points to your production Supabase project
3. [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the production anon key
4. [ ] `GOOGLE_GENERATIVE_AI_API_KEY` has appropriate quota for production traffic
5. [ ] `NEXT_PUBLIC_SITE_URL` is set to your production domain
6. [ ] `NODE_ENV` is set to `production`
7. [ ] All secrets are set via your hosting provider's environment variable UI (not in files)

---

## Validation

Run the application and check for startup errors:

```bash
npm run dev
```

If any required variable is missing, you'll see errors like:
- `DATABASE_URL is not set` — from `src/db/index.ts`
- Connection timeout — wrong `DATABASE_URL` format or credentials
- `Invalid API key` — wrong Supabase keys
