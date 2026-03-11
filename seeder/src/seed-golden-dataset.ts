/**
 * seed-golden-dataset.ts — Golden Dataset Seed
 *
 * Queries top 25 approved assessment items by critic_composite_score >= 4.0
 * and inserts them into the golden_dataset table with target_critic_min = 3.8.
 *
 * Minimum viable golden dataset = 10 items. If fewer than 10 approved items
 * with critic scores exist, logs a warning and inserts what exists.
 *
 * Usage: pnpm seed:golden
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from root .env.local (seeder is standalone package)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Also try seeder-local env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── Constants ──────────────────────────────────────────────────────────────────

const MIN_GOLDEN_ITEMS = 10;
const MAX_GOLDEN_ITEMS = 25;
const MIN_CRITIC_SCORE = 4.0;
const TARGET_CRITIC_MIN = 3.8;

// ── Supabase client ────────────────────────────────────────────────────────────

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopItemRow {
  id: string;
  critic_composite_score: number;
}

interface GoldenDatasetInsert {
  item_id: string;
  target_critic_min: number;
  notes: string;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  Journey OS — Golden Dataset Seed');
  console.log('═══════════════════════════════════════════════\n');

  const supabase = createSupabaseClient();

  // 1. Query top 25 approved items by critic score
  console.log(`[Golden] Querying top ${MAX_GOLDEN_ITEMS} approved items with critic_composite_score >= ${MIN_CRITIC_SCORE}...`);

  const { data: topItems, error: queryError } = await supabase
    .from('assessment_items')
    .select('id, critic_composite_score')
    .eq('status', 'approved')
    .not('critic_composite_score', 'is', null)
    .gte('critic_composite_score', MIN_CRITIC_SCORE)
    .order('critic_composite_score', { ascending: false })
    .limit(MAX_GOLDEN_ITEMS);

  if (queryError) {
    console.error(`[Golden] Failed to query assessment_items: ${queryError.message}`);
    process.exit(1);
  }

  const items = (topItems ?? []) as TopItemRow[];
  console.log(`[Golden] Found ${items.length} eligible items`);

  if (items.length === 0) {
    console.warn('[Golden] WARNING: No approved items with critic_composite_score >= 4.0 found.');
    console.warn('[Golden] Golden dataset cannot be seeded. Run the pipeline to generate and score items first.');
    process.exit(0);
  }

  if (items.length < MIN_GOLDEN_ITEMS) {
    console.warn(`[Golden] WARNING: Only ${items.length} items found (minimum recommended: ${MIN_GOLDEN_ITEMS}).`);
    console.warn('[Golden] Proceeding with partial golden dataset.');
  }

  // 2. Clear existing golden dataset (idempotent — running again replaces)
  console.log('[Golden] Clearing existing golden_dataset rows...');
  const { error: deleteError } = await supabase
    .from('golden_dataset')
    .delete()
    .gte('added_at', '1970-01-01'); // match all rows

  if (deleteError) {
    console.error(`[Golden] Failed to clear golden_dataset: ${deleteError.message}`);
    process.exit(1);
  }

  // 3. Insert into golden_dataset
  const inserts: GoldenDatasetInsert[] = items.map((item) => ({
    item_id: item.id,
    target_critic_min: TARGET_CRITIC_MIN,
    notes: `Auto-seeded from top approved items (score: ${item.critic_composite_score})`,
  }));

  console.log(`[Golden] Inserting ${inserts.length} items into golden_dataset...`);

  const { error: insertError } = await supabase
    .from('golden_dataset')
    .insert(inserts);

  if (insertError) {
    console.error(`[Golden] Failed to insert golden_dataset: ${insertError.message}`);
    process.exit(1);
  }

  // 4. Validate
  const { count, error: countError } = await supabase
    .from('golden_dataset')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(`[Golden] Failed to count golden_dataset: ${countError.message}`);
    process.exit(1);
  }

  console.log(`\n[Golden] Seed complete. Golden dataset: ${count ?? 0} items`);
  console.log(`[Golden] Target critic minimum: ${TARGET_CRITIC_MIN}`);
  console.log('[Golden] Score range:');

  for (const item of items) {
    console.log(`  - ${item.id}: ${item.critic_composite_score}`);
  }
}

main().catch((err) => {
  console.error('[Golden] Unhandled error:', err);
  process.exit(1);
});
