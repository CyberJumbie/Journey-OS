# STORY-ST-15 Brief: Session Summary

## 0. Lane & Priority

```yaml
story_id: STORY-ST-15
old_id: S-ST-41-4
lane: student
lane_priority: 4
within_lane_order: 15
sprint: 32
size: M
depends_on:
  - STORY-ST-12 (student) — Practice Session Launcher
  - STORY-ST-13 (student) — Question View Component
blocks: []
personas_served: [student]
epic: E-41 (Adaptive Practice UI)
feature: F-19 (Adaptive Practice Engine)
user_flow: UF-28 (Adaptive Practice Session)
```

## 1. Summary

Build the **session summary page** displayed after a student completes all questions in an adaptive practice session. The page shows overall score (correct/total with percentage), time spent (total and average per question), per-concept mastery changes (before/after with delta), a concept breakdown table, strongest/weakest concept highlights, study recommendations based on lowest mastery, and CTAs to start a new session with recommended focus or return to the dashboard. The session record is finalized in the database with status `completed`.

Key constraints:
- Summary data is computed server-side from `practice_responses` records
- Mastery before/after requires snapshot of mastery state at session start (stored on session creation in ST-12)
- Recommendations rank concepts by `mastery_level ASC, questions_practiced DESC`
- "Start new session" pre-fills scope with recommended concepts
- Page at `/dashboard/practice/session/[sessionId]/summary`

## 2. Task Breakdown

1. **Types** — Create `SessionSummary`, `ConceptBreakdownRow`, `StudyRecommendation` in `packages/types/src/practice/session-summary.types.ts`
2. **Service** — `SessionSummaryService` with `getSummary()` and `finalizeSession()` methods
3. **Controller** — `SessionSummaryController` with `handleGetSummary()` method
4. **Routes** — Protected route: `GET /api/v1/practice/sessions/:sessionId/summary`
5. **Frontend page** — `/dashboard/practice/session/[sessionId]/summary/page.tsx`
6. **Frontend components** — `SessionScoreCard`, `ConceptBreakdownTable`, `StudyRecommendations`
7. **Wire up** — Register route under practice module
8. **API tests** — ~12 tests for summary computation, finalization, auth

## 3. Data Model

```typescript
// packages/types/src/practice/session-summary.types.ts

/** Overall session summary */
export interface SessionSummary {
  readonly session_id: string;
  readonly student_id: string;
  readonly status: "completed";
  readonly score: SessionScore;
  readonly timing: SessionTiming;
  readonly concept_breakdown: readonly ConceptBreakdownRow[];
  readonly strongest_concept: ConceptBreakdownRow | null;
  readonly weakest_concept: ConceptBreakdownRow | null;
  readonly recommendations: readonly StudyRecommendation[];
  readonly completed_at: string;
}

/** Score summary */
export interface SessionScore {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;  // 0-100
}

/** Timing summary */
export interface SessionTiming {
  readonly total_seconds: number;
  readonly average_per_question_seconds: number;
  readonly fastest_question_seconds: number;
  readonly slowest_question_seconds: number;
}

/** Per-concept breakdown row */
export interface ConceptBreakdownRow {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly questions_count: number;
  readonly correct_count: number;
  readonly accuracy_percentage: number;  // 0-100
  readonly mastery_before: number;       // 0.0-1.0
  readonly mastery_after: number;        // 0.0-1.0
  readonly mastery_delta: number;        // signed, e.g., +0.05
}

/** Study recommendation */
export interface StudyRecommendation {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly current_mastery: number;
  readonly reason: string;              // e.g., "Lowest mastery with high question count"
  readonly action: string;              // e.g., "Focus on Renal Physiology next"
  readonly priority: number;            // 1 = highest priority
}
```

## 4. Database Schema

No new tables needed. Uses existing tables and updates session status:

```sql
-- Existing tables used:
-- practice_sessions: status updated to 'completed', completed_at set
-- practice_responses: read for computing summary
-- mastery_snapshots (from ST-12): mastery_before values captured at session start

-- Session finalization query:
-- UPDATE practice_sessions
-- SET status = 'completed', completed_at = NOW()
-- WHERE id = :sessionId AND student_id = :studentId AND status = 'active';
```

## 5. API Contract

### GET /api/v1/practice/sessions/:sessionId/summary (Auth: Student, owner)

