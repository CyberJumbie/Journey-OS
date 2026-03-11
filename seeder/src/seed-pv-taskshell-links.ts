/**
 * seed-pv-taskshell-links.ts — Link ProficiencyVariables to TaskShells
 *
 * One-time migration that creates ASSESSED_BY relationships between
 * existing ProficiencyVariable nodes and TaskShell nodes.
 *
 * Algorithm: for each PV, find TaskShells where bloomMin <= bloomGuess <= bloomMax.
 * Primary link (priority 1): narrowest matching Bloom range.
 * Secondary links (priority 2-3): next 1-2 matching TaskShells.
 *
 * Default bloomGuess = 3 when PV has no bloomLevelGuess property.
 *
 * All writes use MERGE (Rule 3 — idempotent). Running twice
 * produces the same relationship set.
 *
 * Usage: pnpm seed:pv-links
 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from root .env.local (seeder is standalone package)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Also try seeder-local env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/** Default Bloom level when PV has no bloomLevelGuess. */
const DEFAULT_BLOOM_GUESS = 3;

// ── Neo4j connection ─────────────────────────────────────────────────────────

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER; // NOTE: NEO4J_USER not NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      'Missing Neo4j env vars. Required: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD',
    );
  }

  return neo4j.driver(uri, neo4j.auth.basic(user, password));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PvRecord {
  uuid: string;
  name: string;
  bloomLevelGuess: number | null;
}

// ── Seed functions ───────────────────────────────────────────────────────────

/**
 * Fetch all ProficiencyVariable nodes from Neo4j.
 */
async function fetchAllPVs(session: Session): Promise<PvRecord[]> {
  const result = await session.run(
    `MATCH (pv:ProficiencyVariable)
     RETURN pv.uuid AS uuid, pv.name AS name, pv.bloomLevelGuess AS bloomLevelGuess`,
  );

  return result.records.map((r) => ({
    uuid: r.get('uuid') as string,
    name: r.get('name') as string,
    bloomLevelGuess: r.get('bloomLevelGuess') != null
      ? (r.get('bloomLevelGuess') as { toNumber?: () => number }).toNumber?.() ??
        (r.get('bloomLevelGuess') as number)
      : null,
  }));
}

/**
 * Link a single ProficiencyVariable to up to 3 TaskShells via ASSESSED_BY.
 * Priority 1 = narrowest matching range, 2-3 = next narrowest.
 * Uses MERGE for idempotency (Rule 3).
 */
async function linkPvToTaskShells(
  session: Session,
  pvUuid: string,
  bloomGuess: number,
): Promise<number> {
  const result = await session.run(
    `MATCH (pv:ProficiencyVariable {uuid: $pvUuid})
     MATCH (ts:TaskShell)
     WHERE ts.bloomMin <= $bloomGuess AND ts.bloomMax >= $bloomGuess
     WITH pv, ts, (ts.bloomMax - ts.bloomMin) AS bloomRange
     ORDER BY bloomRange ASC
     LIMIT 3
     WITH pv, collect(ts) AS shells
     UNWIND range(0, size(shells) - 1) AS idx
     WITH pv, shells[idx] AS ts, idx + 1 AS priority
     MERGE (pv)-[r:ASSESSED_BY]->(ts)
     SET r.priority = priority
     RETURN count(*) AS linked`,
    { pvUuid, bloomGuess },
  );

  const record = result.records[0];
  if (!record) return 0;

  const linked = record.get('linked');
  return typeof linked === 'object' && linked !== null && 'toNumber' in linked
    ? (linked as { toNumber: () => number }).toNumber()
    : (linked as number);
}

// ── Validation ───────────────────────────────────────────────────────────────

async function validate(session: Session): Promise<void> {
  console.log('\n[PV-Links] Validating ASSESSED_BY relationships...');

  const pvResult = await session.run(
    'MATCH (pv:ProficiencyVariable) RETURN count(pv) AS c',
  );
  const pvCount = pvResult.records[0]?.get('c')?.toNumber?.() ?? 0;

  const abResult = await session.run(
    'MATCH (pv:ProficiencyVariable)-[r:ASSESSED_BY]->(ts:TaskShell) RETURN count(r) AS total, count(DISTINCT pv) AS pvWithLinks',
  );
  const totalLinks = abResult.records[0]?.get('total')?.toNumber?.() ?? 0;
  const pvWithLinks = abResult.records[0]?.get('pvWithLinks')?.toNumber?.() ?? 0;

  console.log(`  ProficiencyVariable count:  ${pvCount}`);
  console.log(`  PVs with ASSESSED_BY links: ${pvWithLinks}`);
  console.log(`  Total ASSESSED_BY edges:    ${totalLinks}`);

  const allLinked = pvCount === 0 || pvWithLinks === pvCount;
  console.log(
    `  ${allLinked ? '✓' : '✗'} Every PV has at least 1 ASSESSED_BY link`,
  );

  if (!allLinked) {
    console.warn(
      `[PV-Links] WARNING: ${pvCount - pvWithLinks} PVs have no ASSESSED_BY links`,
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  Journey OS — PV → TaskShell ASSESSED_BY Links');
  console.log('═══════════════════════════════════════════════\n');

  const driver = createDriver();
  const session = driver.session();

  try {
    await driver.verifyConnectivity();
    console.log('[PV-Links] Connected to Neo4j\n');

    // 1. Fetch all ProficiencyVariables
    const pvs = await fetchAllPVs(session);
    console.log(`[PV-Links] Found ${pvs.length} ProficiencyVariable nodes\n`);

    if (pvs.length === 0) {
      console.log('[PV-Links] No ProficiencyVariables to link. Done.');
      return;
    }

    // 2. Link each PV to matching TaskShells
    let totalLinked = 0;
    for (const pv of pvs) {
      const bloomGuess = pv.bloomLevelGuess ?? DEFAULT_BLOOM_GUESS;
      const linked = await linkPvToTaskShells(session, pv.uuid, bloomGuess);
      totalLinked += linked;
      console.log(
        `[PV-Links]   ${pv.name} (bloom ${bloomGuess}) → ${linked} TaskShell(s)`,
      );
    }

    console.log(`\n[PV-Links] Created/verified ${totalLinked} ASSESSED_BY edges`);

    // 3. Validate
    await validate(session);

    console.log('\n[PV-Links] Seed complete.');
  } catch (error) {
    console.error('[PV-Links] Seed failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    console.log('[PV-Links] Neo4j connection closed.');
  }
}

main();
