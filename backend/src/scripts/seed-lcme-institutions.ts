/**
 * Seeds LCME-accredited medical schools as inactive institution records.
 * Can be run standalone or called from seed-main-admin.ts --with-institutions
 * Usage: pnpm tsx backend/src/scripts/seed-lcme-institutions.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import institutionsData from './data/lcme-institutions.json';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedInstitutions(supabase: SupabaseClient) {
  const records = institutionsData.map(inst => ({
    name: inst.name,
    slug: slugify(inst.name),
    city: inst.city,
    state_province: inst.state_province,
    country: inst.country,
    lcme_member_number: inst.lcme_member_number,
    institution_type: inst.institution_type,
    status: 'inactive' as const,
  }));

  // Upsert in batches of 50 — safe to run multiple times
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('institutions')
      .upsert(batch, { onConflict: 'lcme_member_number', ignoreDuplicates: true });

    if (error) {
      console.error(`Failed to seed batch ${i / batchSize + 1}:`, error);
      throw error;
    }
    inserted += batch.length;
  }

  console.log(`Seeded ${inserted} LCME institutions`);
}

// Run standalone
const isMainModule = typeof require !== 'undefined' && require.main === module;
if (isMainModule) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  seedInstitutions(supabase)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
