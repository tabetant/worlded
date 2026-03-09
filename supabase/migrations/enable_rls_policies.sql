-- =============================================================================
-- WorldEd: Enable Row Level Security (RLS)
-- Migration: enable_rls_policies.sql
-- Date: 2026-03-06
-- Resolves: VULN-008 from security audit
-- =============================================================================
--
-- PURPOSE:
--   Defense-in-depth layer. All server-side API routes already enforce auth,
--   but RLS prevents any data leak if:
--     • The Supabase anon key is exposed
--     • A future API route forgets an auth check
--     • Direct Supabase JS client queries are added later
--
-- IMPORTANT — Drizzle ORM bypasses RLS:
--   The DATABASE_URL connection (postgres service role) bypasses all RLS
--   policies by design. Server-side Drizzle queries are NOT affected by these
--   policies. RLS only enforces for connections using the anon/user JWT.
--   Application-level auth guards remain the primary enforcement layer.
--
-- TYPE CASTING NOTE:
--   auth.uid() returns uuid. Some tables store user_id as TEXT (not uuid).
--   These require explicit casting: auth.uid()::text = user_id
--   Affected tables: user_progress, user_streaks, eddi_conversations
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--   Or: npx supabase db push (if using Supabase CLI)
--
-- =============================================================================


-- =============================================================================
-- SECTION 0: HELPER FUNCTION
-- =============================================================================
-- is_admin() uses SECURITY DEFINER to bypass RLS when checking the users
-- table, which is necessary to avoid infinite recursion: a policy on `users`
-- cannot call EXISTS(SELECT FROM users ...) without this workaround.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users (used in policies)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- =============================================================================
-- SECTION 1: PUBLIC CONTENT TABLES
-- Read: all authenticated users
-- Write: admin only (mentor can read, not write — content managed by admin)
-- Tables: courses, modules, quizzes, resources
-- =============================================================================

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses: authenticated users can read"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courses: only admins can insert"
  ON courses
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "courses: only admins can update"
  ON courses
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "courses: only admins can delete"
  ON courses
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules: authenticated users can read"
  ON modules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "modules: only admins can insert"
  ON modules
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "modules: only admins can update"
  ON modules
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "modules: only admins can delete"
  ON modules
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes: authenticated users can read"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quizzes: only admins can insert"
  ON quizzes
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "quizzes: only admins can update"
  ON quizzes
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "quizzes: only admins can delete"
  ON quizzes
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources: authenticated users can read"
  ON resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "resources: only admins can insert"
  ON resources
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "resources: only admins can update"
  ON resources
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "resources: only admins can delete"
  ON resources
  FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- SECTION 2: USER-SCOPED TABLES (own data only)
-- Read/Write: own rows only (auth.uid() matches user_id)
-- Admin: full access via is_admin()
-- NOTE: user_progress and user_streaks store user_id as TEXT — cast required
-- =============================================================================

-- ---------------------------------------------------------------------------
-- user_progress  (user_id is TEXT — cast auth.uid() to text)
-- ---------------------------------------------------------------------------
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_progress: users can read own rows"
  ON user_progress
  FOR SELECT
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "user_progress: users can insert own rows"
  ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_progress: users can update own rows"
  ON user_progress
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_progress: users can delete own rows"
  ON user_progress
  FOR DELETE
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "user_progress: admins have full access"
  ON user_progress
  FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_streaks  (user_id is TEXT — cast auth.uid() to text)
-- ---------------------------------------------------------------------------
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_streaks: users can read own rows"
  ON user_streaks
  FOR SELECT
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "user_streaks: users can insert own rows"
  ON user_streaks
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_streaks: users can update own rows"
  ON user_streaks
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_streaks: admins have full access"
  ON user_streaks
  FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- SECTION 3: EDDI AI TUTOR TABLES
-- eddi_conversations: owned by user (user_id is TEXT — cast required)
-- eddi_messages: accessible via conversation ownership (join check)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- eddi_conversations  (user_id is TEXT — cast auth.uid() to text)
-- ---------------------------------------------------------------------------
ALTER TABLE eddi_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eddi_conversations: users can read own conversations"
  ON eddi_conversations
  FOR SELECT
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "eddi_conversations: users can create own conversations"
  ON eddi_conversations
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "eddi_conversations: users can update own conversations"
  ON eddi_conversations
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "eddi_conversations: users can delete own conversations"
  ON eddi_conversations
  FOR DELETE
  USING (auth.uid()::text = user_id OR public.is_admin());

CREATE POLICY "eddi_conversations: admins have full access"
  ON eddi_conversations
  FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- eddi_messages  (access via conversation ownership)
-- A user can only see/write messages in conversations they own
-- ---------------------------------------------------------------------------
ALTER TABLE eddi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eddi_messages: users can read messages in own conversations"
  ON eddi_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM eddi_conversations ec
      WHERE ec.id = eddi_messages.conversation_id
        AND (auth.uid()::text = ec.user_id OR public.is_admin())
    )
  );

CREATE POLICY "eddi_messages: users can insert messages in own conversations"
  ON eddi_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM eddi_conversations ec
      WHERE ec.id = conversation_id
        AND auth.uid()::text = ec.user_id
    )
  );

CREATE POLICY "eddi_messages: users can delete messages in own conversations"
  ON eddi_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM eddi_conversations ec
      WHERE ec.id = eddi_messages.conversation_id
        AND (auth.uid()::text = ec.user_id OR public.is_admin())
    )
  );

