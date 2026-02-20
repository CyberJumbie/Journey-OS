# STORY-ST-13 Brief: Question View Component

## 0. Lane & Priority

```yaml
story_id: STORY-ST-13
old_id: S-ST-41-2
lane: student
lane_priority: 4
within_lane_order: 13
sprint: 32
size: L
depends_on:
  - STORY-ST-12 (student) — Practice Session Launcher
blocks:
  - STORY-ST-14 — Feedback View
  - STORY-ST-15 — Session Summary
personas_served: [student]
epic: E-41 (Adaptive Practice UI)
feature: F-19 (Adaptive Practice Engine)
user_flow: UF-28 (Adaptive Practice Session)
```

## 1. Summary

Build the **question view component** for adaptive practice sessions. When a student is in an active practice session, the view renders the current question stem (with markdown/images), answer options (A-E as radio buttons), a countdown timer (timed mode), a question counter, a flag-for-review button, a live mastery progress bar, and forward-only navigation. On answer submission, the client sends the response to the Express server, which proxies to the Python BKT service for mastery update and to the adaptive item selector for the next question. Keyboard shortcuts (1-5 for options, Enter to submit, F to flag) provide power-user efficiency.

Key constraints:
- **No backward navigation** in adaptive mode (each item selected based on current mastery state)
- Timer auto-submits when expired; visual warning at 25% remaining
- SSE optional for mastery bar updates; initial implementation uses REST response
- Answer submission flow: Client -> Express -> Python BKT update -> Python item selection -> response with feedback + next item
- Session page at `/dashboard/practice/session/[sessionId]`

## 2. Task Breakdown

1. **Types** — Create `QuestionItem`, `AnswerOption`, `AnswerSubmission`, `AnswerResponse`, `SessionProgress`, `QuestionFlowQuery` in `packages/types/src/practice/question.types.ts`
2. **Service** — `QuestionFlowService` with `getCurrentQuestion()`, `submitAnswer()`, `flagQuestion()` methods
3. **Controller** — `QuestionFlowController` with `handleGetCurrent()`, `handleSubmitAnswer()`, `handleFlag()` methods
4. **Routes** — Protected routes: `GET /api/v1/practice/sessions/:sessionId/current`, `POST /api/v1/practice/sessions/:sessionId/answer`, `POST /api/v1/practice/sessions/:sessionId/flag`
5. **Frontend page** — `/dashboard/practice/session/[sessionId]/page.tsx`
6. **Frontend components** — `QuestionStem`, `AnswerOptions`, `QuestionTimer`, `SessionProgressBar`, `MasteryLiveBar`, `PracticeSessionTemplate`
7. **Keyboard handler** — Hook `useQuestionKeyboard` for shortcut bindings
8. **Wire up** — Register routes under practice module
9. **API tests** — ~18 tests covering submission flow, timer, flagging, auth

## 3. Data Model

```typescript
// packages/types/src/practice/question.types.ts

/** A single answer option within a question */
export interface AnswerOption {
  readonly key: string;          // "A", "B", "C", "D", "E"
  readonly text: string;         // Option text (markdown)
  readonly image_url?: string;   // Optional image in option
}

/** A question item to display */
export interface QuestionItem {
  readonly item_id: string;
  readonly stem: string;            // Markdown-rendered question text
  readonly stem_image_url?: string; // Optional image in stem
  readonly options: readonly AnswerOption[];
  readonly concept_id: string;
  readonly concept_name: string;
  readonly time_limit_seconds?: number;  // null = untimed
  readonly position: number;             // 1-based question number
  readonly total_questions: number;      // total in session
}

/** Answer submission payload */
export interface AnswerSubmission {
  readonly item_id: string;
  readonly selected_key: string;     // "A"-"E"
  readonly time_spent_seconds: number;
  readonly flagged: boolean;
}

/** Server response after answer submission */
export interface AnswerResponse {
  readonly correct: boolean;
  readonly correct_key: string;
  readonly rationale: string;
  readonly distractor_explanations: Record<string, string>;
  readonly mastery_delta: number;       // e.g., +0.03
  readonly concept_mastery_after: number; // e.g., 0.72
  readonly evidence_references: readonly EvidenceReference[];
  readonly next_item: QuestionItem | null;  // null if session complete
}

/** Reference to source material */
export interface EvidenceReference {
  readonly title: string;
  readonly url: string;
  readonly type: "lecture" | "textbook" | "article";
}

/** Session progress state */
export interface SessionProgress {
  readonly session_id: string;
  readonly current_position: number;
  readonly total_questions: number;
  readonly correct_count: number;
  readonly flagged_count: number;
  readonly concept_masteries: readonly ConceptMasterySnapshot[];
  readonly elapsed_seconds: number;
}

/** Per-concept mastery snapshot during session */
export interface ConceptMasterySnapshot {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly mastery_level: number;  // 0.0-1.0
}

/** Flag request */
export interface FlagQuestionRequest {
  readonly item_id: string;
  readonly reason?: string;
}
```

