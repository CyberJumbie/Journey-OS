/**
 * GraphWriterNode — persists the validated item to both databases.
 *
 * NO model calls. Pure DB writes only.
 *
 * Responsibilities:
 * 1. Insert assessment_items row to Supabase (via DualWriteService)
 * 2. MERGE AssessmentItem node + relationships to Neo4j (via DualWriteService)
 * 3. Insert 5 options rows to Supabase (options don't go to Neo4j)
 * 4. Update generation_logs: status='completed', duration_ms, completed_at
 * 5. Set pipelineStatus='completed', itemId from the inserted row
 *
 * DualWriteService enforces: Supabase first, Neo4j second (Rule: DUAL_WRITE_ORDER).
 * All Neo4j writes use MERGE, never CREATE (Rule 3).
 * Skinny Neo4j nodes: only uuid + bloom_level + status + created_at (Rule 4).
 */

import { AIMessage } from '@langchain/core/messages';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkbenchState, GeneratedOption } from '@journey-os/shared-types';
import type { AssessmentItemRow, OptionInsert } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import { DualWriteService } from '../../services/dual-write.service.js';
import { GraphRepository } from '../../repositories/graph.repository.js';
import { GenerationLogRepository } from '../../repositories/generation-log.repository.js';
import SupabaseClientSingleton from '../../lib/SupabaseClient.js';

/** Default Bloom level when targetConcepts don't specify one. */
const DEFAULT_BLOOM_LEVEL = 3; // Application

export class GraphWriterNode implements IPipelineNode {
  readonly name = 'graph_writer';

  private readonly dualWrite: DualWriteService;
  private readonly graphRepo: GraphRepository;
  private readonly generationLogRepo: GenerationLogRepository;
  private readonly supabase: SupabaseClient;

  constructor() {
    this.dualWrite = new DualWriteService();
    this.graphRepo = new GraphRepository();
    this.generationLogRepo = new GenerationLogRepository();
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] persisting generated item to databases`);

    const bloomLevel = DEFAULT_BLOOM_LEVEL;

    // ── 1. Dual-write assessment_items: Supabase first, Neo4j second ──────────
    const item = await this.dualWrite.dualWrite<AssessmentItemRow>(
      // Supabase write: insert assessment_items row
      async () => {
        const { data, error } = await this.supabase
          .from('assessment_items')
          .insert({
            course_id: state.courseId,
            vignette: state.vignette,
            stem: state.stem,
            bloom_level: bloomLevel,
            status: 'draft',
            generation_log_id: state.generationLogId || null,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to insert assessment_items: ${error.message}`);
        }

        return data as AssessmentItemRow;
      },

      // Neo4j write: MERGE AssessmentItem node + relationships
      async (result: AssessmentItemRow) => {
        return await this.graphRepo.mergeAssessmentItem({
          itemId: result.id,
          bloomLevel,
          courseId: state.courseId,
          targetConcepts: state.targetConcepts,
          sourceChunkIds: state.sourceChunkIds ?? [],
        });
      },

      'assessment_items',
    );

    console.log(`[${this.name}] assessment_items created: ${item.id}`);

    // ── 2. Insert options to Supabase (options don't go to Neo4j) ─────────────
    const optionInserts: OptionInsert[] = state.options.map(
      (opt: GeneratedOption) => ({
        item_id: item.id,
        label: opt.label,
        option_text: opt.text,
        is_correct: opt.is_correct,
        distractor_rationale: opt.rationale,
        misconception_targeted: opt.misconception_targeted ?? undefined,
      }),
    );

    const { error: optionsError } = await this.supabase
      .from('options')
      .insert(optionInserts);

    if (optionsError) {
      throw new Error(`Failed to insert options: ${optionsError.message}`);
    }

    console.log(`[${this.name}] inserted ${optionInserts.length} options for item ${item.id}`);

    // ── 3. Update generation_logs: completed ──────────────────────────────────
    await this.updateGenerationLog(state.generationLogId);

    // ── 4. Build state update ─────────────────────────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withPipelineStatus('completed')
      .withItemId(item.id)
      .build();

    // ── 5. TEXT_MESSAGE for CopilotKit UI ─────────────────────────────────────
    const textMessage = new AIMessage({
      content: 'Question saved. Ready to review.',
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  /**
   * Update the generation_logs row with completion data.
   * Calculates duration_ms from created_at to now.
   */
  private async updateGenerationLog(generationLogId: string): Promise<void> {
    if (!generationLogId) {
      console.warn(`[${this.name}] no generationLogId — skipping log update`);
      return;
    }

    try {
      // Fetch the log to calculate duration from created_at
      const log = await this.generationLogRepo.findById(generationLogId);
      const now = new Date();
      let durationMs: number | null = null;

      if (log?.created_at) {
        const createdAt = new Date(log.created_at);
        durationMs = now.getTime() - createdAt.getTime();
      }

      await this.generationLogRepo.update(generationLogId, {
        status: 'completed',
        duration_ms: durationMs,
        completed_at: now.toISOString(),
      });

      console.log(
        `[${this.name}] generation_logs updated: status=completed, duration_ms=${durationMs}`,
      );
    } catch (err) {
      // Don't fail the pipeline if log update fails
      console.error(`[${this.name}] failed to update generation_logs:`, err);
    }
  }
}
