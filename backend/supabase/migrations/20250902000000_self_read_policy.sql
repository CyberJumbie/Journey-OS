-- Allow any authenticated user to read their own profile row.
-- Fixes: superadmin (institution_id = NULL) blocked by institution_isolation policy.
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());
