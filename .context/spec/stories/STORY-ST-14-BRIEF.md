# STORY-ST-14 Brief: Feedback View

## 0. Lane & Priority

```yaml
story_id: STORY-ST-14
old_id: S-ST-41-3
lane: student
lane_priority: 4
within_lane_order: 14
sprint: 32
size: M
depends_on:
  - STORY-ST-13 (student) — Question View Component
blocks: []
personas_served: [student]
epic: E-41 (Adaptive Practice UI)
feature: F-19 (Adaptive Practice Engine)
user_flow: UF-28 (Adaptive Practice Session)
```

## 1. Summary

Build the **feedback view** displayed after each answer submission during an adaptive practice session. When a student submits an answer, the view shows a correct/incorrect indicator, highlights the correct answer if wrong, displays a rationale explaining the correct answer, distractor explanations for each wrong option, a mastery delta badge ("+3% Cardiovascular"), evidence references linking to source content, and a "Continue" button to proceed. An optional "Report Issue" button lets students flag bad items.

Key constraints:
- Feedback data comes from the answer submission response (same API call from ST-13 -- no additional fetch)
- Color is not the only indicator (icons for correct/incorrect for accessibility)
- Smooth transition animation between question and feedback states
- Skeleton loading for evidence references if they require additional fetch
- Concept tag shows which concept the item tests

## 2. Task Breakdown

1. **Types** — Create `FeedbackData`, `DistractorExplanation`, `MasteryDelta`, `ItemReport` in `packages/types/src/practice/feedback.types.ts`
2. **Frontend components** — `FeedbackView` (organism), `AnswerResultIndicator` (atom), `RationaleCard` (molecule), `EvidenceReference` (molecule), `MasteryDeltaBadge` (atom)
3. **Report Issue** — `ReportIssueButton` atom + minimal API hook (POST report)
4. **Animation** — Framer Motion or CSS transition for question-to-feedback swap
5. **Integration** — Wire `FeedbackView` into `PracticeSessionTemplate` from ST-13
6. **API tests** — ~6 tests for feedback data shape validation

## 3. Data Model

```typescript
// packages/types/src/practice/feedback.types.ts

/** Feedback displayed after answer submission */
export interface FeedbackData {
  readonly correct: boolean;
  readonly selected_key: string;
  readonly correct_key: string;
  readonly rationale: string;
  readonly distractor_explanations: Record<string, string>;
  readonly mastery_delta: MasteryDelta;
  readonly evidence_references: readonly EvidenceReference[];
  readonly concept_id: string;
  readonly concept_name: string;
}

/** Mastery change from this response */
export interface MasteryDelta {
  readonly concept_name: string;
  readonly delta: number;           // e.g., +0.03 or -0.02
  readonly mastery_after: number;   // e.g., 0.72
}

/** Item report from student */
export interface ItemReport {
  readonly item_id: string;
  readonly session_id: string;
  readonly report_type: "incorrect_answer" | "ambiguous_stem" | "outdated_content" | "other";
  readonly description?: string;
}

/** Evidence reference (re-exported from question.types for convenience) */
export { EvidenceReference } from "./question.types";
```

## 4. Database Schema

```sql
-- Item reports table for "Report Issue" functionality
CREATE TABLE IF NOT EXISTS item_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES practice_sessions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('incorrect_answer', 'ambiguous_stem', 'outdated_content', 'other')),
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_reports_item_id ON item_reports(item_id);
CREATE INDEX idx_item_reports_status ON item_reports(status);
```

## 5. API Contract

### POST /api/v1/practice/items/:itemId/report (Auth: Student)

