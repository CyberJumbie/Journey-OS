/**
 * seed-layer3-taskshells.ts — ECD TaskShell Nodes Seed
 *
 * Seeds 12 TaskShell nodes representing the main NBME question
 * archetypes used by the Evidence-Centered Design layer.
 *
 * Each TaskShell links to BloomLevel nodes via AT_BLOOM_RANGE
 * relationships based on its bloomMin/bloomMax range.
 *
 * All writes use MERGE (Rule 3 — idempotent). Running twice
 * produces the same node count.
 *
 * Usage: pnpm seed:layer3
 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';
import * as crypto from 'crypto';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from root .env.local (seeder is standalone package)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Also try seeder-local env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskShellData {
  shellId: string;
  name: string;
  bloomMin: number;
  bloomMax: number;
  vignetteRequired: boolean;
  optionCount: number;
  distractorStrategy: string;
}

// ── Seed data: 12 NBME question archetypes ──────────────────────────────────

const TASK_SHELLS: TaskShellData[] = [
  {
    shellId: 'TS-001',
    name: 'Clinical Vignette MCQ',
    bloomMin: 2,
    bloomMax: 4,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'best-worst',
  },
  {
    shellId: 'TS-002',
    name: 'Mechanism of Disease',
    bloomMin: 2,
    bloomMax: 3,
    vignetteRequired: false,
    optionCount: 5,
    distractorStrategy: 'common-misconceptions',
  },
  {
    shellId: 'TS-003',
    name: 'Diagnosis MCQ',
    bloomMin: 3,
    bloomMax: 4,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'differential-diagnosis',
  },
  {
    shellId: 'TS-004',
    name: 'Treatment/Management',
    bloomMin: 3,
    bloomMax: 5,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'treatment-alternatives',
  },
  {
    shellId: 'TS-005',
    name: 'Pathophysiology Chain',
    bloomMin: 2,
    bloomMax: 3,
    vignetteRequired: false,
    optionCount: 5,
    distractorStrategy: 'causal-chain-errors',
  },
  {
    shellId: 'TS-006',
    name: 'Drug Mechanism',
    bloomMin: 1,
    bloomMax: 2,
    vignetteRequired: false,
    optionCount: 5,
    distractorStrategy: 'drug-class-confusion',
  },
  {
    shellId: 'TS-007',
    name: 'Lab Interpretation',
    bloomMin: 3,
    bloomMax: 4,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'lab-pattern-errors',
  },
  {
    shellId: 'TS-008',
    name: 'Anatomy/Histology',
    bloomMin: 1,
    bloomMax: 2,
    vignetteRequired: false,
    optionCount: 5,
    distractorStrategy: 'adjacent-structures',
  },
  {
    shellId: 'TS-009',
    name: 'Prevention/Screening',
    bloomMin: 3,
    bloomMax: 4,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'guideline-alternatives',
  },
  {
    shellId: 'TS-010',
    name: 'Pharmacotherapy',
    bloomMin: 3,
    bloomMax: 5,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'drug-interaction-errors',
  },
  {
    shellId: 'TS-011',
    name: 'Emergency/Acute Management',
    bloomMin: 4,
    bloomMax: 6,
    vignetteRequired: true,
    optionCount: 5,
    distractorStrategy: 'urgency-errors',
  },
  {
    shellId: 'TS-012',
    name: 'Epidemiology/Statistics',
    bloomMin: 2,
    bloomMax: 4,
    vignetteRequired: false,
    optionCount: 5,
    distractorStrategy: 'statistical-traps',
  },
];

// ── Neo4j connection ─────────────────────────────────────────────────────────

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER; // NOTE: NEO4J_USER not NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      'Missing Neo4j env vars. Required: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD'
    );
  }

  return neo4j.driver(uri, neo4j.auth.basic(user, password));
}

// ── Seed functions ───────────────────────────────────────────────────────────

async function createConstraints(session: Session): Promise<void> {
  console.log('[Layer 3] Creating uniqueness constraints...');

  const constraints = [
    'CREATE CONSTRAINT taskshell_shellid_unique IF NOT EXISTS FOR (n:TaskShell) REQUIRE n.shellId IS UNIQUE',
    'CREATE CONSTRAINT taskshell_uuid_unique IF NOT EXISTS FOR (n:TaskShell) REQUIRE n.uuid IS UNIQUE',
  ];

  for (const constraint of constraints) {
    await session.run(constraint);
  }

  console.log(`[Layer 3] Created ${constraints.length} constraints`);
}

async function seedTaskShells(session: Session): Promise<number> {
  console.log('[Layer 3] Seeding TaskShell nodes...');

  for (const shell of TASK_SHELLS) {
    const uuid = crypto.randomUUID();

    await session.run(
      `MERGE (ts:TaskShell {shellId: $shellId})
       ON CREATE SET
         ts.uuid = $uuid,
         ts.name = $name,
         ts.bloomMin = $bloomMin,
         ts.bloomMax = $bloomMax,
         ts.vignetteRequired = $vignetteRequired,
         ts.optionCount = $optionCount,
         ts.distractorStrategy = $distractorStrategy,
         ts.createdAt = datetime()
       ON MATCH SET
         ts.name = $name,
         ts.bloomMin = $bloomMin,
         ts.bloomMax = $bloomMax,
         ts.vignetteRequired = $vignetteRequired,
         ts.optionCount = $optionCount,
         ts.distractorStrategy = $distractorStrategy
       WITH ts
       MATCH (bl:BloomLevel) WHERE bl.level >= ts.bloomMin AND bl.level <= ts.bloomMax
       MERGE (ts)-[:AT_BLOOM_RANGE]->(bl)
       RETURN ts`,
      {
        shellId: shell.shellId,
        uuid,
        name: shell.name,
        bloomMin: neo4j.int(shell.bloomMin),
        bloomMax: neo4j.int(shell.bloomMax),
        vignetteRequired: shell.vignetteRequired,
        optionCount: neo4j.int(shell.optionCount),
        distractorStrategy: shell.distractorStrategy,
      }
    );

    console.log(`[Layer 3]   ${shell.shellId}: ${shell.name} (Bloom ${shell.bloomMin}-${shell.bloomMax})`);
  }

  console.log(`[Layer 3]   TaskShell: ${TASK_SHELLS.length}`);
  return TASK_SHELLS.length;
}

// ── Validation ───────────────────────────────────────────────────────────────

interface NodeCount {
  label: string;
  count: number;
}

async function validateNodeCounts(session: Session): Promise<number> {
  console.log('\n[Layer 3] Validating node counts...');

  const labels = ['TaskShell'];
  let totalNodes = 0;
  const counts: NodeCount[] = [];

  for (const label of labels) {
    const result = await session.run(
      `MATCH (n:${label}) RETURN count(n) AS count`
    );
    const count =
      result.records[0]?.get('count')?.toNumber?.() ??
      Number(result.records[0]?.get('count') ?? 0);
    counts.push({ label, count });
    totalNodes += count;
  }

  console.log('\n  Label               Count');
  console.log('  ─────────────────── ─────');
  for (const { label, count } of counts) {
    console.log(`  ${label.padEnd(20)} ${count}`);
  }

  return totalNodes;
}

async function validateRelationships(session: Session): Promise<void> {
  console.log('\n[Layer 3] Validating relationships...');

  const result = await session.run(
    'MATCH ()-[r:AT_BLOOM_RANGE]->() RETURN count(r) AS count'
  );
  const count =
    result.records[0]?.get('count')?.toNumber?.() ??
    Number(result.records[0]?.get('count') ?? 0);

  console.log('\n  Relationship           Count');
  console.log('  ──────────────────────  ─────');
  console.log(`  ${'AT_BLOOM_RANGE'.padEnd(23)} ${count}`);

  // Each TaskShell links to (bloomMax - bloomMin + 1) BloomLevels
  // Expected total: sum of all ranges
  const expectedRels = TASK_SHELLS.reduce(
    (sum, ts) => sum + (ts.bloomMax - ts.bloomMin + 1),
    0
  );
  console.log(`\n  Expected AT_BLOOM_RANGE count: ${expectedRels}`);
  if (count !== expectedRels) {
    console.warn(
      `[Layer 3] WARNING: Expected ${expectedRels} AT_BLOOM_RANGE relationships, got ${count}`
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  Journey OS — Layer 3: ECD TaskShells');
  console.log('═══════════════════════════════════════════════\n');

  const driver = createDriver();
  const session = driver.session();

  try {
    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('[Layer 3] Connected to Neo4j\n');

    // Create constraints first
    await createConstraints(session);
    console.log('');

    // Seed TaskShell nodes
    await seedTaskShells(session);

    // Validate
    const totalNodes = await validateNodeCounts(session);
    await validateRelationships(session);

    console.log(`\n[Layer 3] Seed complete. Total TaskShell nodes: ${totalNodes}`);

    if (totalNodes !== 12) {
      console.warn(
        `[Layer 3] WARNING: Expected exactly 12 TaskShell nodes, got ${totalNodes}`
      );
      process.exit(1);
    } else {
      console.log('[Layer 3] TaskShell count is exactly 12');
    }
  } catch (error) {
    console.error('[Layer 3] Seed failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    console.log('\n[Layer 3] Neo4j connection closed.');
  }
}

main();
