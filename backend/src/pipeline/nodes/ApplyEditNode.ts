/**
 * ApplyEditNode — Sonnet applies the faculty's conversational edit instruction
 * to the loaded assessment item.
 *
 * Model: claude-sonnet-4-6 (Rule 6: Sonnet for generation).
 *
 * P2-009 Enhancement: Instruction parser routes edits by section.
 * Uses keyword matching only (no LLM call for routing).
 *
 * Responsibilities:
 * 1. Parse edit instruction to determine RefinementTarget (keyword matching)
 * 2. Inject section-specific guidance into the prompt
 * 3. Call Sonnet to produce edited item
 * 4. Validate output structure (5 options, exactly 1 correct)
 * 5. Update assessment_items row in Supabase with edited content
 * 6. Replace options in Supabase
 * 7. Track which sections were edited + refinement target
 *
 * Failure mode (CP-EPIC-2.2 #5): validates that exactly one option
 * remains is_correct: true after edit.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, RefinementTarget } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import AnthropicClient from '../../lib/AnthropicClient';
import { ItemRepository } from '../../repositories/item.repository';

// ── Constants ──────────────────────────────────────────────────────────────────

/** Sonnet model for generation (Rule 6). */
const EDIT_MODEL = 'claude-sonnet-4-6';

// ── Keyword patterns for instruction parsing (P2-009) ──────────────────────────
// Each pattern maps a set of keywords/phrases to a RefinementTarget.
// Order matters: first match wins. More specific patterns come first.

interface KeywordRule {
  target: RefinementTarget;
  /** At least one pattern must match (case-insensitive). */
  patterns: RegExp[];
}

const KEYWORD_RULES: readonly KeywordRule[] = [
  // Full regeneration — signals the whole item is bad
  {
    target: 'full_regeneration',
    patterns: [
      /everything.*(wrong|bad|terrible|awful|poor)/i,
      /start\s*(over|from\s*scratch)/i,
      /regenerate\s*(everything|the\s*whole|entirely|completely)/i,
      /redo\s*(everything|the\s*whole|it\s*all)/i,
      /rewrite\s*(everything|the\s*whole|entirely|completely)/i,
      /completely\s*(redo|rewrite|regenerate|wrong)/i,
    ],
  },
  // Answer change — explicitly change which option is correct
  {
    target: 'answer_change',
    patterns: [
      /change\s*(the\s*)?correct\s*answer/i,
      /correct\s*answer\s*(to|should\s*be)\s*[A-E]/i,
      /make\s*(?:option\s*)?[A-E]\s*(the\s*)?correct/i,
      /answer\s*(should\s*be|to)\s*[A-E]/i,
      /switch\s*(the\s*)?correct/i,
      /swap\s*(the\s*)?correct/i,
    ],
  },
  // Vignette-only — only the clinical vignette needs editing
  {
    target: 'vignette_only',
    patterns: [
      /vignette/i,
      /clinical\s*(scenario|case|presentation)/i,
      /patient\s*(history|presentation|story)/i,
      /case\s*(presentation|description)/i,
      /shorten\s*the\s*(story|scenario)/i,
    ],
  },
  // Stem-only — only the question stem
  {
    target: 'stem_only',
    patterns: [
      /\bstem\b/i,
      /\blead[\s-]*in\b/i,
      /\bquestion\s*(text|wording)\b/i,
      /rephrase\s*the\s*question/i,
      /reword\s*the\s*question/i,
    ],
  },
  // Distractor-only — only the answer options
  {
    target: 'distractor_only',
    patterns: [
      /distractor/i,
      /\boption/i,
      /\banswer\s*choice/i,
      /\bchoice/i,
      /harder\s*(distract|option|answer|choice)/i,
      /easier\s*(distract|option|answer|choice)/i,
      /more\s*plausible/i,
      /less\s*obvious/i,
    ],
  },
  // targeted_edit is the fallback — handled by the else branch
] as const;

// ── Section focus guidance (injected into prompt per target) ─────────────────

const SECTION_GUIDANCE: Record<RefinementTarget, string> = {
  vignette_only:
    'FOCUS: Only modify the vignette. Keep the stem and all options exactly as they are.',
  stem_only:
    'FOCUS: Only modify the stem (lead-in question). Keep the vignette and all options exactly as they are.',
  distractor_only:
    'FOCUS: Only modify the answer options. Keep the vignette and stem exactly as they are.',
  answer_change:
    'FOCUS: Change which option is marked as correct. Adjust rationales accordingly. Keep vignette and stem as they are.',
  full_regeneration:
    'FOCUS: This is a full rewrite. Regenerate the vignette, stem, and all options from scratch based on the same target concepts.',
  targeted_edit:
    'Apply the requested edit surgically. Only modify the sections that the instruction references.',
};

// ── Zod schema for edit response ───────────────────────────────────────────────

const EditedOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
  is_correct: z.boolean(),
  rationale: z.string(),
  misconception_targeted: z.string().optional(),
});

const EditResponseSchema = z.object({
  vignette: z.string(),
  stem: z.string(),
  options: z.array(EditedOptionSchema).length(5),
  editedSections: z.array(z.string()),
});

type EditResponse = z.infer<typeof EditResponseSchema>;

// ── Prompt loading (Rule 8: never inline) ──────────────────────────────────────

