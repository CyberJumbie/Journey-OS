/**
 * Seed test users for all roles.
 * Run: npx tsx backend/src/scripts/seed-test-users.ts
 *
 * Creates auth users via Supabase admin API + user_profiles rows.
 * The sync_jwt_claims trigger auto-populates JWT app_metadata.
 *
 * All test users use the password: TestPass123!
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenvConfig({ path: resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_PASSWORD = 'TestPass123!';

interface TestUser {
  email: string;
  display_name: string;
  role: string;
  institution_id: string | null;
  is_course_director: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
}

async function ensureInstitution(): Promise<string> {
  // Check if MSM institution exists
  const { data: existing } = await supabase
    .from('institutions')
    .select('id')
    .eq('slug', 'msm')
    .single();

  if (existing) return existing.id;

  // Create it
  const { data: created, error } = await supabase
    .from('institutions')
    .insert({ name: 'Morehouse School of Medicine', slug: 'msm' })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create institution: ${error.message}`);
  return created!.id;
}

async function createTestUser(user: TestUser): Promise<void> {
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === user.email);

  let userId: string;

  if (existingUser) {
    console.log(`  ↳ Auth user exists: ${user.email}`);
    userId = existingUser.id;
  } else {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      console.error(`  ✗ Failed to create auth user ${user.email}: ${authError.message}`);
      return;
    }
    userId = authData.user.id;
    console.log(`  ✓ Created auth user: ${user.email} (${userId})`);
  }

  // Upsert user_profiles row (trigger will sync JWT claims)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      role: user.role,
      institution_id: user.institution_id,
      display_name: user.display_name,
      email: user.email,
      is_course_director: user.is_course_director,
      onboarding_completed: user.onboarding_completed,
      onboarding_step: user.onboarding_step,
    }, { onConflict: 'id' });

  if (profileError) {
    console.error(`  ✗ Failed to upsert profile for ${user.email}: ${profileError.message}`);
    return;
  }
  console.log(`  ✓ Profile set: role=${user.role}, onboarding=${user.onboarding_completed ? 'done' : 'pending'}`);
}

async function main() {
  console.log('Seeding test users...\n');
  console.log(`Password for all test accounts: ${TEST_PASSWORD}\n`);

  const institutionId = await ensureInstitution();
  console.log(`Institution: Morehouse School of Medicine (${institutionId})\n`);

  const testUsers: TestUser[] = [
    {
      email: 'faculty@test.journeyos.dev',
      display_name: 'Dr. Sarah Chen',
      role: 'faculty',
      institution_id: institutionId,
      is_course_director: false,
      onboarding_completed: true,
      onboarding_step: 99,
    },
    {
      email: 'director@test.journeyos.dev',
      display_name: 'Dr. Marcus Williams',
      role: 'faculty',
      institution_id: institutionId,
      is_course_director: true,
      onboarding_completed: true,
      onboarding_step: 99,
    },
    {
      email: 'instadmin@test.journeyos.dev',
      display_name: 'Dr. Patricia Moore',
      role: 'institutional_admin',
      institution_id: institutionId,
      is_course_director: false,
      onboarding_completed: true,
      onboarding_step: 99,
    },
    {
      email: 'student@test.journeyos.dev',
      display_name: 'James Rodriguez',
      role: 'student',
      institution_id: institutionId,
      is_course_director: false,
      onboarding_completed: true,
      onboarding_step: 99,
    },
    {
      email: 'advisor@test.journeyos.dev',
      display_name: 'Dr. Evelyn Hart',
      role: 'advisor',
      institution_id: institutionId,
      is_course_director: false,
      onboarding_completed: true,
      onboarding_step: 99,
    },
  ];

  for (const user of testUsers) {
    console.log(`${user.role}${user.is_course_director ? ' (course director)' : ''}:`);
    await createTestUser(user);
    console.log();
  }

  console.log('─────────────────────────────────────────');
  console.log('Test Account Summary');
  console.log('─────────────────────────────────────────');
  console.log(`Password: ${TEST_PASSWORD}\n`);
  console.log('Role                 Email');
  console.log('───────────────────  ──────────────────────────────────');
  console.log('Super Admin          jthorne@msm.edu (already exists)');
  for (const u of testUsers) {
    const label = u.is_course_director
      ? 'Course Director'
      : u.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    console.log(`${label.padEnd(20)} ${u.email}`);
  }
  console.log('─────────────────────────────────────────');
}

main().catch(console.error);