## 4. Database Schema

No new tables created. Uses existing tables from prior stories:

```sql
-- Existing tables used:
-- practice_sessions (from ST-12): id, student_id, status, config, created_at
-- practice_responses (from ST-12 or created here if not existing):
--   id UUID PK DEFAULT gen_random_uuid(),
--   session_id UUID FK -> practice_sessions(id),
--   item_id UUID,
--   selected_key TEXT,
--   correct BOOLEAN,
--   time_spent_seconds INTEGER,
--   flagged BOOLEAN DEFAULT false,
--   mastery_before NUMERIC,
--   mastery_after NUMERIC,
--   position INTEGER,
--   created_at TIMESTAMPTZ DEFAULT NOW()

-- If practice_responses does not exist, create via migration:
CREATE TABLE IF NOT EXISTS practice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  selected_key TEXT NOT NULL CHECK (selected_key IN ('A','B','C','D','E')),
  correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER NOT NULL CHECK (time_spent_seconds >= 0),
  flagged BOOLEAN NOT NULL DEFAULT false,
  mastery_before NUMERIC NOT NULL,
  mastery_after NUMERIC NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practice_responses_session_id ON practice_responses(session_id);
CREATE INDEX idx_practice_responses_item_id ON practice_responses(item_id);
```

## 5. API Contract

### GET /api/v1/practice/sessions/:sessionId/current (Auth: Student, owner)

**Success Response (200):**
```json
{
  "data": {
    "item": {
      "item_id": "item-uuid-1",
      "stem": "A 45-year-old patient presents with...",
      "stem_image_url": null,
      "options": [
        { "key": "A", "text": "Myocardial infarction", "image_url": null },
        { "key": "B", "text": "Pulmonary embolism", "image_url": null },
        { "key": "C", "text": "Aortic dissection", "image_url": null },
        { "key": "D", "text": "Pericarditis", "image_url": null },
        { "key": "E", "text": "Costochondritis", "image_url": null }
      ],
      "concept_id": "concept-uuid-1",
      "concept_name": "Cardiovascular",
      "time_limit_seconds": 90,
      "position": 5,
      "total_questions": 25
    },
    "progress": {
      "session_id": "session-uuid-1",
      "current_position": 5,
      "total_questions": 25,
      "correct_count": 3,
      "flagged_count": 1,
      "concept_masteries": [
        { "concept_id": "concept-uuid-1", "concept_name": "Cardiovascular", "mastery_level": 0.65 }
      ],
      "elapsed_seconds": 420
    }
  },
  "error": null
}
```

### POST /api/v1/practice/sessions/:sessionId/answer (Auth: Student, owner)

**Request Body:**
```json
{
  "item_id": "item-uuid-1",
  "selected_key": "A",
  "time_spent_seconds": 45,
  "flagged": false
}
```

