/**
 * Validates Neo4j graph state after seeding.
 * Run: npx ts-node scripts/validate-graph.ts
 */
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env.local' });

async function main() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
  );
  const session = driver.session();
  
  const checks = [
    { name: 'Institution nodes', query: 'MATCH (n:Institution) RETURN count(n) as c', expected: 1 },
    { name: 'Course nodes', query: 'MATCH (n:Course) RETURN count(n) as c', expected: 1 },
    { name: 'USMLE_System nodes', query: 'MATCH (n:USMLE_System) RETURN count(n) as c', expected: 16 },
    { name: 'BloomLevel nodes', query: 'MATCH (n:BloomLevel) RETURN count(n) as c', expected: 6 },
    { name: 'TaskShell nodes', query: 'MATCH (n:TaskShell) RETURN count(n) as c', expected: 12 },
    { name: 'AT_BLOOM_RANGE edges', query: 'MATCH ()-[r:AT_BLOOM_RANGE]->() RETURN count(r) as c', expected: 1 },
    { name: 'HAS_SCHOOL edges', query: 'MATCH ()-[r:HAS_SCHOOL]->() RETURN count(r) as c', expected: 1 },
    { name: 'OFFERS_COURSE edges', query: 'MATCH ()-[r:OFFERS_COURSE]->() RETURN count(r) as c', expected: 1 },
  ];

  // ProficiencyVariable 1:1 ratio check (P2-014)
  const pvResult = await session.run('MATCH (pv:ProficiencyVariable) RETURN count(pv) as c');
  const scResult = await session.run('MATCH (sc:SubConcept) RETURN count(sc) as c');
  const pvCount = pvResult.records[0].get('c').toNumber();
  const scCount = scResult.records[0].get('c').toNumber();
  const pvRatioOk = scCount === 0 || pvCount === scCount;
  console.log(
    `${pvRatioOk ? '✓' : '✗'} ProficiencyVariable:SubConcept ratio: ${pvCount}:${scCount} (expected 1:1)`,
  );

  const mappedResult = await session.run(
    'MATCH (pv:ProficiencyVariable)-[:MAPPED_TO]->(sc:SubConcept) RETURN count(pv) as c',
  );
  const mappedCount = mappedResult.records[0].get('c').toNumber();
  const mappedOk = scCount === 0 || mappedCount === pvCount;
  console.log(
    `${mappedOk ? '✓' : '✗'} MAPPED_TO edges: ${mappedCount} (expected = PV count ${pvCount})`,
  );

  const assessedResult = await session.run(
    'MATCH (pv:ProficiencyVariable)-[:ASSESSED_BY]->(ts:TaskShell) RETURN count(*) as c',
  );
  const assessedCount = assessedResult.records[0].get('c').toNumber();
  const assessedOk = scCount === 0 || assessedCount >= pvCount;
  console.log(
    `${assessedOk ? '✓' : '✗'} ASSESSED_BY edges: ${assessedCount} (expected >= PV count ${pvCount})`,
  );
  
  let passed = 0;
  for (const check of checks) {
    const result = await session.run(check.query);
    const count = result.records[0].get('c').toNumber();
    const ok = count >= check.expected;
    console.log(`${ok ? '✓' : '✗'} ${check.name}: ${count} (expected >= ${check.expected})`);
    if (ok) passed++;
  }
  
  const pvChecks = pvRatioOk && mappedOk && assessedOk;
  const totalChecks = checks.length + 3;
  const totalPassed = passed + (pvRatioOk ? 1 : 0) + (mappedOk ? 1 : 0) + (assessedOk ? 1 : 0);
  console.log(`\n${totalPassed}/${totalChecks} checks passed`);
  await session.close();
  await driver.close();
  process.exit(totalPassed === totalChecks ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
