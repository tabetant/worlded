# Supabase Row Level Security (RLS) Policies

> **RLS ensures that users can only access their own data at the database level,
> even if application code has a bug.** This is defense-in-depth.

---

## Overview

Supabase uses PostgreSQL's Row Level Security to restrict data access per-user.
When RLS is enabled on a table, **no rows are visible** unless a policy explicitly
grants access. This means even a misconfigured API route cannot leak another
user's data.

### How It Works

```
Client request → Supabase API → PostgreSQL checks RLS policies → returns only allowed rows
```

The `auth.uid()` function returns the authenticated user's ID from the JWT,
which PostgreSQL uses to filter rows.

---

## Current Tables and Their RLS Policies

### User-Owned Tables (Data Isolation)

These tables contain per-user data. Users should only see their own records.

#### `user_progress`

```sql
-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
    ON user_progress
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
    ON user_progress
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON user_progress
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
    ON user_progress
    FOR DELETE
    USING (auth.uid()::text = user_id);
```

#### `user_streaks`

```sql
-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view own streak"
    ON user_streaks
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can insert their own streak
CREATE POLICY "Users can insert own streak"
    ON user_streaks
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own streak
CREATE POLICY "Users can update own streak"
    ON user_streaks
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
```

#### `tickets`

```sql
-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets"
    ON tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets
CREATE POLICY "Users can update own tickets"
    ON tickets
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can update all tickets (change status, assign, etc.)
CREATE POLICY "Admins can update all tickets"
    ON tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );
```

#### `users`

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (bio, education_level)
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can update all users (role changes, etc.)
CREATE POLICY "Admins can update all users"
    ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users AS u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );
```

---

### Public Content Tables (Read-Only for All Authenticated Users)

These tables contain course content. All authenticated users can read them,
but only admins/mentors can modify them.

#### `courses`

```sql
-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view courses
CREATE POLICY "Authenticated users can view courses"
    ON courses
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins and mentors can insert courses
CREATE POLICY "Admins and mentors can insert courses"
    ON courses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'mentor')
        )
    );

-- Only admins and mentors can update courses
CREATE POLICY "Admins and mentors can update courses"
    ON courses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'mentor')
        )
    );

-- Only admins can delete courses
CREATE POLICY "Only admins can delete courses"
    ON courses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );
```

#### `modules`

```sql
-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view modules
CREATE POLICY "Authenticated users can view modules"
    ON modules
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins and mentors can modify modules
CREATE POLICY "Admins and mentors can modify modules"
    ON modules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'mentor')
        )
    );
```

#### `quizzes`

```sql
-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view quizzes
CREATE POLICY "Authenticated users can view quizzes"
    ON quizzes
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins and mentors can modify quizzes
CREATE POLICY "Admins and mentors can modify quizzes"
    ON quizzes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'mentor')
        )
    );
```

#### `resources`

```sql
-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view resources
CREATE POLICY "Authenticated users can view resources"
    ON resources
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins and mentors can modify resources
CREATE POLICY "Admins and mentors can modify resources"
    ON resources
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'mentor')
        )
    );
```

---

### Messaging Tables

#### `conversations`

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations"
    ON conversations
    FOR SELECT
    USING (
        auth.uid() = mentor_id OR auth.uid() = student_id
    );
```

#### `messages`

```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
    ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.mentor_id = auth.uid() OR c.student_id = auth.uid())
        )
    );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
    ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.mentor_id = auth.uid() OR c.student_id = auth.uid())
        )
    );
```

---

## Applying RLS Policies

### Option 1: Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Paste the SQL blocks above
3. Click **Run**

### Option 2: Migration File

Create a migration file at `supabase/migrations/XXX_enable_rls.sql`:

```sql
-- Combine all the policies above into a single migration file
-- Run with: npx supabase db push
```

---

## Important Notes

### Why `auth.uid()::text` for some tables?

The `user_progress` and `user_streaks` tables use `text` for `user_id` (not `uuid`).
Supabase's `auth.uid()` returns a `uuid`, so we need to cast it to `text` for comparison:

```sql
USING (auth.uid()::text = user_id)  -- text column
USING (auth.uid() = user_id)        -- uuid column
```

### Service Role Key Bypasses RLS

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. This is by design —
use it only for admin operations (migrations, seeding, background jobs).

**Never expose the service role key to the client.**

### Testing RLS

To verify RLS is working:

1. Enable RLS on a table
2. Try to query it with the anon key (should return empty if no `SELECT` policy)
3. Sign in as a user
4. Query — should only return that user's rows
5. Try to insert a row with a different `user_id` — should be denied

### Drizzle ORM and RLS

Our Drizzle queries go through the Supabase connection which respects RLS.
However, if you use `DATABASE_URL` directly (bypassing Supabase), RLS policies
are NOT enforced. This is why:

- API routes should use `createClient()` from `@/utils/supabase/server`
- Direct `db` queries from Drizzle bypass RLS — ensure you always filter by `userId` in application code as a backup

---

## RLS Status Checklist

| Table | RLS Enabled | SELECT | INSERT | UPDATE | DELETE |
|-------|:-----------:|:------:|:------:|:------:|:------:|
| `users` | ☐ | Own + Admin | — | Own + Admin | Admin |
| `user_progress` | ☐ | Own | Own | Own | Own |
| `user_streaks` | ☐ | Own | Own | Own | — |
| `tickets` | ☐ | Own + Admin | Own | Own + Admin | — |
| `courses` | ☐ | All auth | Admin/Mentor | Admin/Mentor | Admin |
| `modules` | ☐ | All auth | Admin/Mentor | Admin/Mentor | Admin/Mentor |
| `quizzes` | ☐ | All auth | Admin/Mentor | Admin/Mentor | Admin/Mentor |
| `resources` | ☐ | All auth | Admin/Mentor | Admin/Mentor | Admin/Mentor |
| `conversations` | ☐ | Participants | — | — | — |
| `messages` | ☐ | Participants | Sender in convo | — | — |

> Check each box (☐ → ☑) after applying the policy in the Supabase Dashboard or via migration.
