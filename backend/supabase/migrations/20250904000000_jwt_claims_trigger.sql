-- JWT Claims Trigger
-- Fires on INSERT/UPDATE of user_profiles and writes role, institution_id,
-- is_course_director, onboarding_completed into auth.users.raw_app_meta_data.
-- These values travel in every Supabase JWT automatically.

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
    'onboarding_completed', NEW.onboarding_completed
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_upsert ON public.user_profiles;
CREATE TRIGGER on_profile_upsert
  AFTER INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_jwt_claims();

-- Backfill: run the trigger logic for all existing profiles so current users
-- get claims in their JWT on next session refresh.
UPDATE public.user_profiles SET updated_at = NOW() WHERE id = id;
