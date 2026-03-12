-- Fix RLS: superadmin bypass on all institution-scoped tables.
-- Superadmin has institution_id = NULL, which fails the institution_isolation policy.
-- Add a permissive policy that grants superadmin full access via JWT claim.

-- Helper: extract role from JWT app_metadata
-- Usage: (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'

-- ── user_profiles ──
-- Ensure self-read policy exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'users_read_own_profile'
  ) THEN
    CREATE POLICY "users_read_own_profile" ON user_profiles
      FOR SELECT USING (id = auth.uid());
  END IF;
END $$;

CREATE POLICY "superadmin_full_access" ON user_profiles
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── institutions ──
CREATE POLICY "superadmin_full_access" ON institutions
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── courses ──
CREATE POLICY "superadmin_full_access" ON courses
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── uploads ──
CREATE POLICY "superadmin_full_access" ON uploads
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── content_chunks ──
CREATE POLICY "superadmin_full_access" ON content_chunks
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── assessment_items ──
CREATE POLICY "superadmin_full_access" ON assessment_items
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── options ──
CREATE POLICY "superadmin_full_access" ON options
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── generation_logs ──
CREATE POLICY "superadmin_full_access" ON generation_logs
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- ── bulk_batches ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bulk_batches') THEN
    EXECUTE 'CREATE POLICY "superadmin_full_access" ON bulk_batches FOR ALL USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''superadmin'')';
  END IF;
END $$;

-- ── bulk_batch_items ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bulk_batch_items') THEN
    EXECUTE 'CREATE POLICY "superadmin_full_access" ON bulk_batch_items FOR ALL USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''superadmin'')';
  END IF;
END $$;

-- ── golden_dataset: fix 'admin' → 'superadmin' ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'golden_dataset' AND policyname = 'admins only') THEN
    DROP POLICY "admins only" ON golden_dataset;
    CREATE POLICY "superadmin_only" ON golden_dataset
      FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');
  END IF;
END $$;