**Request Body:**
```json
{
  "session_id": "session-uuid-1",
  "report_type": "ambiguous_stem",
  "description": "Options A and C could both be correct"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "report-uuid-1",
    "item_id": "item-uuid-1",
    "report_type": "ambiguous_stem",
    "status": "pending",
    "created_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 400 | `VALIDATION_ERROR` | Invalid report_type or missing fields |
| 404 | `NOT_FOUND` | Item or session not found |
| 500 | `INTERNAL_ERROR` | Unexpected error |

Note: The primary feedback data is returned as part of the `POST /api/v1/practice/sessions/:sessionId/answer` response from ST-13. This story only adds the item report endpoint.

## 6. Frontend Spec

### Component: FeedbackView (within practice session page)

**Component hierarchy:**
```
FeedbackView (organism — renders after answer submission)
  ├── AnswerResultIndicator (atom)
  │     ├── CheckCircle icon (correct) — Green #69a338
  │     └── XCircle icon (incorrect) — error-red
  ├── AnswerOptionsReview (molecule)
  │     ├── Correct option highlighted green with check
  │     └── Selected wrong option highlighted red with X
  ├── MasteryDeltaBadge (atom: "+3% Cardiovascular" or "-2% Renal")
  ├── RationaleCard (molecule)
  │     ├── "Why this is correct" heading
  │     └── Markdown-rendered rationale text
  ├── DistractorExplanations (molecule)
  │     └── Collapsible per-option explanations
  ├── EvidenceReferenceList (molecule)
  │     └── EvidenceReference (atom: linked title + type icon)
  ├── ReportIssueButton (atom: opens report modal)
  └── ContinueButton (atom: "Continue" to next question)
```

**States:**
1. **Correct** — Green border, check icon, positive mastery delta
2. **Incorrect** — Red border, X icon, correct answer highlighted, may show negative delta
3. **Loading references** — Skeleton for evidence references
4. **Report modal** — Overlay with report type dropdown and description textarea

**Design tokens:**
- Correct: Green `#69a338` background tint, `CheckCircle` Lucide icon
- Incorrect: error-red background tint, `XCircle` Lucide icon
- Mastery delta positive: Green `#69a338` text with up arrow
- Mastery delta negative: error-red text with down arrow
- Rationale card: White `#ffffff` on Cream `#f5f3ef`, 16px padding
- Evidence links: Navy Deep `#002c76` text, underlined
- Transition: 300ms ease-in-out opacity + translateY

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/practice/feedback.types.ts` | Types | Create |
| 2 | `packages/types/src/practice/index.ts` | Types | Edit (add feedback exports) |
| 3 | Supabase migration: `item_reports` table | Database | Apply via MCP |
| 4 | `apps/web/src/components/practice/feedback-view.tsx` | Component | Create |
| 5 | `apps/web/src/components/practice/answer-result-indicator.tsx` | Component | Create |
| 6 | `apps/web/src/components/practice/rationale-card.tsx` | Component | Create |
| 7 | `apps/web/src/components/practice/evidence-reference.tsx` | Component | Create |
| 8 | `apps/web/src/components/practice/mastery-delta-badge.tsx` | Component | Create |
| 9 | `apps/web/src/components/practice/report-issue-button.tsx` | Component | Create |
| 10 | `apps/server/src/modules/practice/services/item-report.service.ts` | Service | Create |
| 11 | `apps/server/src/modules/practice/controllers/item-report.controller.ts` | Controller | Create |
| 12 | `apps/server/src/modules/practice/__tests__/feedback-data.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-13 | student | NOT STARTED | Question view provides answer submission response containing feedback data |

### NPM Packages (already installed)
- `react-markdown` — Render markdown in rationale text (installed in ST-13)
- `lucide-react` — Icons (CheckCircle, XCircle, Flag, ExternalLink)
- `vitest` — Testing

### Existing Files Needed
- `apps/web/src/components/templates/practice-session-template.tsx` — Template from ST-13
- `packages/types/src/practice/question.types.ts` — `AnswerResponse`, `EvidenceReference` from ST-13
- `apps/server/src/middleware/auth.middleware.ts` — Auth middleware

## 9. Test Fixtures

