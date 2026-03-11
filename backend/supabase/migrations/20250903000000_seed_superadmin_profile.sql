-- Seed superadmin profile for the JourneyOS platform account.
-- The superadmin oversees all institutions — no institution_id.
-- Looks up auth.users by email so the migration is idempotent and
-- does not hardcode a UUID that varies across environments.

INSERT INTO user_profiles (id, role, display_name, email, is_course_director, onboarding_completed, onboarding_step)
SELECT
  id,
  'superadmin',
  'JourneyOS Admin',
  'jthorne@msm.edu',
  false,
  true,
  99
FROM auth.users
WHERE email = 'jthorne@msm.edu'
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  onboarding_completed = true,
  onboarding_step = 99;
