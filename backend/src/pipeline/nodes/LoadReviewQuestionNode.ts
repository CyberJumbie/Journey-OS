/**
 * LoadReviewQuestionNode — loads an existing assessment item from Supabase
 * by reviewItemId and populates WorkbenchState for review mode editing.
 *
 * NO AI calls. Pure data loading only.
 *
 * Responsibilities:
 * 1. Load assessment item + options from Supabase by reviewItemId
 * 2. Populate WorkbenchState with vignette, stem, options
 * 3. Create a version snapshot (Rule 27: always version before editing)
 * 4. Create generation_logs row for this review session
 * 5. Emit TEXT_MESSAGE: "Loaded question for review..."
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, GeneratedOption } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import { ItemRepository } from '../../repositories/item.repository';
import type { OptionRow } from '@journey-os/shared-types';
import { GenerationLogRepository } from '../../repositories/generation-log.repository';

/**
 * Map Supabase OptionRow to pipeline GeneratedOption shape.
 */
function mapOptionRowToGenerated(row: OptionRow): GeneratedOption {
  return {
    label: row.label,
    text: row.option_text ?? '',
    is_correct: row.is_correct,
    rationale: row.distractor_rationale ?? '',
    misconception_targeted: row.misconception_targeted ?? undefined,
  };
}

export class LoadReviewQuestionNode implements IPipelineNode {
  readonly name = 'load_review_question';

  private readonly itemRepo: ItemRepository;
  private readonly generationLogRepo: GenerationLogRepository;

  constructor() {
    this.itemRepo = new ItemRepository();
    this.generationLogRepo = new GenerationLogRepository();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    const reviewItemId = state.reviewItemId;

    if (!reviewItemId) {
      throw new Error('Review mode requires reviewItemId in state');
    }

    console.log(`[${this.name}] loading item ${reviewItemId} for review`);

    // 1. Load item with options from Supabase
    const item = await this.itemRepo.findByIdWithOptions(reviewItemId);
    if (!item) {
      throw new Error(`Assessment item not found: ${reviewItemId}`);
    }

    // 2. Map options to GeneratedOption format
    const options: GeneratedOption[] = item.options.map(mapOptionRowToGenerated);

    // 3. Create version snapshot before editing (Rule 27)
    try {
      await this.itemRepo.createVersion({
        item_id: reviewItemId,
        vignette: item.vignette,
        stem: item.stem,
        options,
        edit_instruction: state.editInstruction,
        edited_by: null, // TODO: populate from auth context when available
      });
      console.log(`[${this.name}] version snapshot created for item ${reviewItemId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] version snapshot failed: ${errorMessage}`);
      // Do not abort — continue with the review even if versioning fails
    }

    // 4. Create generation_logs row for this review session
    const generationLog = await this.generationLogRepo.create({
      course_id: item.course_id ?? state.courseId,
      mode: 'review',
      input_message: state.userMessage,
    });

    console.log(`[${this.name}] review session log: ${generationLog.id}`);

    // 5. Build state update
    const stateUpdate = new WorkbenchStateBuilder()
      .withPipelineStatus('running')
      .withVignette(item.vignette ?? '')
      .withStem(item.stem ?? '')
      .withOptions(options)
      .withItemId(reviewItemId)
      .withGenerationLogId(generationLog.id)
      .withEditInstruction(state.userMessage)
      .build();

    // 6. TEXT_MESSAGE for CopilotKit
    const stemPreview = (item.stem ?? '').slice(0, 60);
    const textMessage = new AIMessage({
      content: `Loaded question for review: "${stemPreview}..."`,
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
