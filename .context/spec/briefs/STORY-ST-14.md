# STORY-ST-14: Feedback View

**Epic:** E-41 (Adaptive Practice UI)
**Feature:** F-19
**Sprint:** 32
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-41-3

---

## User Story
As a **Student (Marcus Williams)**, I need immediate feedback after each answer showing whether I was correct with a rationale and evidence so that I can learn from mistakes in real time.

## Acceptance Criteria
- [ ] Correct/incorrect indicator with color coding (green/red) AND icons (check/X) for accessibility
- [ ] Correct answer highlighted if student answered incorrectly
- [ ] Rationale text explaining why the correct answer is right
- [ ] Distractor explanations: why each incorrect option is wrong
- [ ] Evidence reference: link to source content (lecture, textbook section)
- [ ] Concept tag showing which concept this item tests
- [ ] Mastery delta: "+3% Cardiovascular" showing mastery change from this response
- [ ] "Continue" button to proceed to next question
- [ ] Optional "Report Issue" button for flagging bad items
- [ ] Smooth transition animation between question and feedback states
- [ ] Accessible: color is not the only indicator (icons for correct/incorrect)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentQuestionView.tsx` (post-answer state) | `apps/web/src/components/practice/feedback-view.tsx` | Extract the explanation card and answer result indicators from the answered state. Separate into dedicated feedback organism. Add evidence reference links. Add mastery delta badge. |
| `pages/student/StudentResults.tsx` (question review section) | `apps/web/src/components/practice/answer-result-indicator.tsx` | Reuse the correct/incorrect visual pattern (green/red circles with check/X icons) as a standalone molecule. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/practice/feedback.types.ts` |
| Organism | apps/web | `src/components/practice/feedback-view.tsx` |
| Molecule | apps/web | `src/components/practice/answer-result-indicator.tsx` |
| Molecule | apps/web | `src/components/practice/rationale-card.tsx` |
| Molecule | apps/web | `src/components/practice/evidence-reference.tsx` |
| Molecule | apps/web | `src/components/practice/mastery-delta-badge.tsx` |
| Molecule | apps/web | `src/components/practice/report-issue-button.tsx` |
| API Tests | apps/server | `src/modules/practice/__tests__/feedback-data.test.ts` |

## Database Schema
No additional tables. Feedback data is returned in the answer submission response (STORY-ST-13 API).

**Data sources:**
- `assessment_items.rationale` (JSONB) — correct answer rationale
- `assessment_items.distractor_explanations` (JSONB) — per-option explanations
- `assessment_items.source_reference` (TEXT) — evidence reference link
- `mastery_history` (from STORY-ST-3) — mastery before/after for delta

## API Endpoints
No additional endpoints. Feedback data is included in the `POST /answer` response from STORY-ST-13.

The feedback response shape (from STORY-ST-13):
```typescript
{
  is_correct: boolean;
  correct_option: string;
  explanation: string;
  rationale: {
    correct: string;
    wrong_options: Record<string, string>;
  };
  mastery_delta: {
    concept: string;
    before: number;
    after: number;
  };
  evidence: {
    title: string;
    url: string;
    type: "lecture" | "textbook" | "article";
  } | null;
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-13 (question view must exist for feedback to appear after answer)
- **Cross-epic:** Evidence references link to content from E-10/E-11 (content upload pipeline)

## Testing Requirements
- **API Tests (70%):** Feedback data test validates correct answer rationale shape. Distractor explanations present for all incorrect options. Mastery delta correctly computed (after - before). Evidence reference included when available, null when not.
- **E2E (0%):** Covered by adaptive practice E2E in STORY-ST-13.

## Implementation Notes
- Feedback data is returned in the answer submission response (same API call as STORY-ST-13). No separate fetch needed.
- Rationale and distractor explanations are stored as item metadata in the item bank (`assessment_items` table).
- Mastery delta computed by BKT service as part of the update response and passed through.
- Consider skeleton loading for evidence references if they require additional fetch (e.g., resolving content chunk IDs to titles).
- Transition animation: fade-in the feedback view below the answer options after submission. Use CSS transitions with design token durations.
- The "Report Issue" button creates a flag record (same `session_flags` table from STORY-ST-13) with `flag_type = 'issue'`.
- Color-only feedback violates WCAG; always pair green/red with check/X icons.
