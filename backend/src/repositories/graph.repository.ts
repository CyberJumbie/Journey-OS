import type { Driver } from 'neo4j-driver';
import Neo4jClient from '../lib/Neo4jClient';

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
}