**Success Response (200):**
```json
{
  "data": {
    "session_id": "session-uuid-1",
    "student_id": "student-uuid-1",
    "status": "completed",
    "score": {
      "correct": 18,
      "total": 25,
      "percentage": 72
    },
    "timing": {
      "total_seconds": 2250,
      "average_per_question_seconds": 90,
      "fastest_question_seconds": 32,
      "slowest_question_seconds": 180
    },
    "concept_breakdown": [
      {
        "concept_id": "concept-cv-1",
        "concept_name": "Cardiovascular",
        "questions_count": 8,
        "correct_count": 6,
        "accuracy_percentage": 75,
        "mastery_before": 0.60,
        "mastery_after": 0.72,
        "mastery_delta": 0.12
      },
      {
        "concept_id": "concept-renal-1",
        "concept_name": "Renal",
        "questions_count": 5,
        "correct_count": 2,
        "accuracy_percentage": 40,
        "mastery_before": 0.45,
        "mastery_after": 0.38,
        "mastery_delta": -0.07
      }
    ],
    "strongest_concept": {
      "concept_id": "concept-cv-1",
      "concept_name": "Cardiovascular",
      "questions_count": 8,
      "correct_count": 6,
      "accuracy_percentage": 75,
      "mastery_before": 0.60,
      "mastery_after": 0.72,
      "mastery_delta": 0.12
    },
    "weakest_concept": {
      "concept_id": "concept-renal-1",
      "concept_name": "Renal",
      "questions_count": 5,
      "correct_count": 2,
      "accuracy_percentage": 40,
      "mastery_before": 0.45,
      "mastery_after": 0.38,
      "mastery_delta": -0.07
    },
    "recommendations": [
      {
        "concept_id": "concept-renal-1",
        "concept_name": "Renal",
        "current_mastery": 0.38,
        "reason": "Lowest mastery after session with declining trend",
        "action": "Focus on Renal Physiology next session",
        "priority": 1
      }
    ],
    "completed_at": "2026-02-19T13:15:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not session owner |
| 404 | `NOT_FOUND` | Session not found |
| 400 | `SESSION_NOT_COMPLETE` | Session still active (not all questions answered) |
| 500 | `INTERNAL_ERROR` | Unexpected error |

## 6. Frontend Spec

### Page: `/dashboard/practice/session/[sessionId]/summary`

**Route:** `apps/web/src/app/(dashboard)/practice/session/[sessionId]/summary/page.tsx`

**Component hierarchy:**
```
SessionSummaryPage (page.tsx — default export)
  ├── SessionScoreCard (molecule)
  │     ├── CircularProgress (atom: 72% donut chart)
  │     ├── Score text: "18/25 correct"
  │     └── Time text: "37 min 30 sec (avg 1:30/question)"
  ├── ConceptBreakdownTable (organism)
  │     ├── Table header: Concept, Questions, Correct, Accuracy, Before, After, Delta
  │     ├── Rows per concept with mastery delta color coding
  │     ├── Strongest badge (trophy icon) on best concept row
  │     └── Weakest badge (alert icon) on worst concept row
  ├── StudyRecommendations (molecule)
  │     ├── "What to focus on next" heading
  │     └── RecommendationCard per recommendation (concept, reason, action)
  └── ActionBar (molecule)
        ├── StartNewSessionButton (pre-fills with recommended concepts)
        └── ReturnToDashboardButton
```

**States:**
1. **Loading** — Skeleton cards while summary computes
2. **Summary** — Full summary display
3. **Error** — Error with retry button

**Design tokens:**
- Score card: White `#ffffff` surface, centered, 32px padding
- Circular progress: Green `#69a338` for score >= 70%, warning-yellow 50-69%, error-red < 50%
- Positive delta: Green `#69a338` text with up arrow
- Negative delta: error-red text with down arrow
- Table: Alternating row background Parchment `#faf9f6` / White `#ffffff`
- Recommendations: Navy Deep `#002c76` heading, Cream `#f5f3ef` cards
- Action buttons: Green `#69a338` primary CTA, Navy Deep `#002c76` secondary

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/practice/session-summary.types.ts` | Types | Create |
| 2 | `packages/types/src/practice/index.ts` | Types | Edit (add summary exports) |
| 3 | `apps/server/src/modules/practice/services/session-summary.service.ts` | Service | Create |
| 4 | `apps/server/src/modules/practice/controllers/session-summary.controller.ts` | Controller | Create |
| 5 | `apps/server/src/modules/practice/routes/session-summary.routes.ts` | Routes | Create |
| 6 | `apps/web/src/app/(dashboard)/practice/session/[sessionId]/summary/page.tsx` | View | Create |
| 7 | `apps/web/src/components/practice/session-score-card.tsx` | Component | Create |
| 8 | `apps/web/src/components/practice/concept-breakdown-table.tsx` | Component | Create |
| 9 | `apps/web/src/components/practice/study-recommendations.tsx` | Component | Create |
| 10 | `apps/server/src/modules/practice/__tests__/session-summary.service.test.ts` | Tests | Create |
| 11 | `apps/server/src/modules/practice/__tests__/session-summary.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-12 | student | NOT STARTED | Session creation with mastery snapshots at start |
| STORY-ST-13 | student | NOT STARTED | Question view provides practice_responses records |

### NPM Packages (need to install)
- `recharts` — Circular progress / donut chart for score display

### NPM Packages (already installed)
- `@supabase/supabase-js`, `express`, `vitest`, `lucide-react`

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — Auth middleware
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Practice module routes from ST-13

## 9. Test Fixtures