function loadPrompt(name: string): string {
  return readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

// ── Instruction Parser (P2-009: keyword matching only, no LLM) ─────────────────

/**
 * Parse a faculty edit instruction to determine which section(s) to target.
 * Uses keyword matching only — no LLM call needed for routing.
 *
 * Returns the RefinementTarget that best matches the instruction.
 * Falls back to 'targeted_edit' (general Sonnet edit) if no specific pattern matches.
 */
export function parseRefinementInstruction(instruction: string): RefinementTarget {
  for (const rule of KEYWORD_RULES) {
    const matched = rule.patterns.some((pattern) => pattern.test(instruction));
    if (matched) {
      return rule.target;
    }
  }

  // Default: general targeted edit — Sonnet decides what to change
  return 'targeted_edit';
}

/**
 * Map a RefinementTarget to the expected editedSections array.
 * This provides a hint to the UI about which sections will likely change.
 */
function expectedSectionsForTarget(target: RefinementTarget): string[] {
  switch (target) {
    case 'vignette_only':
      return ['vignette'];
    case 'stem_only':
      return ['stem'];
    case 'distractor_only':
      return ['options'];
    case 'answer_change':
      return ['options'];
    case 'full_regeneration':
      return ['vignette', 'stem', 'options'];
    case 'targeted_edit':
      // Unknown ahead of time — Sonnet will report what it changed
      return [];
  }
}

// ── Node implementation ────────────────────────────────────────────────────────

export class ApplyEditNode implements IPipelineNode {
  readonly name = 'apply_edit';

  private readonly itemRepo: ItemRepository;

  constructor() {
    this.itemRepo = new ItemRepository();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    const editInstruction = state.editInstruction ?? state.userMessage;

    console.log(`[${this.name}] applying edit: "${editInstruction.slice(0, 80)}..."`);

    // 1. Parse instruction to determine refinement target (P2-009: keyword matching only)
    const refinementTarget = parseRefinementInstruction(editInstruction);
    console.log(`[${this.name}] refinement target: ${refinementTarget}`);

    // 2. Load base prompt (Rule 8) and inject section guidance
    const basePrompt = loadPrompt('apply-edit-system');
    const guidance = SECTION_GUIDANCE[refinementTarget];
    const systemPrompt = `${basePrompt}\n\n## Section Focus (auto-detected)\n${guidance}`;

    // 3. Build user message with current item + edit instruction
    const userContent = this.buildUserContent(state, editInstruction);

    // 4. Call Sonnet
    let editResponse: EditResponse;

    try {
      const anthropic = AnthropicClient.getInstance();

      const message = await anthropic.messages.create({
        model: EDIT_MODEL,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 4096,
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in Sonnet response');
      }

      // Extract JSON — handle possible markdown code fences
      let rawJson = textBlock.text.trim();
      if (rawJson.startsWith('```')) {
        rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed: unknown = JSON.parse(rawJson);
      editResponse = EditResponseSchema.parse(parsed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] Sonnet edit failed: ${errorMessage}`);

      const failMessage = new AIMessage({
        content: `Edit failed: ${errorMessage}. The original question was preserved.`,
      });

      return {
        messages: [failMessage],
      } as Partial<WorkbenchState>;
    }

    // 5. Validate: exactly one option is correct (failure mode #5)
    const correctCount = editResponse.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      console.error(`[${this.name}] invalid edit: ${correctCount} correct options (expected 1)`);

      const failMessage = new AIMessage({
        content: `Edit produced ${correctCount} correct answers (expected exactly 1). Original question preserved.`,
      });

      return {
        messages: [failMessage],
      } as Partial<WorkbenchState>;
    }

    // 6. Merge editedSections: use Sonnet's report, enriched with expected sections
    const expectedSections = expectedSectionsForTarget(refinementTarget);
    const reportedSections = editResponse.editedSections;
    const mergedSections = Array.from(
      new Set([...reportedSections, ...expectedSections]),
    );

    // 7. Persist edited content to Supabase
    const itemId = state.itemId;
    if (itemId) {
      try {
        await this.itemRepo.updateContent(itemId, {
          vignette: editResponse.vignette,
          stem: editResponse.stem,
        });

        await this.itemRepo.replaceOptions(itemId, editResponse.options);

        console.log(`[${this.name}] persisted edited content to item ${itemId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[${this.name}] failed to persist edit: ${errorMessage}`);
        // Continue pipeline — state is updated even if DB write fails
      }
    }

    // 8. Build state update
    const stateUpdate = new WorkbenchStateBuilder()
      .withVignette(editResponse.vignette)
      .withStem(editResponse.stem)
      .withOptions(editResponse.options)
      .withEditedSections(mergedSections)
      .withRefinementTarget(refinementTarget)
      .build();

    // 9. TEXT_MESSAGE
    const sectionsChanged = mergedSections.join(', ') || 'none';
    const targetLabel = refinementTarget.replace(/_/g, ' ');
    const textMessage = new AIMessage({
      content: `Edit applied (${targetLabel}). Sections modified: ${sectionsChanged}. Revalidating...`,
    });

    console.log(`[${this.name}] edit applied — target: ${refinementTarget}, sections: ${sectionsChanged}`);

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  /**
   * Build the user prompt with current item content and the edit instruction.
   */
  private buildUserContent(state: WorkbenchState, editInstruction: string): string {
    const optionsText = state.options
      .map((opt) => {
        const correctMarker = opt.is_correct ? ' [CORRECT]' : '';
        return `${opt.label}. ${opt.text}${correctMarker}\n   Rationale: ${opt.rationale}`;
      })
      .join('\n');

    return [
      '## Current Question',
      '',
      '### Vignette',
      state.vignette,
      '',
      '### Stem',
      state.stem,
      '',
      '### Options',
      optionsText,
      '',
      '## Edit Instruction',
      editInstruction,
      '',
      'Apply the edit instruction above. Return the full updated question as JSON.',
    ].join('\n');
  }
}
