import { ConceptMappingRepository } from '../repositories/concept-mapping.repository';

/** Response shape for a single concept mapping in the API. */
export interface ConceptMappingResponse {
  chunkUuid: string;
  chunkExcerpt: string;
  subConceptUuid: string;
  subConceptName: string;
  confidence: number;
  status: 'pending';
}

/** Result of a bulk verify operation. */
export interface BulkVerifyResult {
  verifiedCount: number;
}

/**
 * ConceptMappingService — business logic for TEACHES verification workflow.
 * Dual-write: Supabase FIRST, then Neo4j (Rule 2).
 * Calls ConceptMappingRepository for all DB access.
 */
export class ConceptMappingService {
  private readonly repository: ConceptMappingRepository;

  constructor() {
    this.repository = new ConceptMappingRepository();
  }

  /**
   * Get all pending TEACHES mappings for a course.
   * Returns mappings that have not yet been verified or rejected.
   */
  async getMappings(courseId: string): Promise<ConceptMappingResponse[]> {
    const mappings = await this.repository.getConceptMappingsForCourse(courseId);

    return mappings.map((m) => ({
      chunkUuid: m.chunkUuid,
      chunkExcerpt: m.chunkExcerpt,
      subConceptUuid: m.subConceptUuid,
      subConceptName: m.subConceptName,
      confidence: m.confidence,
      status: 'pending' as const,
    }));
  }

  /**
   * Verify a TEACHES mapping — creates TEACHES_VERIFIED in Neo4j.
   * Dual-write: Supabase first (audit log), then Neo4j (MERGE TEACHES_VERIFIED).
   */
  async verifyMapping(
    chunkUuid: string,
    subConceptUuid: string,
    facultyUuid: string,
  ): Promise<void> {
    // Step 1: Write Supabase (source of truth) — audit log
    await this.repository.insertVerification({
      chunk_id: chunkUuid,
      sub_concept_id: subConceptUuid,
      verified_by: facultyUuid,
      action: 'verify',
    });

    // Step 2: Write Neo4j — MERGE TEACHES_VERIFIED edge
    await this.repository.mergeTeachesVerified(chunkUuid, subConceptUuid, facultyUuid);
  }

  /**
   * Reject a TEACHES mapping — deletes TEACHES edge in Neo4j.
   * Dual-write: Supabase first (audit log), then Neo4j (DELETE TEACHES).
   */
  async rejectMapping(
    chunkUuid: string,
    subConceptUuid: string,
    facultyUuid: string,
  ): Promise<void> {
    // Step 1: Write Supabase (source of truth) — audit log
    await this.repository.insertVerification({
      chunk_id: chunkUuid,
      sub_concept_id: subConceptUuid,
      verified_by: facultyUuid,
      action: 'reject',
    });

    // Step 2: Write Neo4j — DELETE TEACHES edge
    await this.repository.deleteTeachesEdge(chunkUuid, subConceptUuid);
  }

  /**
   * Bulk-verify all high-confidence TEACHES mappings for a course.
   * Threshold default: 0.85.
   * Each mapping gets dual-written individually (Supabase first, then Neo4j).
   */
  async bulkVerifyHighConfidence(
    courseId: string,
    facultyUuid: string,
    threshold = 0.85,
  ): Promise<BulkVerifyResult> {
    const mappings = await this.repository.getHighConfidenceMappings(courseId, threshold);

    let verifiedCount = 0;

    for (const mapping of mappings) {
      // Dual-write each mapping: Supabase first, then Neo4j
      await this.repository.insertVerification({
        chunk_id: mapping.chunkUuid,
        sub_concept_id: mapping.subConceptUuid,
        verified_by: facultyUuid,
        action: 'verify',
      });

      await this.repository.mergeTeachesVerified(
        mapping.chunkUuid,
        mapping.subConceptUuid,
        facultyUuid,
      );

      verifiedCount++;
    }

    return { verifiedCount };
  }
}
