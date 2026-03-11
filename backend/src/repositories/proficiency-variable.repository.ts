import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProficiencyVariableRow } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';

export interface ProficiencyVariableInsertData {
  id: string;
  name: string;
  sub_concept_id: string;
}

/**
 * ProficiencyVariableRepository — Supabase queries for proficiency_variables table.
 *
 * Note: sub_concept_id is a conceptual reference (UUID matching the SubConcept uuid
 * in Neo4j). There is no sub_concepts table in Supabase — SubConcepts live in Neo4j.
 * Use neo4j_node_id for cross-reference (set by DualWriteService on sync).
 */
export class ProficiencyVariableRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  /**
   * Upsert a proficiency variable. Uses name as the conflict key to ensure
   * 1:1 mapping with SubConcepts (which are also merged by name in Neo4j).
   */
  async upsertProficiencyVariable(
    data: ProficiencyVariableInsertData,
  ): Promise<ProficiencyVariableRow> {
    const { data: result, error } = await this.supabase
      .from('proficiency_variables')
      .upsert(
        {
          id: data.id,
          name: data.name,
          sub_concept_id: data.sub_concept_id,
        },
        { onConflict: 'name' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to upsert proficiency variable "${data.name}": ${error.message}`,
      );
    }

    return result as ProficiencyVariableRow;
  }

  /**
   * Find a proficiency variable by its SubConcept UUID.
   */
  async findBySubConceptId(subConceptId: string): Promise<ProficiencyVariableRow | null> {
    const { data, error } = await this.supabase
      .from('proficiency_variables')
      .select()
      .eq('sub_concept_id', subConceptId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find proficiency variable by sub_concept_id ${subConceptId}: ${error.message}`,
      );
    }

    return (data as ProficiencyVariableRow) ?? null;
  }

  /**
   * Count all proficiency variables.
   */
  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from('proficiency_variables')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count proficiency variables: ${error.message}`);
    }

    return count ?? 0;
  }
}
