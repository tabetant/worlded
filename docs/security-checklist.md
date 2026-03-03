# WorldEd Security Checklist

> Last updated: 2026-03-02
>
> This document tracks all security features implemented in the WorldEd platform.
> Use this as a pre-deployment review and ongoing reference.

---

## ✅ Implemented

### Authentication & Session Management

- [x] Supabase Auth with JWT (RS256)
- [x] 1-hour access token expiry (configurable in Supabase Dashboard)
- [x] 7-day session timebox (maximum session duration)
- [x] Refresh token rotation (single-use tokens, old ones invalidated)
- [x] Server-side session validation via `getUser()` (not `getSession()`)
- [x] HTTP-only cookies for token storage (via `@supabase/ssr`)
- [x] Password reset with rate limiting (3 requests/hour/email)
- [x] Anti-enumeration on password reset (generic success message always returned)

### Role-Based Access Control (RBAC)

- [x] Three roles: `student` (default), `mentor`, `admin`
- [x] Roles stored in database (`users.role` column)
- [x] `requireRole()` / `requireAdmin()` / `requireMentor()` for server components
- [x] `requireRoleInAction()` for server actions (throws instead of redirect)
- [x] Role hierarchy (`hasMinimumRole()` — admin inherits mentor permissions)
- [x] Conditional UI rendering based on role (admin nav link)
- [x] Protected admin route (`/admin` — redirects non-admins)

### Middleware & Route Protection

- [x] All routes protected by default (redirect to `/auth` if unauthenticated)
- [x] Explicit `PUBLIC_ROUTES` whitelist (`/auth`, `/reset-password`, `/`)
- [x] API routes excluded from redirect (they have their own auth checks)
- [x] Static assets excluded from auth checks

### API Security

- [x] CORS protection with origin whitelist (`ALLOWED_ORIGINS`)
- [x] Preflight (OPTIONS) handling with max-age caching
- [x] CORS violation logging (server-side)
- [x] Rate limiting — 3 requests/email/hour for password reset
- [x] Auto-cleanup of expired rate limit records (every 10 minutes)
- [x] Input validation with Zod on all API endpoints
- [x] Sanitized error responses (`errorResponse()` — no raw errors to client)
- [x] `Retry-After` header on 429 responses

### Error Handling & Data Protection

- [x] Centralized error sanitizer (`sanitizeError()`)
- [x] Production: only generic errors shown to users
- [x] Development: messages scrubbed of sensitive patterns (passwords, SQL, file paths)
- [x] `safeActionError()` for server actions (logs full error, throws sanitized)
- [x] Sensitive pattern regex list (15+ patterns)
- [x] Structured server-side error logging (context, timestamp, stack)
- [x] Custom error boundary (`error.tsx`) — never shows `error.message`
- [x] Custom 404 page (`not-found.tsx`)
- [x] Dev-only error test route (`/api/test/error`)

### Redirect Validation

- [x] `safeRedirect()` utility validates all `router.push()` destinations
- [x] Allowlisted path prefixes (`ALLOWED_PATH_PREFIXES`)
- [x] Allowlisted external domains (`ALLOWED_DOMAINS`)
- [x] Fallback to `/dashboard` for invalid URLs
- [x] Applied across: AuthForm, SearchBar, Dashboard, Support, TicketSubmission, LoginForm, EddiChat

### Data Security

- [x] User data isolation (all queries filtered by `userId`)
- [x] Parameterized database queries via Drizzle ORM (SQL injection prevention)
- [x] Supabase Row Level Security (RLS) on tables
- [x] Secure cookie flags handled by Supabase SSR
- [x] Environment variables for all secrets (never hardcoded)

### Monitoring & Logging

- [x] Server-side error logging with structured context
- [x] Password reset attempt logging (email, timestamp, IP, allowed/blocked)
- [x] CORS violation logging
- [x] Unauthenticated access attempt logging (development mode)
- [x] Rate limit violation logging

---

## 🔄 To Configure Before Production