**Success Response (200):**
```json
{
  "data": {
    "correct": true,
    "correct_key": "A",
    "rationale": "Myocardial infarction is the most likely diagnosis because...",
    "distractor_explanations": {
      "B": "Pulmonary embolism typically presents with...",
      "C": "Aortic dissection would show...",
      "D": "Pericarditis pain is usually...",
      "E": "Costochondritis is reproducible with..."
    },
    "mastery_delta": 0.03,
    "concept_mastery_after": 0.68,
    "evidence_references": [
      { "title": "Cardiovascular Pathology Ch. 7", "url": "/content/cv-path-7", "type": "textbook" }
    ],
    "next_item": { "...QuestionItem..." }
  },
  "error": null
}
```

### POST /api/v1/practice/sessions/:sessionId/flag (Auth: Student, owner)

**Request Body:**
```json
{
  "item_id": "item-uuid-1",
  "reason": "Ambiguous stem"
}
```

**Success Response (200):**
```json
{
  "data": { "flagged": true },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not session owner or wrong role |
| 404 | `NOT_FOUND` | Session not found or completed |
| 400 | `VALIDATION_ERROR` | Invalid answer key, missing fields |
| 409 | `CONFLICT` | Question already answered (duplicate submission) |
| 500 | `INTERNAL_ERROR` | BKT service unreachable or unexpected error |

## 6. Frontend Spec

### Page: `/dashboard/practice/session/[sessionId]` (Student layout)

**Route:** `apps/web/src/app/(dashboard)/practice/session/[sessionId]/page.tsx`

**Component hierarchy:**
```
PracticeSessionPage (page.tsx — default export)
  └── PracticeSessionTemplate (template)
        ├── SessionProgressBar (atom: "Question 5 of 25" + progress bar)
        ├── MasteryLiveBar (molecule: per-concept mastery bars, updates on answer)
        ├── QuestionStem (molecule: markdown stem + optional image)
        ├── AnswerOptions (molecule: radio group A-E with keyboard hints)
        ├── QuestionTimer (atom: countdown with warning state at 25%)
        ├── ActionBar (molecule)
        │     ├── FlagButton (atom: flag for review toggle)
        │     ├── SubmitButton (atom: disabled until option selected)
        │     └── KeyboardHints (atom: "1-5 Select, Enter Submit, F Flag")
        └── LoadingOverlay (atom: between questions while next item loads)
```

**States:**
1. **Loading** — Skeleton question while fetching current item
2. **Question** — Active question display with timer counting down
3. **Submitting** — Disabled inputs + spinner while answer is processed
4. **Feedback** — Inline feedback (delegates to ST-14 FeedbackView)
5. **Complete** — Redirect to session summary (ST-15)
6. **Error** — Error message with retry

**Design tokens:**
- Timer normal: Navy Deep `#002c76`
- Timer warning (25% remaining): `error-red`
- Selected option: Green `#69a338` border
- Flag active: `warning-yellow`
- Surface: White `#ffffff` card on Parchment `#faf9f6`
- Progress bar: Green `#69a338` fill

**Keyboard shortcuts:**
| Key | Action |
|-----|--------|
| 1-5 | Select answer option A-E |
| Enter | Submit answer |
| F | Toggle flag |
| N | Next question (after feedback) |

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/practice/question.types.ts` | Types | Create |
| 2 | `packages/types/src/practice/index.ts` | Types | Create/Edit (add question exports) |
| 3 | Supabase migration: `practice_responses` table | Database | Apply via MCP |
| 4 | `apps/server/src/modules/practice/services/question-flow.service.ts` | Service | Create |
| 5 | `apps/server/src/modules/practice/controllers/question-flow.controller.ts` | Controller | Create |
| 6 | `apps/server/src/modules/practice/routes/question-flow.routes.ts` | Routes | Create |
| 7 | `apps/web/src/app/(dashboard)/practice/session/[sessionId]/page.tsx` | View | Create |
| 8 | `apps/web/src/components/practice/question-stem.tsx` | Component | Create |
| 9 | `apps/web/src/components/practice/answer-options.tsx` | Component | Create |
| 10 | `apps/web/src/components/practice/question-timer.tsx` | Component | Create |
| 11 | `apps/web/src/components/practice/session-progress-bar.tsx` | Component | Create |
| 12 | `apps/web/src/components/practice/mastery-live-bar.tsx` | Component | Create |
| 13 | `apps/web/src/components/templates/practice-session-template.tsx` | Template | Create |
| 14 | `apps/web/src/hooks/use-question-keyboard.ts` | Hook | Create |
| 15 | `apps/server/src/modules/practice/__tests__/question-flow.service.test.ts` | Tests | Create |
| 16 | `apps/server/src/modules/practice/__tests__/question-flow.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-12 | student | NOT STARTED | Practice session launcher creates session records and provides session ID |
| STORY-ST-3 | student | NOT STARTED (cross) | BKT mastery model provides mastery update + item selection |

