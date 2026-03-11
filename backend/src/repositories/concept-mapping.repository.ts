import type { SupabaseClient } from '@supabase/supabase-js';
import type { Driver } from 'neo4j-driver';
import SupabaseClientSingleton from '../lib/SupabaseClient';
import Neo4jClient from '../lib/Neo4jClient';

/** Shape of a single TEACHES mapping returned from Neo4j. */
export interface ConceptMappingRow {
  chunkUuid: string;
  chunkExcerpt: string;
  subConceptUuid: string;
  subConceptName: string;
  confidence: number;
}

/** Shape of a teaches_verifications row for Supabase insert. */
export interface TeachesVerificationInsert {
  chunk_id: string;
  sub_concept_id: string;
  verified_by: string;
  action: 'verify' | 'reject';
}

/**
 * ConceptMappingRepository — all DB queries for TEACHES verification workflow.
 * Neo4j for graph traversals, Supabase for verification audit log.
 */
export class ConceptMappingRepository {
  private readonly supabase: SupabaseClient;
  private readonly driver: Driver;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
    this.driver = Neo4jClient.getInstance();
  }

  /**
   * Helper to convert Neo4j Integer objects to JS numbers.
   */
  private toNumber(val: unknown): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
      return (val as { toNumber: () => number }).toNumber();
    }
    return Number(val);
  }

  /**
   * Get all TEACHES mappings for a course.
   * Path: (ContentChunk)-[:IN_COURSE]->(Course), (ContentChunk)-[t:TEACHES]->(SubConcept)
   * Excludes mappings that already have a TEACHES_VERIFIED edge.
   */
  async getConceptMappingsForCourse(courseId: string): Promise<ConceptMappingRow[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (cc:ContentChunk)-[:IN_COURSE]->(c:Course {uuid: $courseId})
         MATCH (cc)-[t:TEACHES]->(sc:SubConcept)
         WHERE NOT (cc)-[:TEACHES_VERIFIED]->(sc)
         RETURN cc.uuid AS chunkUuid,
                COALESCE(cc.excerpt, '') AS chunkExcerpt,
                sc.uuid AS subConceptUuid,
                sc.name AS subConceptName,
                COALESCE(t.confidence, 0.5) AS confidence
         ORDER BY confidence DESC`,
        { courseId },
      );

      return result.records.map((record) => ({
        chunkUuid: record.get('chunkUuid') as string,
        chunkExcerpt: record.get('chunkExcerpt') as string,
        subConceptUuid: record.get('subConceptUuid') as string,
        subConceptName: record.get('subConceptName') as string,
        confidence: this.toNumber(record.get('confidence')),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * MERGE a TEACHES_VERIFIED edge in Neo4j.
   * Uses MERGE (Rule 3) for idempotency.
   */
  async mergeTeachesVerified(
    chunkUuid: string,
    subConceptUuid: string,
    facultyUuid: string,
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (cc:ContentChunk {uuid: $chunkUuid})
         MATCH (sc:SubConcept {uuid: $subConceptUuid})
         MERGE (cc)-[:TEACHES_VERIFIED {
           verified_by: $facultyUuid,
           verified_at: datetime(),
           authority: 'FACULTY_CONFIRMED'
         }]->(sc)`,
        { chunkUuid, subConceptUuid, facultyUuid },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * DELETE the TEACHES edge between a chunk and subconcept (on reject).
   * Does NOT touch TEACHES_VERIFIED if it existed.
   */
  async deleteTeachesEdge(chunkUuid: string, subConceptUuid: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (cc:ContentChunk {uuid: $chunkUuid})-[r:TEACHES]->(sc:SubConcept {uuid: $subConceptUuid})
         DELETE r`,
        { chunkUuid, subConceptUuid },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get all pending TEACHES mappings for a course with confidence >= threshold.
   * Used by bulk-verify endpoint.
   */
  async getHighConfidenceMappings(
    courseId: string,
    threshold: number,
  ): Promise<ConceptMappingRow[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (cc:ContentChunk)-[:IN_COURSE]->(c:Course {uuid: $courseId})
         MATCH (cc)-[t:TEACHES]->(sc:SubConcept)
         WHERE NOT (cc)-[:TEACHES_VERIFIED]->(sc)
           AND COALESCE(t.confidence, 0.5) >= $threshold
         RETURN cc.uuid AS chunkUuid,
                COALESCE(cc.excerpt, '') AS chunkExcerpt,
                sc.uuid AS subConceptUuid,
                sc.name AS subConceptName,
                COALESCE(t.confidence, 0.5) AS confidence
         ORDER BY confidence DESC`,
        { courseId, threshold },
      );

      return result.records.map((record) => ({
        chunkUuid: record.get('chunkUuid') as string,
        chunkExcerpt: record.get('chunkExcerpt') as string,
        subConceptUuid: record.get('subConceptUuid') as string,
        subConceptName: record.get('subConceptName') as string,
        confidence: this.toNumber(record.get('confidence')),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Insert a verification record into Supabase teaches_verifications table.
   * Supabase is always written FIRST (Rule 2).
   */
  async insertVerification(data: TeachesVerificationInsert): Promise<string> {
    const { data: row, error } = await this.supabase
      .from('teaches_verifications')
      .insert(data)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to insert teaches_verification: ${error.message}`);
    }

    return (row as { id: string }).id;
  }
}
