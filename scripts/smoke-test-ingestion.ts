#!/usr/bin/env npx ts-node
/**
 * scripts/smoke-test-ingestion.ts
 * End-to-end smoke test for the ingestion pipeline (P1-009 through P1-015).
 * Uploads a test fixture PDF and verifies all stages complete successfully.
 *
 * Usage:
 *   npx ts-node scripts/smoke-test-ingestion.ts
 *   npx ts-node scripts/smoke-test-ingestion.ts --file=fixtures/test-syllabus.pdf
 *   npx ts-node scripts/smoke-test-ingestion.ts --courseId=<uuid>
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import neo4j from 'neo4j-driver'

dotenv.config()

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const FIXTURE_PATH = process.argv.find(a => a.startsWith('--file='))?.split('=')[1]
  ?? path.join(__dirname, '../fixtures/test-syllabus.pdf')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
)

// Test JWT — must be seeded in test environment as a faculty user
const TEST_JWT = process.env.SMOKE_TEST_JWT

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function pollUploadStatus(uploadId: string, maxWaitMs = 60_000): Promise<string> {
  const interval = 2000
  let elapsed = 0

  while (elapsed < maxWaitMs) {
    const { data } = await supabase
      .from('uploads')
      .select('status')
      .eq('id', uploadId)
      .single()

    const status = data?.status
    if (status === 'completed' || status === 'failed') return status

    process.stdout.write('.')
    await sleep(interval)
    elapsed += interval
  }

  return 'timeout'
}

async function runSmokeTest() {
  console.log('\n🧪 Ingestion Pipeline Smoke Test')
  console.log('='.repeat(50))

  const results: { step: string; passed: boolean; detail: string }[] = []

  // ── Step 1: File exists ────────────────────────────────────────────────────
  const fileExists = fs.existsSync(FIXTURE_PATH)
  results.push({ step: 'Fixture file exists', passed: fileExists, detail: FIXTURE_PATH })
  if (!fileExists) {
    console.log(`\n❌ Fixture not found: ${FIXTURE_PATH}`)
    console.log('Create a test PDF at fixtures/test-syllabus.pdf to run this test')
    printSummary(results)
    process.exit(1)
  }

  // ── Step 2: Upload endpoint ────────────────────────────────────────────────
  if (!TEST_JWT) {
    console.log('\n⚠️  SMOKE_TEST_JWT not set — skipping API call steps')
    console.log('   Set SMOKE_TEST_JWT in .env with a valid faculty JWT to run full smoke test')
    process.exit(0)
  }

  const formData = new FormData()
  const fileBuffer = fs.readFileSync(FIXTURE_PATH)
  formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), 'test-syllabus.pdf')
  formData.append('courseId', process.argv.find(a => a.startsWith('--courseId='))?.split('=')[1] ?? 'test-course-id')

  let uploadId: string | null = null
  try {
    const res = await fetch(`${API_URL}/api/v1/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      body: formData,
    })
    const data = await res.json()
    uploadId = data.id
    results.push({ step: 'POST /api/v1/uploads', passed: !!uploadId, detail: `uploadId: ${uploadId}` })
  } catch (err) {
    results.push({ step: 'POST /api/v1/uploads', passed: false, detail: String(err) })
    printSummary(results)
    process.exit(1)
  }

  // ── Step 3: Poll until processing completes ────────────────────────────────
  console.log('\n⏳ Polling upload status', { uploadId })
  const finalStatus = await pollUploadStatus(uploadId!)
  console.log(` → ${finalStatus}`)
  results.push({
    step: 'Upload processing',
    passed: finalStatus === 'completed',
    detail: `final status: ${finalStatus}`,
  })

  if (finalStatus !== 'completed') {
    printSummary(results)
    process.exit(1)
  }

  // ── Step 4: ContentChunks exist in Supabase ────────────────────────────────
  const { data: chunks, count } = await supabase
    .from('content_chunks')
    .select('id', { count: 'exact' })
    .eq('upload_id', uploadId)
  results.push({
    step: 'ContentChunks in Supabase',
    passed: (count ?? 0) > 0,
    detail: `${count} chunks`,
  })

  // ── Step 5: Embeddings created ─────────────────────────────────────────────
  const { count: embCount } = await supabase
    .from('content_chunk_embeddings')
    .select('id', { count: 'exact' })
    .in('chunk_id', (chunks ?? []).map(c => c.id))
  results.push({
    step: 'Embeddings in Supabase',
    passed: embCount === count,
    detail: `${embCount}/${count} chunks embedded`,
  })

  // ── Step 6: SubConcepts in Neo4j ───────────────────────────────────────────
  const session = driver.session()
  const neo4jResult = await session.run(
    `MATCH (s:SubConcept)<-[:GROUNDED_IN]-(:ContentChunk)<-[:CHUNK_OF]-(:Upload {uuid: $uploadId})
     RETURN count(s) AS c`,
    { uploadId }
  )
  await session.close()
  const conceptCount = neo4jResult.records[0]?.get('c').toNumber() ?? 0
  results.push({
    step: 'SubConcepts in Neo4j',
    passed: conceptCount > 0,
    detail: `${conceptCount} SubConcept nodes`,
  })

  printSummary(results)
  const allPassed = results.every(r => r.passed)
  process.exit(allPassed ? 0 : 1)
}

function printSummary(results: { step: string; passed: boolean; detail: string }[]) {
  console.log('\n' + '='.repeat(50))
  console.log('INGESTION SMOKE TEST RESULTS')
  console.log('='.repeat(50))
  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.step.padEnd(35)} ${r.detail}`)
  }
  const passed = results.filter(r => r.passed).length
  console.log(`\n  ${passed}/${results.length} checks passed`)
  console.log('='.repeat(50) + '\n')
}

runSmokeTest()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => driver.close())
