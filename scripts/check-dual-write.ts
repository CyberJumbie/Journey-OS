#!/usr/bin/env npx ts-node
/**
 * scripts/check-dual-write.ts
 * Verifies that a record exists in both Supabase AND Neo4j with sync_status='synced'.
 * Usage:
 *   npx ts-node scripts/check-dual-write.ts --table=assessment_items --id=<uuid>
 *   npx ts-node scripts/check-dual-write.ts --table=content_chunks --id=<uuid>
 *   npx ts-node scripts/check-dual-write.ts --table=assessment_items --recent=5  (last 5)
 */

import { createClient } from '@supabase/supabase-js'
import neo4j from 'neo4j-driver'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
)

// Map Supabase table → Neo4j label
const TABLE_TO_LABEL: Record<string, string> = {
  assessment_items: 'AssessmentItem',
  content_chunks: 'ContentChunk',
  // add more as stories implement dual-writes
}

async function checkRecord(table: string, id: string): Promise<boolean> {
  const neo4jLabel = TABLE_TO_LABEL[table]
  if (!neo4jLabel) {
    console.log(`  ⚠️  No Neo4j label mapping for table: ${table}`)
    return false
  }

  // Check Supabase
  const { data: sbRecord, error } = await supabase
    .from(table)
    .select('id, sync_status')
    .eq('id', id)
    .single()

  if (error || !sbRecord) {
    console.log(`  ❌ Supabase: NOT FOUND (${table}.id = ${id})`)
    return false
  }

  const syncStatus = sbRecord.sync_status
  const sbIcon = syncStatus === 'synced' ? '✅' : syncStatus === 'failed' ? '⚠️ ' : '🔄'
  console.log(`  ${sbIcon} Supabase: FOUND | sync_status = ${syncStatus}`)

  // Check Neo4j
  const session = driver.session()
  try {
    const result = await session.run(
      `MATCH (n:${neo4jLabel} {uuid: $uuid}) RETURN n.uuid AS uuid`,
      { uuid: id }
    )
    const found = result.records.length > 0

    if (found) {
      console.log(`  ✅ Neo4j:    FOUND | :${neo4jLabel} {uuid: ${id}}`)
    } else if (syncStatus === 'failed') {
      console.log(`  ⚠️  Neo4j:    NOT FOUND (expected — sync_status is 'failed', reconcile needed)`)
    } else {
      console.log(`  ❌ Neo4j:    NOT FOUND (unexpected — sync_status says '${syncStatus}' but node missing)`)
      return false
    }

    return syncStatus === 'synced'
  } finally {
    await session.close()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const tableArg = args.find(a => a.startsWith('--table='))?.split('=')[1]
  const idArg = args.find(a => a.startsWith('--id='))?.split('=')[1]
  const recentArg = args.find(a => a.startsWith('--recent='))?.split('=')[1]

  if (!tableArg) {
    console.error('Usage: check-dual-write.ts --table=<table> --id=<uuid>')
    console.error('       check-dual-write.ts --table=<table> --recent=<N>')
    process.exit(1)
  }

  console.log(`\n🔍 Dual-Write Consistency Check — ${tableArg}`)
  console.log('='.repeat(50))

  let allPassed = true

  if (idArg) {
    console.log(`\nChecking: ${idArg}`)
    const passed = await checkRecord(tableArg, idArg)
    if (!passed) allPassed = false
  } else if (recentArg) {
    const { data: records } = await supabase
      .from(tableArg)
      .select('id, sync_status, created_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(recentArg))

    if (!records?.length) {
      console.log(`\n  ⚠️  No records found in ${tableArg}`)
      process.exit(0)
    }

    for (const record of records) {
      console.log(`\nChecking: ${record.id} (created: ${new Date(record.created_at).toISOString()})`)
      const passed = await checkRecord(tableArg, record.id)
      if (!passed) allPassed = false
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('✅ All checked records: Supabase + Neo4j consistent\n')
    process.exit(0)
  } else {
    console.log('❌ Consistency issues found — see above\n')
    process.exit(1)
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => driver.close())
