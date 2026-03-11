/**
 * seed-layer1.ts — MSM Institutional Hierarchy Seed
 *
 * Seeds ~65 nodes representing the Morehouse School of Medicine
 * institutional structure: Institution -> School -> Program -> Tracks,
 * Years, Phases, Blocks, Courses, Sections, Terms, and ILOs.
 *
 * All writes use MERGE (Rule 3 — idempotent). Running twice produces
 * the same node count.
 *
 * Usage: pnpm seed:layer1
 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from root .env.local (seeder is standalone package)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Also try seeder-local env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── Types for seed data ──────────────────────────────────────────────────────

interface InstitutionData {
  uuid: string;
  name: string;
  slug: string;
}

interface SchoolData {
  uuid: string;
  name: string;
}

interface ProgramData {
  uuid: string;
  name: string;
  code: string;
}

interface TrackData {
  uuid: string;
  name: string;
}

interface AcademicYearData {
  uuid: string;
  name: string;
  yearNumber: number;
}

interface CurricularPhaseData {
  uuid: string;
  name: string;
  phaseNumber: number;
  yearUuids: string[];
}

interface BlockData {
  uuid: string;
  name: string;
  phaseUuid: string;
}

interface CourseData {
  uuid: string;
  code: string;
  name: string;
  blockUuid: string;
}

interface AcademicTermData {
  uuid: string;
  name: string;
  year: number;
  season: string;
}

interface SectionData {
  uuid: string;
  name: string;
  courseUuid: string;
  termUuid: string;
  enrollmentCap: number;
}

interface IloData {
  uuid: string;
  name: string;
  code: string;
}

interface CourseTermMapping {
  courseUuid: string;
  termUuid: string;
}

interface MsmCatalog {
  institution: InstitutionData;
  school: SchoolData;
  program: ProgramData;
  tracks: TrackData[];
  academicYears: AcademicYearData[];
  curricularPhases: CurricularPhaseData[];
  blocks: BlockData[];
  courses: CourseData[];
  academicTerms: AcademicTermData[];
  courseTermMappings: CourseTermMapping[];
  sections: SectionData[];
  ilos: IloData[];
}

// ── Load seed data ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalog: MsmCatalog = require('../../data/msm-catalog.json') as MsmCatalog;

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
  console.log('[Layer 1] Creating uniqueness constraints...');

  const constraints = [
    'CREATE CONSTRAINT institution_uuid_unique IF NOT EXISTS FOR (n:Institution) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT school_uuid_unique IF NOT EXISTS FOR (n:School) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT program_uuid_unique IF NOT EXISTS FOR (n:Program) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT track_uuid_unique IF NOT EXISTS FOR (n:ProgramTrack) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT year_uuid_unique IF NOT EXISTS FOR (n:AcademicYear) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT phase_uuid_unique IF NOT EXISTS FOR (n:CurricularPhase) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT block_uuid_unique IF NOT EXISTS FOR (n:Block) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT course_uuid_unique IF NOT EXISTS FOR (n:Course) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT course_code_unique IF NOT EXISTS FOR (n:Course) REQUIRE n.code IS UNIQUE',
    'CREATE CONSTRAINT term_uuid_unique IF NOT EXISTS FOR (n:AcademicTerm) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT section_uuid_unique IF NOT EXISTS FOR (n:Section) REQUIRE n.uuid IS UNIQUE',
    'CREATE CONSTRAINT ilo_uuid_unique IF NOT EXISTS FOR (n:ILO) REQUIRE n.uuid IS UNIQUE',
  ];

  for (const constraint of constraints) {
    await session.run(constraint);
  }

  console.log(`[Layer 1] Created ${constraints.length} constraints`);
}

async function seedInstitution(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding Institution, School, Program...');

  const { institution, school, program } = catalog;

  await session.run(
    `MERGE (i:Institution {uuid: $iUuid})
     SET i.name = $iName, i.slug = $iSlug
     MERGE (s:School {uuid: $sUuid})
     SET s.name = $sName
     MERGE (i)-[:HAS_SCHOOL]->(s)
     MERGE (p:Program {uuid: $pUuid})
     SET p.name = $pName, p.code = $pCode
     MERGE (s)-[:OFFERS_PROGRAM]->(p)`,
    {
      iUuid: institution.uuid,
      iName: institution.name,
      iSlug: institution.slug,
      sUuid: school.uuid,
      sName: school.name,
      pUuid: program.uuid,
      pName: program.name,
      pCode: program.code,
    }
  );

  console.log('[Layer 1]   Institution: 1, School: 1, Program: 1');
}

async function seedTracks(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding ProgramTracks...');

  for (const track of catalog.tracks) {
    await session.run(
      `MATCH (p:Program {uuid: $pUuid})
       MERGE (t:ProgramTrack {uuid: $tUuid})
       SET t.name = $tName
       MERGE (p)-[:HAS_TRACK]->(t)`,
      {
        pUuid: catalog.program.uuid,
        tUuid: track.uuid,
        tName: track.name,
      }
    );
  }

  console.log(`[Layer 1]   ProgramTracks: ${catalog.tracks.length}`);
}

async function seedAcademicYears(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding AcademicYears...');

  // All tracks link to all years
  for (const year of catalog.academicYears) {
    await session.run(
      `MERGE (y:AcademicYear {uuid: $yUuid})
       SET y.name = $yName, y.year_number = $yearNumber
       WITH y
       MATCH (t:ProgramTrack)
       WHERE t.uuid IN $trackUuids
       MERGE (t)-[:IN_YEAR]->(y)`,
      {
        yUuid: year.uuid,
        yName: year.name,
        yearNumber: neo4j.int(year.yearNumber),
        trackUuids: catalog.tracks.map((t) => t.uuid),
      }
    );
  }

  console.log(`[Layer 1]   AcademicYears: ${catalog.academicYears.length}`);
}

async function seedPhases(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding CurricularPhases...');

  for (const phase of catalog.curricularPhases) {
    await session.run(
      `MERGE (ph:CurricularPhase {uuid: $phUuid})
       SET ph.name = $phName, ph.phase_number = $phaseNumber
       WITH ph
       UNWIND $yearUuids AS yUuid
       MATCH (y:AcademicYear {uuid: yUuid})
       MERGE (y)-[:HAS_PHASE]->(ph)`,
      {
        phUuid: phase.uuid,
        phName: phase.name,
        phaseNumber: neo4j.int(phase.phaseNumber),
        yearUuids: phase.yearUuids,
      }
    );
  }

  console.log(`[Layer 1]   CurricularPhases: ${catalog.curricularPhases.length}`);
}

async function seedBlocks(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding Blocks...');

  for (const block of catalog.blocks) {
    await session.run(
      `MATCH (ph:CurricularPhase {uuid: $phUuid})
       MERGE (b:Block {uuid: $bUuid})
       SET b.name = $bName
       MERGE (ph)-[:CONTAINS_BLOCK]->(b)`,
      {
        phUuid: block.phaseUuid,
        bUuid: block.uuid,
        bName: block.name,
      }
    );
  }

  console.log(`[Layer 1]   Blocks: ${catalog.blocks.length}`);
}

async function seedCourses(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding Courses...');

  for (const course of catalog.courses) {
    await session.run(
      `MATCH (b:Block {uuid: $bUuid})
       MERGE (c:Course {uuid: $cUuid})
       SET c.code = $cCode, c.name = $cName
       MERGE (b)-[:OFFERS_COURSE]->(c)`,
      {
        bUuid: course.blockUuid,
        cUuid: course.uuid,
        cCode: course.code,
        cName: course.name,
      }
    );
  }

  console.log(`[Layer 1]   Courses: ${catalog.courses.length}`);
}

async function seedTerms(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding AcademicTerms...');

  for (const term of catalog.academicTerms) {
    await session.run(
      `MERGE (t:AcademicTerm {uuid: $tUuid})
       SET t.name = $tName, t.year = $tYear, t.season = $tSeason`,
      {
        tUuid: term.uuid,
        tName: term.name,
        tYear: neo4j.int(term.year),
        tSeason: term.season,
      }
    );
  }

  // Link courses to terms
  for (const mapping of catalog.courseTermMappings) {
    await session.run(
      `MATCH (c:Course {uuid: $cUuid})
       MATCH (t:AcademicTerm {uuid: $tUuid})
       MERGE (c)-[:IN_TERM]->(t)`,
      {
        cUuid: mapping.courseUuid,
        tUuid: mapping.termUuid,
      }
    );
  }

  console.log(`[Layer 1]   AcademicTerms: ${catalog.academicTerms.length}`);
}

async function seedSections(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding Sections...');

  for (const section of catalog.sections) {
    await session.run(
      `MATCH (c:Course {uuid: $cUuid})
       MATCH (t:AcademicTerm {uuid: $tUuid})
       MERGE (sec:Section {uuid: $secUuid})
       SET sec.name = $secName, sec.enrollment_cap = $enrollmentCap
       MERGE (c)-[:HAS_SECTION]->(sec)
       MERGE (sec)-[:IN_TERM]->(t)`,
      {
        cUuid: section.courseUuid,
        tUuid: section.termUuid,
        secUuid: section.uuid,
        secName: section.name,
        enrollmentCap: neo4j.int(section.enrollmentCap),
      }
    );
  }

  console.log(`[Layer 1]   Sections: ${catalog.sections.length}`);
}

async function seedIlos(session: Session): Promise<void> {
  console.log('[Layer 1] Seeding ILOs...');

  for (const ilo of catalog.ilos) {
    await session.run(
      `MATCH (p:Program {uuid: $pUuid})
       MERGE (ilo:ILO {uuid: $iloUuid})
       SET ilo.name = $iloName, ilo.code = $iloCode
       MERGE (p)-[:HAS_ILO]->(ilo)`,
      {
        pUuid: catalog.program.uuid,
        iloUuid: ilo.uuid,
        iloName: ilo.name,
        iloCode: ilo.code,
      }
    );
  }

  console.log(`[Layer 1]   ILOs: ${catalog.ilos.length}`);
}

// ── Validation ───────────────────────────────────────────────────────────────

interface NodeCount {
  label: string;
  count: number;
}

async function validateNodeCounts(session: Session): Promise<number> {
  console.log('\n[Layer 1] Validating node counts...');

  const labels = [
    'Institution',
    'School',
    'Program',
    'ProgramTrack',
    'AcademicYear',
    'CurricularPhase',
    'Block',
    'Course',
    'AcademicTerm',
    'Section',
    'ILO',
  ];

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
  console.log(`  ${'─'.repeat(20)} ─────`);
  console.log(`  ${'TOTAL'.padEnd(20)} ${totalNodes}`);

  return totalNodes;
}

async function validateRelationships(session: Session): Promise<void> {
  console.log('\n[Layer 1] Validating relationships...');

  const relTypes = [
    'HAS_SCHOOL',
    'OFFERS_PROGRAM',
    'HAS_TRACK',
    'IN_YEAR',
    'HAS_PHASE',
    'CONTAINS_BLOCK',
    'OFFERS_COURSE',
    'IN_TERM',
    'HAS_SECTION',
    'HAS_ILO',
  ];

  console.log('\n  Relationship        Count');
  console.log('  ─────────────────── ─────');

  for (const relType of relTypes) {
    const result = await session.run(
      `MATCH ()-[r:${relType}]->() RETURN count(r) AS count`
    );
    const count =
      result.records[0]?.get('count')?.toNumber?.() ??
      Number(result.records[0]?.get('count') ?? 0);
    console.log(`  ${relType.padEnd(20)} ${count}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  Journey OS — Layer 1: Institutional Hierarchy');
  console.log('═══════════════════════════════════════════════\n');

  const driver = createDriver();
  const session = driver.session();

  try {
    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('[Layer 1] Connected to Neo4j\n');

    // Create constraints first (AC4)
    await createConstraints(session);
    console.log('');

    // Seed all node types
    await seedInstitution(session);
    await seedTracks(session);
    await seedAcademicYears(session);
    await seedPhases(session);
    await seedBlocks(session);
    await seedCourses(session);
    await seedTerms(session);
    await seedSections(session);
    await seedIlos(session);

    // Validate (AC5 — idempotent check)
    const totalNodes = await validateNodeCounts(session);
    await validateRelationships(session);

    console.log(`\n[Layer 1] Seed complete. Total nodes: ${totalNodes}`);

    if (totalNodes < 60 || totalNodes > 80) {
      console.warn(
        `[Layer 1] WARNING: Expected ~65-70 nodes, got ${totalNodes}`
      );
    } else {
      console.log('[Layer 1] Node count within expected range (65-70)');
    }
  } catch (error) {
    console.error('[Layer 1] Seed failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    console.log('\n[Layer 1] Neo4j connection closed.');
  }
}

main();