```typescript
// Mock correct feedback
export const MOCK_CORRECT_FEEDBACK: FeedbackData = {
  correct: true,
  selected_key: "A",
  correct_key: "A",
  rationale: "Inferior MI is indicated by ST elevation in leads II, III, and aVF...",
  distractor_explanations: {
    B: "Anterior MI shows ST elevation in V1-V4",
    C: "PE shows S1Q3T3 pattern",
    D: "Pericarditis shows diffuse ST elevation",
    E: "Aortic dissection typically shows widened mediastinum",
  },
  mastery_delta: { concept_name: "Cardiovascular", delta: 0.03, mastery_after: 0.72 },
  evidence_references: [
    { title: "Harrison's Cardiology Ch. 12", url: "/content/harrisons-12", type: "textbook" },
  ],
  concept_id: "concept-cv-1",
  concept_name: "Cardiovascular",
};

// Mock incorrect feedback
export const MOCK_INCORRECT_FEEDBACK: FeedbackData = {
  correct: false,
  selected_key: "C",
  correct_key: "A",
  rationale: "Inferior MI is indicated by ST elevation in leads II, III, and aVF...",
  distractor_explanations: {
    B: "Anterior MI shows ST elevation in V1-V4",
    C: "PE shows S1Q3T3 pattern — this was your selection",
    D: "Pericarditis shows diffuse ST elevation",
    E: "Aortic dissection typically shows widened mediastinum",
  },
  mastery_delta: { concept_name: "Cardiovascular", delta: -0.02, mastery_after: 0.63 },
  evidence_references: [
    { title: "First Aid Step 1 — Cardio", url: "/content/fa-cardio", type: "textbook" },
  ],
  concept_id: "concept-cv-1",
  concept_name: "Cardiovascular",
};

// Mock item report
export const MOCK_ITEM_REPORT: ItemReport = {
  item_id: "item-uuid-1",
  session_id: "session-uuid-1",
  report_type: "ambiguous_stem",
  description: "Options A and C could both be correct",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/practice/__tests__/feedback-data.test.ts`

```
describe("FeedbackData validation")
  ✓ answer response includes all required feedback fields
  ✓ mastery_delta is a number between -1 and 1
  ✓ distractor_explanations has entries for all non-correct options
  ✓ evidence_references is an array (may be empty)

describe("ItemReportService")
  ✓ creates item report with valid data
  ✓ rejects invalid report_type (ValidationError)
  ✓ links report to student and session
  ✓ defaults status to 'pending'

describe("ItemReportController")
  ✓ returns 201 for valid report submission
  ✓ returns 401 for unauthenticated request
  ✓ returns 400 for missing report_type
```

**Total: ~11 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not standalone. Feedback view E2E is covered within the adaptive practice E2E in ST-13 brief:
- After answer submission, feedback panel appears with correct/incorrect indicator
- Rationale text is visible
- Continue button proceeds to next question

## 12. Acceptance Criteria

1. After submitting an answer, feedback view appears with smooth transition
2. Correct answers show green indicator with CheckCircle icon
3. Incorrect answers show red indicator with XCircle icon and highlight correct option
4. Rationale text renders correctly (markdown supported)
5. Distractor explanations are accessible (collapsible sections)
6. Mastery delta badge shows concept name and percentage change
7. Evidence references are clickable links
8. "Continue" button proceeds to next question
9. "Report Issue" button opens modal with report type options
10. Color is not the only indicator (icons supplement color)
11. All ~11 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Correct/incorrect indicator with color coding | S-ST-41-3 § AC |
| Rationale and distractor explanations | S-ST-41-3 § AC: "Rationale text explaining why the correct answer is right" |
| Evidence reference links | S-ST-41-3 § AC: "link to source content" |
| Mastery delta display | S-ST-41-3 § AC: "+3% Cardiovascular" |
| Report Issue button | S-ST-41-3 § AC: "Optional Report Issue button" |
| Feedback in answer response | S-ST-41-3 § Notes: "Feedback data is returned in the answer submission response" |
| Accessible: not color only | S-ST-41-3 § AC: "icons for correct/incorrect" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `practice_sessions` and `practice_responses` tables exist (from ST-12, ST-13)
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **No Python API needed** (feedback data comes from ST-13 answer response)

## 15. Figma / Make Prototype

No Figma link available. Key visual specifications:

- Feedback card: White `#ffffff` surface, rounded-lg, 24px padding, max-width 800px
- Correct state: 2px Green `#69a338` left border, light green tint background
- Incorrect state: 2px error-red left border, light red tint background
- Mastery delta badge: Pill shape, Green/red based on positive/negative delta
- Rationale card: Cream `#f5f3ef` background, 16px padding, Source Sans 3
- Evidence links: Navy Deep `#002c76`, `ExternalLink` Lucide icon suffix
- Transition: 300ms `ease-in-out` on opacity and translateY(8px)
