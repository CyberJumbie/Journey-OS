import type { SupabaseClient } from '@supabase/supabase-js';
import type { Driver } from 'neo4j-driver';
import type { CourseRow } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';
import Neo4jClient from '../lib/Neo4jClient';

/**
 * CourseRepository — all course-related DB queries live here.
 * Supabase for course rows + item counts.
 * Neo4j for subconcept counts (graph traversal).
 */
export class CourseRepository {
  private readonly supabase: SupabaseClient;
  private readonly driver: Driver;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
    this.driver = Neo4jClient.getInstance();
  }

  /**
   * Find all courses belonging to a given institution.
   * Returns typed CourseRow[] from Supabase.
   */
  async findByInstitution(institutionId: string): Promise<CourseRow[]> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('institution_id', institutionId)
      .order('code', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }

    return (data ?? []) as CourseRow[];
  }

  /**
   * Count SubConcepts linked to a course via content chunks in Neo4j.
   * Path: (ContentChunk)-[:IN_COURSE]->(Course), (ContentChunk)-[:TEACHES]->(SubConcept)
   */
  async getSubconceptCount(courseId: string): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (cc:ContentChunk)-[:IN_COURSE]->(c:Course {uuid: $courseId})
         MATCH (cc)-[:TEACHES]->(sc:SubConcept)
         RETURN count(DISTINCT sc) AS cnt`,
        { courseId },
      );

      const record = result.records[0];
      if (!record) return 0;

      const cnt = record.get('cnt');
      // Neo4j returns Integer objects; convert to JS number
      return typeof cnt === 'object' && cnt !== null && 'toNumber' in cnt
        ? (cnt as { toNumber: () => number }).toNumber()
        : Number(cnt);
    } finally {
      await session.close();
    }
  }

  /**
   * Count assessment items for a given course in Supabase.
   */
  async getItemCount(courseId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('assessment_items')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to count items for course ${courseId}: ${error.message}`);
    }

    return count ?? 0;
  }
}