### NPM Packages (need to install)
- `react-markdown` — Render markdown in question stems
- `rehype-raw` — Allow HTML in markdown for images

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons (flag, timer, etc.)

### Python Packages (already in python-api)
- `torch`, `torch_geometric` — BKT model runtime
- `fastapi` — Python API server

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — Auth middleware
- `apps/server/src/middleware/rbac.middleware.ts` — RBAC for student role
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Python BKT endpoints from E-40 (cross-epic dependency)

## 9. Test Fixtures

```typescript
// Mock student user
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

// Mock non-owner student (should be denied)
export const OTHER_STUDENT_USER = {
  ...STUDENT_USER,
  sub: "student-uuid-2",
  email: "other@msm.edu",
};

// Mock question item
export const MOCK_QUESTION_ITEM: QuestionItem = {
  item_id: "item-uuid-1",
  stem: "A 45-year-old male presents with acute substernal chest pain radiating to the left arm. ECG shows ST elevation in leads II, III, and aVF. What is the most likely diagnosis?",
  stem_image_url: null,
  options: [
    { key: "A", text: "Inferior myocardial infarction" },
    { key: "B", text: "Anterior myocardial infarction" },
    { key: "C", text: "Pulmonary embolism" },
    { key: "D", text: "Pericarditis" },
    { key: "E", text: "Aortic dissection" },
  ],
  concept_id: "concept-cv-1",
  concept_name: "Cardiovascular",
  time_limit_seconds: 90,
  position: 1,
  total_questions: 25,
};

// Mock answer response
export const MOCK_ANSWER_RESPONSE: AnswerResponse = {
  correct: true,
  correct_key: "A",
  rationale: "ST elevation in leads II, III, and aVF indicates inferior wall involvement...",
  distractor_explanations: {
    B: "Anterior MI would show ST elevation in V1-V4",
    C: "PE typically shows right heart strain pattern",
    D: "Pericarditis shows diffuse ST elevation",
    E: "Aortic dissection has tearing pain with blood pressure differential",
  },
  mastery_delta: 0.03,
  concept_mastery_after: 0.68,
  evidence_references: [
    { title: "Cardiovascular Pathology Ch. 7", url: "/content/cv-path-7", type: "textbook" },
  ],
  next_item: null,
};

// Mock session progress
export const MOCK_SESSION_PROGRESS: SessionProgress = {
  session_id: "session-uuid-1",
  current_position: 5,
  total_questions: 25,
  correct_count: 3,
  flagged_count: 1,
  concept_masteries: [
    { concept_id: "concept-cv-1", concept_name: "Cardiovascular", mastery_level: 0.65 },
  ],
  elapsed_seconds: 420,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/practice/__tests__/question-flow.service.test.ts`

