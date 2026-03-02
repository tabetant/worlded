# Role-Based Access Control (RBAC) — WorldEd

## Overview

WorldEd uses a database-backed RBAC system with **three roles**:

| Role      | Level | Description                        |
|-----------|-------|------------------------------------|
| `student` | 0     | Default for all users              |
| `mentor`  | 1     | Can manage courses & view students |
| `admin`   | 2     | Full platform access               |

Roles are stored in the `users` table's `role` column (Postgres enum: `user_role`), and
the user is authenticated via **Supabase Auth**.

---

## Setting a User's Role

### Option 1: Supabase Dashboard (SQL Editor)

```sql
-- Promote a user to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Promote a user to mentor
UPDATE users SET role = 'mentor' WHERE email = 'mentor@example.com';

-- Demote back to student
UPDATE users SET role = 'student' WHERE email = 'user@example.com';
```

### Option 2: Server Action (programmatic)

```typescript
import { updateUserRole } from '@/app/actions/admin'

// Only works if the caller is an admin
await updateUserRole(targetUserId, 'mentor')
```

---

## Protecting Routes (Server Components)

Use `requireRole()`, `requireAdmin()`, or `requireMentor()` at the top of a
server component. If the user doesn't have the right role, they are **redirected**.

```tsx
// app/admin/page.tsx
import { requireAdmin } from '@/lib/auth/roles'

export default async function AdminPage() {
    await requireAdmin()    // redirects to '/' if not admin
    // ... admin-only content
}
```

```tsx
// app/mentor/dashboard/page.tsx
import { requireMentor } from '@/lib/auth/roles'

export default async function MentorDashboard() {
    await requireMentor()   // redirects to '/' if not mentor or admin
    // ... mentor content
}
```

Custom redirect destination:

```tsx
await requireRole(['admin', 'mentor'], '/dashboard')
```

---

## Protecting Server Actions

Use `requireRoleInAction()` inside server actions. It **throws** an error
instead of redirecting (because server actions cannot redirect).

```typescript
'use server'
import { requireRoleInAction } from '@/lib/auth/roles'

export async function deleteUser(userId: string) {
    await requireRoleInAction('admin')
    // ... delete logic
}

export async function updateCourse(courseId: string, data: { title: string }) {
    await requireRoleInAction(['mentor', 'admin'])
    // ... update logic
}
```

Handle the error on the client:

```tsx
try {
    await deleteUser(userId)
} catch (e) {
    // e.message === "Forbidden: requires role admin"
    toast.error("You don't have permission to do that.")
}
```

---

## Conditional UI Rendering

### In Server Components

```tsx
import { isAdmin, isMentor, getUserRole } from '@/lib/auth/roles'

export default async function SomePage() {
    const admin = await isAdmin()
    const mentor = await isMentor()   // true for mentors AND admins
    const role = await getUserRole()  // 'student' | 'mentor' | 'admin'

    return (
        <>
            {admin && <AdminPanel />}
            {mentor && <MentorTools />}
            <p>Your role: {role}</p>
        </>
    )
}
```

### In Client Components (via props)

Since role checks must happen server-side, pass results as props:

```tsx
// layout.tsx (server component)
import { isAdmin } from '@/lib/auth/roles'

export default async function Layout({ children }) {
    const admin = await isAdmin()
    return <AppShell isAdmin={admin}>{children}</AppShell>
}

// AppShell.tsx (client component)
export function AppShell({ children, isAdmin }) {
    return (
        <nav>
            {isAdmin && <Link href="/admin">Admin Dashboard</Link>}
        </nav>
    )
}
```

---

## API Reference

### `/lib/auth/roles.ts`

| Function               | Returns          | Use Case                                   |
|------------------------|------------------|--------------------------------------------|
| `getUserRole()`        | `UserRole`       | Get current user's role                    |
| `hasRole(role)`        | `boolean`        | Check exact role match                     |
| `hasMinimumRole(role)` | `boolean`        | Check role >= level (e.g. mentor includes admin) |
| `requireRole(role)`    | `void` (redirect)| Protect server components                  |
| `requireAdmin()`       | `void` (redirect)| Shorthand for requireRole('admin')         |
| `requireMentor()`      | `void` (redirect)| Shorthand for requireRole(['mentor','admin']) |
| `requireRoleInAction()`| `void` (throw)   | Protect server actions                     |
| `isAdmin()`            | `boolean`        | Boolean check                              |
| `isMentor()`           | `boolean`        | Boolean check (includes admins)            |
| `isAuthenticated()`    | `boolean`        | Is the user logged in?                     |

---

## Security Notes

1. **All role checks are server-side** — never trust client-side role data
2. `getUser()` is used instead of `getSession()` to validate the JWT server-side
3. Roles default to `'student'` if not set in the database
4. The `requireMentor()` guard allows **both** mentors and admins through
5. `requireRoleInAction()` throws errors (not redirects) because server actions
   cannot perform redirects