- [ ] Update `ALLOWED_ORIGINS` in `middleware.ts` with production domain
- [ ] Update `ALLOWED_DOMAINS` in `redirect-validator.ts` with production domain
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production URL
- [ ] Set `NODE_ENV=production` in deployment environment
- [ ] Configure Supabase production project (separate from development)
- [ ] Set JWT expiry to `3600` in Supabase Dashboard → Auth → Settings
- [ ] Set session timebox to `604800` in Supabase Dashboard → Auth → Settings
- [ ] Verify refresh token rotation is enabled in Supabase Dashboard
- [ ] Set up error monitoring service (Sentry, LogRocket, or similar)
- [ ] Enable HTTPS enforcement (via hosting provider)
- [ ] Review and remove all `TODO` comments in code
- [ ] Set up database backups in Supabase
- [ ] Configure rate limiting for production (consider Redis instead of in-memory)
- [ ] Set up CSP (Content Security Policy) headers
- [ ] Apply RLS policies from `docs/supabase-rls.md` to all tables
- [ ] Configure email templates in Supabase Dashboard
- [ ] Add password reset redirect URL in Supabase → Auth → URL Configuration

---

## 🧪 Testing Checklist

### Authentication

- [ ] User can sign up, receive confirmation, and sign in
- [ ] User is redirected to `/auth` when visiting protected routes
- [ ] User stays logged in after page refresh (session persistence)
- [ ] User is logged out after 7 days of inactivity (session timebox)
- [ ] Token automatically refreshes on activity (check `TOKEN_REFRESHED` events)
- [ ] User is logged out when both access and refresh tokens expire
- [ ] Password reset flow works end-to-end

### CORS

- [ ] Requests from `localhost:3000` are allowed
- [ ] Requests from unknown origins return 403
- [ ] Preflight OPTIONS requests are handled correctly

### Rate Limiting

- [ ] 3 password reset requests succeed
- [ ] 4th request within 1 hour returns 429
- [ ] After 1 hour, requests are allowed again
- [ ] Rate limit countdown (`retryAfter`) is accurate

### RBAC

- [ ] Non-admin users cannot access `/admin` (redirected)
- [ ] Admin-only server actions throw for non-admins
- [ ] Mentor actions allow both mentors and admins
- [ ] Admin nav link only appears for admin users

### Error Handling

- [ ] API errors return generic messages (no stack traces)
- [ ] Server action errors are sanitized
- [ ] Error boundary catches and displays friendly page
- [ ] 404 page shows for invalid routes
- [ ] `/api/test/error?type=db` does NOT expose database credentials
- [ ] `/api/test/error?type=sql` does NOT expose SQL queries
- [ ] Console logs show full error details server-side

### Redirect Validation

- [ ] `safeRedirect('https://evil.com')` falls back to `/dashboard`
- [ ] `safeRedirect('/dashboard')` works normally
- [ ] All `router.push()` calls use `safeRedirect()`

---

## 📝 Security Best Practices Followed

| Principle | Implementation |
|-----------|---------------|
| Never trust client input | Zod validation on all API endpoints |
| Always validate and sanitize | `sanitizeError()`, `safeRedirect()` |
| Fail securely (deny by default) | All routes protected unless in `PUBLIC_ROUTES` |
| Log security events | Structured logging for auth, CORS, rate limits, errors |
| Use environment variables for secrets | All keys in `.env`, never in code |
| Principle of least privilege | RBAC roles, default `student` role |
| Keep dependencies updated | Regular `npm audit` recommended |
| Validate server-side | `getUser()` instead of `getSession()` |
| Defense in depth | Middleware + route guards + action guards + UI checks |

---

## 📁 Security File Index

| File | Purpose |
|------|---------|
| `src/middleware.ts` | CORS, session refresh, route protection |
| `src/lib/auth/roles.ts` | RBAC utilities (role checks, guards) |
| `src/lib/security/rate-limiter.ts` | In-memory rate limiting |
| `src/lib/security/redirect-validator.ts` | Redirect URL validation |
| `src/lib/errors/error-handler.ts` | Error sanitization |
| `src/app/error.tsx` | Error boundary (UI) |
| `src/app/not-found.tsx` | 404 page (UI) |
| `src/app/api/test/error/route.ts` | Error sanitization test (dev only) |
| `src/lib/auth/session-config.md` | JWT/session configuration guide |
| `src/lib/auth/supabase-jwt-config.md` | Step-by-step Supabase Dashboard JWT setup |
| `src/lib/auth/token-refresh.md` | Token refresh documentation |
| `src/lib/auth/session.ts` | Server-side session helpers |
| `src/lib/auth/roles.md` | RBAC usage documentation |
| `docs/security-checklist.md` | This file |
| `docs/environment-setup.md` | Environment variable documentation |
| `docs/supabase-rls.md` | Row Level Security policies and SQL |