```
describe("QuestionFlowService")
  describe("getCurrentQuestion")
    ✓ returns current question item for active session
    ✓ throws SessionNotFoundError for non-existent session
    ✓ throws SessionCompletedError for already-completed session
    ✓ returns progress alongside question item

  describe("submitAnswer")
    ✓ records answer and returns feedback with mastery delta
    ✓ proxies to Python BKT service for mastery update
    ✓ proxies to Python item selector for next question
    ✓ returns next_item=null when session is complete
    ✓ rejects duplicate submission for same item (ConflictError)
    ✓ validates selected_key is A-E (ValidationError)
    ✓ saves response record to practice_responses table

  describe("flagQuestion")
    ✓ marks question as flagged in practice_responses
    ✓ increments flagged_count in session progress
```

**File:** `apps/server/src/modules/practice/__tests__/question-flow.controller.test.ts`

```
describe("QuestionFlowController")
  describe("handleGetCurrent")
    ✓ returns 200 with question + progress for session owner
    ✓ returns 401 for unauthenticated request
    ✓ returns 403 when student does not own session
    ✓ returns 404 for non-existent session

  describe("handleSubmitAnswer")
    ✓ returns 200 with feedback and next item
    ✓ returns 400 for invalid answer key
    ✓ returns 409 for duplicate submission
    ✓ returns 500 when BKT service is unreachable

  describe("handleFlag")
    ✓ returns 200 with flagged confirmation
```

**Total: ~18 tests** (13 service + 8 controller)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

**File:** `apps/web/e2e/adaptive-practice.spec.ts`

```
describe("Adaptive Practice Session")
  ✓ Student launches session and sees first question with timer
  ✓ Student selects answer with keyboard shortcut and submits
  ✓ Timer warning appears at 25% remaining
  ✓ Flagging a question toggles flag icon
  ✓ Session redirects to summary after last question
```

Note: E2E depends on ST-12 (launcher), ST-13 (question view), ST-14 (feedback), ST-15 (summary) all complete. Write E2E after all four stories are implemented.

## 12. Acceptance Criteria

1. Student sees current question with markdown-rendered stem and A-E options
2. Images render in stems and options when present
3. Countdown timer displays and auto-submits on expiry
4. Timer shows visual warning at 25% remaining time
5. Question counter shows "Question N of M"
6. Flag button toggles flag state for current question
7. Keyboard shortcuts 1-5/Enter/F work correctly
8. Answer submission returns feedback with mastery delta
9. Next question loads automatically (no back navigation)
10. Loading overlay shows between questions
11. Session completes and redirects to summary after last question
12. Non-owner students receive 403
13. All ~18 API tests pass
14. Responsive layout: full-width mobile, centered desktop

## 13. Source References

| Claim | Source |
|-------|--------|
| Question display with A-E options | S-ST-41-2 § Acceptance Criteria |
| Countdown timer with 25% warning | S-ST-41-2 § AC: "visual warning at 25% remaining" |
| Keyboard shortcuts | S-ST-41-2 § AC: "1-5 for options, Enter to submit, F to flag" |
| No backward navigation in adaptive mode | S-ST-41-2 § Notes |
| Answer flow: client -> Express -> Python BKT -> item selection | S-ST-41-2 § Notes |
| SSE for mastery bar updates | S-ST-41-2 § Notes: "SSE if latency is a concern" |
| Timer is reusable atom | S-ST-41-2 § Notes: "same timer used in actual exam delivery" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `practice_sessions` table exists (from ST-12)
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **Python API:** FastAPI running with BKT endpoints available (cross-epic E-40)
- **Neo4j:** Not directly needed (mastery data read via Python service)

## 15. Figma / Make Prototype

No Figma link available. Key visual specifications:

- Question stem: White `#ffffff` card, max-width 800px centered, 24px padding
- Answer options: Bordered radio cards, 16px gap, hover state with Green `#69a338` border
- Timer: Fixed top-right, circular countdown, Navy Deep `#002c76` normal, red at warning
- Progress bar: Full-width top, Green `#69a338` fill, Cream `#f5f3ef` track
- Mastery bar: Sidebar on desktop, bottom drawer on mobile, per-concept horizontal bars
- Flag button: Lucide `Flag` icon, toggles to filled state when active