```typescript
// Mock practice responses for summary computation
export const MOCK_PRACTICE_RESPONSES = [
  { item_id: "item-1", selected_key: "A", correct: true, time_spent_seconds: 45, mastery_before: 0.60, mastery_after: 0.65, position: 1, concept_id: "concept-cv-1" },
  { item_id: "item-2", selected_key: "C", correct: false, time_spent_seconds: 90, mastery_before: 0.45, mastery_after: 0.40, position: 2, concept_id: "concept-renal-1" },
  { item_id: "item-3", selected_key: "B", correct: true, time_spent_seconds: 60, mastery_before: 0.65, mastery_after: 0.70, position: 3, concept_id: "concept-cv-1" },
];

// Mock mastery snapshots at session start
export const MOCK_MASTERY_SNAPSHOTS = [
  { concept_id: "concept-cv-1", concept_name: "Cardiovascular", mastery_level: 0.60 },
  { concept_id: "concept-renal-1", concept_name: "Renal", mastery_level: 0.45 },
];

// Expected computed summary
export const MOCK_SESSION_SUMMARY = {
  session_id: "session-uuid-1",
  student_id: "student-uuid-1",
  status: "completed" as const,
  score: { correct: 2, total: 3, percentage: 67 },
  timing: {
    total_seconds: 195,
    average_per_question_seconds: 65,
    fastest_question_seconds: 45,
    slowest_question_seconds: 90,
  },
  concept_breakdown: [
    {
      concept_id: "concept-cv-1",
      concept_name: "Cardiovascular",
      questions_count: 2,
      correct_count: 2,
      accuracy_percentage: 100,
      mastery_before: 0.60,
      mastery_after: 0.70,
      mastery_delta: 0.10,
    },
    {
      concept_id: "concept-renal-1",
      concept_name: "Renal",
      questions_count: 1,
      correct_count: 0,
      accuracy_percentage: 0,
      mastery_before: 0.45,
      mastery_after: 0.40,
      mastery_delta: -0.05,
    },
  ],
};

export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/practice/__tests__/session-summary.service.test.ts`

```
describe("SessionSummaryService")
  describe("getSummary")
    ✓ computes correct score (correct/total/percentage)
    ✓ computes timing metrics (total, average, fastest, slowest)
    ✓ computes per-concept breakdown with mastery before/after
    ✓ identifies strongest concept (highest mastery_after)
    ✓ identifies weakest concept (lowest mastery_after)
    ✓ generates study recommendations ranked by mastery ASC
    ✓ throws SessionNotFoundError for non-existent session
    ✓ throws SessionNotCompleteError for active session

  describe("finalizeSession")
    ✓ updates session status to 'completed' with completed_at
    ✓ is idempotent (calling twice does not error)
```

**File:** `apps/server/src/modules/practice/__tests__/session-summary.controller.test.ts`

```
describe("SessionSummaryController")
  describe("handleGetSummary")
    ✓ returns 200 with full summary for session owner
    ✓ returns 401 for unauthenticated request
    ✓ returns 403 for non-owner student
    ✓ returns 404 for non-existent session
    ✓ returns 400 for incomplete session
```

**Total: ~15 tests** (10 service + 5 controller)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Covered in adaptive practice E2E (ST-13 brief):
- After last question, redirects to summary page
- Summary shows score, timing, concept breakdown
- "Start new session" button navigates to session launcher

## 12. Acceptance Criteria

1. Session summary page displays after completing all questions
2. Overall score shows correct/total with percentage in circular chart
3. Timing shows total duration and average per question
4. Concept breakdown table shows per-concept stats with mastery deltas
5. Strongest and weakest concepts are highlighted
6. Study recommendations are generated based on lowest mastery
7. "Start new session" pre-fills with recommended concepts
8. "Return to dashboard" navigates back to student dashboard
9. Session status is updated to `completed` in database
10. Non-owner students receive 403
11. All ~15 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Session summary after last question | S-ST-41-4 § AC |
| Score: correct/total with percentage | S-ST-41-4 § AC |
| Time spent and average per question | S-ST-41-4 § AC |
| Mastery changes before/after per concept | S-ST-41-4 § AC |
| Recommendations based on lowest mastery | S-ST-41-4 § Notes: "rank concepts by mastery_level ASC, questions_practiced DESC" |
| Start new session pre-fills scope | S-ST-41-4 § Notes |
| Session record finalized | S-ST-41-4 § AC: "status: completed" |
| Cross-epic: feeds session history | S-ST-41-4 § Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `practice_sessions` and `practice_responses` tables exist (from ST-12, ST-13)
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **No Python API needed** (summary computed from Supabase data)

## 15. Figma / Make Prototype

No Figma link available. Key visual specifications:

- Score card: White `#ffffff`, centered, circular Recharts donut (Green/yellow/red by score)
- Concept table: Full-width, alternating Parchment/White rows, sticky header
- Delta cells: Green `#69a338` for positive, error-red for negative, with arrow icons
- Strongest row: Trophy `lucide-react` icon badge
- Weakest row: AlertTriangle `lucide-react` icon badge
- Recommendations: Cream `#f5f3ef` cards, 16px gap, Navy Deep heading
- Action bar: Sticky bottom on mobile, inline on desktop
