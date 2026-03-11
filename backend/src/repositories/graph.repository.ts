import type { Driver } from 'neo4j-driver';
import Neo4jClient from '../lib/Neo4jClient.js';

/** Lightweight course data returned from Neo4j (skinny node). */
export interface CourseGraphData {
  uuid: string;
  code: string;
  name: string;
}

/**
 * GraphRepository — all Neo4j queries live here.
 * Uses MERGE (never CREATE) for idempotent writes.
 * Skinny nodes: only uuid + essential props. Full text stays in Supabase.
 */
export class GraphRepository {
  private readonly driver: Driver;

  constructor() {
    this.driver = Neo4jClient.getInstance();
  }

  /**
   * Load a Course node by its uuid.
   * Returns null if not found.
   */
  async findCourseByUuid(courseId: string): Promise<CourseGraphData | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (c:Course {uuid: $courseId})
         RETURN c.uuid AS uuid, c.code AS code, c.name AS name`,
        { courseId },
      );

      const record = result.records[0];
      if (!record) return null;

      return {
        uuid: record.get('uuid') as string,
        code: record.get('code') as string,
        name: record.get('name') as string,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get all SubConcept names taught by ContentChunks belonging to a course.
   * Path: (ContentChunk)-[:TEACHES]->(SubConcept), filtered by chunks
   * that have an IN_COURSE relationship to the given Course.
   */
  async getSubConceptsForCourse(courseId: string): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (cc:ContentChunk)-[:IN_COURSE]->(c:Course {uuid: $courseId})
         MATCH (cc)-[:TEACHES]->(sc:SubConcept)
         RETURN DISTINCT sc.name AS name
         ORDER BY sc.name`,
        { courseId },
      );
      return result.records.map((r) => r.get('name') as string);
    } finally {
      await session.close();
    }
  }

  /**
   * Create or merge a ContentChunk node (skinny: uuid + chunk_index only).
   * Returns the Neo4j element ID.
   */
  async mergeContentChunk(uuid: string, chunkIndex: number): Promise<string> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MERGE (cc:ContentChunk {uuid: $uuid})
         SET cc.chunk_index = $chunkIndex
         RETURN elementId(cc) AS nodeId`,
        { uuid, chunkIndex },
      );

      const record = result.records[0];
      if (!record) {
        throw new Error(`Failed to merge ContentChunk node: ${uuid}`);
      }

      return record.get('nodeId') as string;
    } finally {
      await session.close();
    }
  }

  /**
   * Create or merge a SubConcept node (skinny: uuid + name).
   * Returns the Neo4j element ID.
   */
  async mergeSubConcept(uuid: string, name: string): Promise<string> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MERGE (sc:SubConcept {name: $name})
         ON CREATE SET sc.uuid = $uuid
         RETURN elementId(sc) AS nodeId`,
        { uuid, name },
      );

      const record = result.records[0];
      if (!record) {
        throw new Error(`Failed to merge SubConcept node: ${name}`);
      }

      return record.get('nodeId') as string;
    } finally {
      await session.close();
    }
  }

  /**
   * Create TEACHES edge: (ContentChunk)-[:TEACHES]->(SubConcept).
   * TEACHES goes ContentChunk -> SubConcept (NOT Course -> SubConcept).
   */
  async mergeTeachesEdge(chunkUuid: string, subConceptName: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (cc:ContentChunk {uuid: $chunkUuid})
         MATCH (sc:SubConcept {name: $subConceptName})
         MERGE (cc)-[:TEACHES]->(sc)`,
        { chunkUuid, subConceptName },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Create MAPS_TO edge: (SubConcept)-[:MAPS_TO]->(USMLE_System).
   * Also stores convenience prop on SubConcept.
   */
  async mergeMapToSystem(subConceptName: string, systemName: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (sc:SubConcept {name: $subConceptName})
         MATCH (us:USMLE_System {name: $systemName})
         MERGE (sc)-[:MAPS_TO]->(us)
         SET sc.usmle_system = $systemName`,
        { subConceptName, systemName },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Create MAPS_TO edge: (SubConcept)-[:MAPS_TO]->(USMLE_Discipline).
   * Also stores convenience prop on SubConcept.
   */
  async mergeMapToDiscipline(subConceptName: string, disciplineName: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (sc:SubConcept {name: $subConceptName})
         MATCH (ud:USMLE_Discipline {name: $disciplineName})
         MERGE (sc)-[:MAPS_TO]->(ud)
         SET sc.usmle_discipline = $disciplineName`,
        { subConceptName, disciplineName },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find ContentChunk UUIDs that TEACH a SubConcept matching the given concept name.
   * Used by ContextCompilerNode for Graph RAG path.
   */
  async findChunkIdsBySubConcept(conceptName: string): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (sc:SubConcept)
         WHERE toLower(sc.name) CONTAINS toLower($conceptName)
         MATCH (chunk:ContentChunk)-[:TEACHES]->(sc)
         RETURN chunk.uuid AS chunk_id`,
        { conceptName },
      );
      return result.records.map((r) => r.get('chunk_id') as string);
    } finally {
      await session.close();
    }
  }

  /**
   * Get all USMLE_System node names for fuzzy matching.
   */
  async getAllSystemNames(): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (us:USMLE_System) RETURN us.name AS name`,
      );
      return result.records.map((r) => r.get('name') as string);
    } finally {
      await session.close();
    }
  }

  /**
   * Get all USMLE_Discipline node names for fuzzy matching.
   */
  async getAllDisciplineNames(): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (ud:USMLE_Discipline) RETURN ud.name AS name`,
      );
      return result.records.map((r) => r.get('name') as string);
    } finally {
      await session.close();
    }
  }

  /**
   * MERGE an AssessmentItem node with all required relationships.
   * Skinny node: only uuid + bloom_level + status + created_at (Rule 4).
   * Full text (vignette, stem, rationale) stays in Supabase only.
   *
   * Relationships created:
   * - AssessmentItem -[:TARGETS]-> SubConcept
   * - AssessmentItem -[:AT_BLOOM]-> BloomLevel
   * - AssessmentItem -[:IN_COURSE]-> Course
   * - AssessmentItem -[:GENERATED_FROM]-> ContentChunk (one per source chunk)
   *
   * Returns the Neo4j element ID of the AssessmentItem node.
   */
  async mergeAssessmentItem(params: {
    itemId: string;
    bloomLevel: number;
    courseId: string;
    targetConcepts: string[];
    sourceChunkIds: string[];
  }): Promise<string> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();

      // Step 1: MERGE the AssessmentItem node (skinny: uuid + bloom_level + status + created_at)
      const itemResult = await session.run(
        `MERGE (ai:AssessmentItem {uuid: $itemId})
         SET ai.bloom_level = $bloomLevel, ai.status = 'draft', ai.created_at = $now
         RETURN elementId(ai) AS nodeId`,
        { itemId: params.itemId, bloomLevel: params.bloomLevel, now },
      );

      const itemRecord = itemResult.records[0];
      if (!itemRecord) {
        throw new Error(`Failed to merge AssessmentItem node: ${params.itemId}`);
      }

      const nodeId = itemRecord.get('nodeId') as string;

      // Step 2: MERGE IN_COURSE relationship
      await session.run(
        `MATCH (ai:AssessmentItem {uuid: $itemId})
         MATCH (c:Course {uuid: $courseId})
         MERGE (ai)-[:IN_COURSE]->(c)`,
        { itemId: params.itemId, courseId: params.courseId },
      );

      // Step 3: MERGE AT_BLOOM relationship
      await session.run(
        `MATCH (ai:AssessmentItem {uuid: $itemId})
         MERGE (bl:BloomLevel {level: $bloomLevel})
         MERGE (ai)-[:AT_BLOOM]->(bl)`,
        { itemId: params.itemId, bloomLevel: params.bloomLevel },
      );

      // Step 4: MERGE TARGETS relationship for each target concept
      for (const conceptName of params.targetConcepts) {
        await session.run(
          `MATCH (ai:AssessmentItem {uuid: $itemId})
           MATCH (sc:SubConcept {name: $conceptName})
           MERGE (ai)-[:TARGETS]->(sc)`,
          { itemId: params.itemId, conceptName },
        );
      }

      // Step 5: MERGE GENERATED_FROM relationship for each source chunk
      for (const chunkId of params.sourceChunkIds) {
        await session.run(
          `MATCH (ai:AssessmentItem {uuid: $itemId})
           MATCH (cc:ContentChunk {uuid: $chunkId})
           MERGE (ai)-[:GENERATED_FROM]->(cc)`,
          { itemId: params.itemId, chunkId },
        );
      }

      return nodeId;
    } finally {
      await session.close();
    }
  }
}
