/**
 * BREAK-GLASS TOOL — use only when all main admins are unreachable.
 * Requires direct server access. Bypasses UI permission checks.
 * Usage: pnpm tsx backend/src/scripts/grant-main-admin.ts --email new@institution.edu
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { email: { type: 'string' } } });
if (!values.email) {
  console.error('--email required');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  console.log(`[BREAK-GLASS] Granting main admin to: ${values.email}`);
  console.log(`[BREAK-GLASS] Timestamp: ${new Date().toISOString()}`);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('email', values.email)
    .single();

  if (!profile) {
    console.error('User not found. They must have an existing account.');
    process.exit(1);
  }

  if (profile.role !== 'superadmin') {
    console.error('User is not a super admin. Cannot grant main admin status to non-admins.');
    process.exit(1);
  }

  await supabase
    .from('user_profiles')
    .update({ is_main_admin: true })
    .eq('id', profile.id);

  await supabase
    .from('admin_permissions')
    .upsert({
      user_id: profile.id,
      can_manage_super_admins: true,
      can_approve_applications: true,
      can_manage_institutions: true,
      can_manage_frameworks: true,
      can_manage_platform_health: true,
      granted_by: profile.id,
    });

  console.log(`[BREAK-GLASS] Main admin granted to ${values.email}`);
  console.log(`[BREAK-GLASS] ACTION REQUIRED: Record this in the security audit log.`);
}

run().catch(console.error);
