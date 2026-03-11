/**
 * Run once at deploy time to create the first main super admin.
 * Usage: pnpm tsx backend/src/scripts/seed-main-admin.ts --email jthorne@msm.edu
 *
 * This script:
 * 1. Creates a Supabase auth.users record via invite
 * 2. Creates user_profiles with is_main_admin=true
 * 3. Creates admin_permissions with all permissions=true
 * 4. Fires the "set up your account" invite email
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    'with-institutions': { type: 'boolean', default: false },
  },
});

if (!values.email) {
  console.error('Usage: pnpm tsx backend/src/scripts/seed-main-admin.ts --email <email>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  console.log(`Creating main admin: ${values.email}`);

  // Check no main admin already exists
  const { count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_main_admin', true);

  if ((count ?? 0) > 0) {
    console.error('A main admin already exists. Use grant-main-admin.ts to add another.');
    process.exit(1);
  }

  // Create auth user and fire setup email
  const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    values.email!,
    {
      data: {
        role: 'superadmin',
        additional_roles: [],
        is_main_admin: true,
        user_type: 'institutional',
      },
    },
  );

  if (authError || !authUser.user) {
    console.error('Failed to create auth user:', authError);
    process.exit(1);
  }

  const userId = authUser.user.id;

  // Create user_profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: values.email,
      display_name: '',
      role: 'superadmin',
      additional_roles: [],
      is_main_admin: true,
      user_type: 'institutional',
      is_course_director: false,
      institution_id: null,
      onboarding_completed: false,
      onboarding_step: 0,
      onboarding_data: {},
    });

  if (profileError) {
    console.error('Failed to create user profile:', profileError);
    process.exit(1);
  }

  // Create admin_permissions (all true for main admin)
  const { error: permError } = await supabase
    .from('admin_permissions')
    .insert({
      user_id: userId,
      can_manage_super_admins: true,
      can_approve_applications: true,
      can_manage_institutions: true,
      can_manage_frameworks: true,
      can_manage_platform_health: true,
      granted_by: userId,
    });

  if (permError) {
    console.error('Failed to create admin permissions:', permError);
    process.exit(1);
  }

  console.log(`Main admin created: ${values.email}`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Setup email sent. They should receive it within 2 minutes.`);
  console.log(`  On first login they will be routed to /onboarding/super-admin`);

  if (values['with-institutions']) {
    console.log('\nSeeding LCME institutions...');
    const { seedInstitutions } = await import('./seed-lcme-institutions.js');
    await seedInstitutions(supabase);
  }
}

run().catch(console.error);