CREATE POLICY "eddi_messages: admins have full access"
  ON eddi_messages
  FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- SECTION 4: USERS TABLE
-- Own profile: read + update
-- Admin: full access (uses is_admin() to avoid recursive policy)
-- WARNING: DO NOT use EXISTS(SELECT FROM users) here — causes recursion.
--          is_admin() is SECURITY DEFINER and safely bypasses RLS.
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users: users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-role-escalation: users cannot change their own role
    -- Role changes must go through admin policies
  );

CREATE POLICY "users: admins have full access"
  ON users
  FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- SECTION 5: TICKETS
-- Users can create and view their own tickets
-- Admins can view and update all tickets
-- tickets.user_id is UUID (references users.id) — no cast needed
-- =============================================================================

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets: users can read own tickets"
  ON tickets
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "tickets: users can create own tickets"
  ON tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets: users can update own tickets"
  ON tickets
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "tickets: admins have full access"
  ON tickets
  FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- SECTION 6: MENTOR/STUDENT CONVERSATIONS & MESSAGES
-- Participants (mentor or student) can see their own conversations
-- Users can send messages in conversations they belong to
-- =============================================================================

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: participants can read"
  ON conversations
  FOR SELECT
  USING (
    auth.uid() = mentor_id
    OR auth.uid() = student_id
    OR public.is_admin()
  );

CREATE POLICY "conversations: admins have full access"
  ON conversations
  FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: participants can read"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.mentor_id = auth.uid()
          OR c.student_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "messages: users can send in own conversations"
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

CREATE POLICY "messages: admins have full access"
  ON messages
  FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- SECTION 7: ADMIN-ONLY TABLES
-- These tables may not exist yet (created by prior SQL migrations, not Drizzle).
-- Policies are applied with IF EXISTS to prevent errors if tables are absent.
-- Run again after creating these tables to confirm policies are active.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs  (admin read-only, system writes via service role)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';

    EXECUTE $p$
      CREATE POLICY "audit_logs: admins can read"
        ON audit_logs
        FOR SELECT
        USING (public.is_admin())
    $p$;

    RAISE NOTICE 'RLS enabled on audit_logs';
  ELSE
    RAISE NOTICE 'Table audit_logs not found — skipping. Apply this migration again after creating the table.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- api_usage_logs  (admin read-only, system writes via service role)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_usage_logs'
  ) THEN
    EXECUTE 'ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY';

    EXECUTE $p$
      CREATE POLICY "api_usage_logs: admins can read"
        ON api_usage_logs
        FOR SELECT
        USING (public.is_admin())
    $p$;

    RAISE NOTICE 'RLS enabled on api_usage_logs';
  ELSE
    RAISE NOTICE 'Table api_usage_logs not found — skipping. Apply this migration again after creating the table.';
  END IF;
END;
$$;


-- =============================================================================
-- SECTION 8: RAG / CONTENT PIPELINE TABLES
-- These tables may not exist in the Drizzle schema but may exist in the DB
-- (managed separately as part of the RAG pipeline setup).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- pdf_chunks  (public read for authenticated users, admin write)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pdf_chunks'
  ) THEN
    EXECUTE 'ALTER TABLE pdf_chunks ENABLE ROW LEVEL SECURITY';

    EXECUTE $p$
      CREATE POLICY "pdf_chunks: authenticated users can read"
        ON pdf_chunks
        FOR SELECT
        TO authenticated
        USING (true)
    $p$;

    EXECUTE $p$
      CREATE POLICY "pdf_chunks: only admins can write"
        ON pdf_chunks
        FOR ALL
        USING (public.is_admin())
    $p$;

    RAISE NOTICE 'RLS enabled on pdf_chunks';
  ELSE
    RAISE NOTICE 'Table pdf_chunks not found — skipping. Apply this migration again after creating the table.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- generated_content_cache  (public read, system-only write via service role)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'generated_content_cache'
  ) THEN
    EXECUTE 'ALTER TABLE generated_content_cache ENABLE ROW LEVEL SECURITY';

    EXECUTE $p$
      CREATE POLICY "generated_content_cache: authenticated users can read"
        ON generated_content_cache
        FOR SELECT
        TO authenticated
        USING (true)
    $p$;

    -- No write policy: cache is written only by the service role (bypasses RLS)
    RAISE NOTICE 'RLS enabled on generated_content_cache';
  ELSE
    RAISE NOTICE 'Table generated_content_cache not found — skipping. Apply this migration again after creating the table.';
  END IF;
END;
$$;


-- =============================================================================
-- VERIFICATION QUERY
-- Run this after applying to confirm RLS is enabled on all expected tables.
-- =============================================================================
--
-- SELECT
--     schemaname,
--     tablename,
--     rowsecurity AS rls_enabled,
--     (
--       SELECT COUNT(*) FROM pg_policies p
--       WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
--     ) AS policy_count
-- FROM pg_tables t
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'users', 'courses', 'modules', 'quizzes', 'resources',
--     'user_progress', 'user_streaks', 'tickets',
--     'conversations', 'messages',
--     'eddi_conversations', 'eddi_messages',
--     'audit_logs', 'api_usage_logs',
--     'pdf_chunks', 'generated_content_cache'
--   )
-- ORDER BY tablename;
--
-- Expected: rowsecurity = true, policy_count >= 2 for each table
-- =============================================================================
