-- AUTH-001: User profiles extensions + admin permissions + institution extensions
-- Adds multi-role support, main admin tracking, independent students,
-- admin permissions table, institution LCME fields, and assessment_items.is_public.

-- ============================================================================
-- 1. USER PROFILES EXTENSIONS
-- ============================================================================

-- is_main_admin: distinguishes the "main" super admin from delegated ones
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_main_admin BOOLEAN NOT NULL DEFAULT false;

-- additional_roles: secondary roles (e.g., institutional_admin who is also faculty)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS additional_roles TEXT[] NOT NULL DEFAULT '{}';

-- user_type: institutional (invited) vs independent (self-registered)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'institutional';

-- onboarding_data: JSONB storage for per-step onboarding form data
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}';

-- display_name: add NOT NULL default for new profiles (existing NULLs preserved)
-- (display_name already exists, no ALTER needed)

-- Constraints
DO $$ BEGIN
  ALTER TABLE user_profiles
    ADD CONSTRAINT user_type_values CHECK (user_type IN ('institutional', 'independent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for main admin count check (called frequently)
CREATE INDEX IF NOT EXISTS idx_user_profiles_main_admin
  ON user_profiles (is_main_admin, role)
  WHERE is_main_admin = true;

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_institution
  ON user_profiles (role, institution_id);

-- ============================================================================
-- 2. ADMIN PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  user_id                     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_manage_super_admins     BOOLEAN     NOT NULL DEFAULT false,
  can_approve_applications    BOOLEAN     NOT NULL DEFAULT true,
  can_manage_institutions     BOOLEAN     NOT NULL DEFAULT false,
  can_manage_frameworks       BOOLEAN     NOT NULL DEFAULT false,
  can_manage_platform_health  BOOLEAN     NOT NULL DEFAULT true,
  granted_by                  UUID        REFERENCES auth.users(id),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: only superadmins can read admin_permissions
CREATE POLICY admin_permissions_select ON admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- RLS: only main admins can insert
CREATE POLICY admin_permissions_insert ON admin_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
      AND user_profiles.is_main_admin = true
    )
  );

-- RLS: only main admins can update
CREATE POLICY admin_permissions_update ON admin_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
      AND user_profiles.is_main_admin = true
    )
  );

-- ============================================================================
-- 3. INSTITUTIONS EXTENSIONS (LCME fields)
-- ============================================================================
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS lcme_member_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS state_province     TEXT,
  ADD COLUMN IF NOT EXISTS country            CHAR(2) NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS institution_type   TEXT NOT NULL DEFAULT 'medical_school',
  ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'inactive';

DO $$ BEGIN
  ALTER TABLE institutions
    ADD CONSTRAINT institution_status_values
    CHECK (status IN ('inactive', 'pending', 'active', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. ASSESSMENT ITEMS — is_public flag
-- ============================================================================
ALTER TABLE assessment_items
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assessment_items_public
  ON assessment_items (is_public)
  WHERE is_public = true;

-- ============================================================================
-- 5. UPDATE JWT CLAIMS TRIGGER to include new fields
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_jwt_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role',                 NEW.role,
    'institution_id',       NEW.institution_id::text,
    'is_course_director',   NEW.is_course_director,
    'onboarding_completed', NEW.onboarding_completed,
    'is_main_admin',        NEW.is_main_admin,
    'additional_roles',     NEW.additional_roles,
    'user_type',            NEW.user_type
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Backfill existing profiles so new JWT claims are populated
UPDATE public.user_profiles SET updated_at = NOW() WHERE id = id;
