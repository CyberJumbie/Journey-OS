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
    { name: 'HAS_SCHOOL edges', query: 'MATCH ()-[r:HAS_SCHOOL]->() RETURN count(r) as c', expected: 1 },
    { name: 'OFFERS_COURSE edges', query: 'MATCH ()-[r:OFFERS_COURSE]->() RETURN count(r) as c', expected: 1 },
  ];
  
  let passed = 0;
  for (const check of checks) {
    const result = await session.run(check.query);
    const count = result.records[0].get('c').toNumber();
    const ok = count >= check.expected;
    console.log(`${ok ? '✓' : '✗'} ${check.name}: ${count} (expected >= ${check.expected})`);
    if (ok) passed++;
  }
  
  console.log(`\n${passed}/${checks.length} checks passed`);
  await session.close();
  await driver.close();
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
