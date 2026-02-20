# STORY-ST-13: Question View Component

**Epic:** E-41 (Adaptive Practice UI)
**Feature:** F-19
**Sprint:** 32
**Lane:** student (P4)
**Size:** L
**Old ID:** S-ST-41-2

---

## User Story
As a **Student (Marcus Williams)**, I need a question display with answer selection, timer, and flagging so that I can practice items in an exam-like environment with adaptive difficulty.

## Acceptance Criteria
- [ ] Question stem display with rich text (markdown rendering)
- [ ] Answer options (A-E) with radio button selection and letter labels
- [ ] Image/media support in question stems and answer options
- [ ] Countdown timer (if timed mode) with visual warning at 25% remaining (color change)
- [ ] Auto-submit on timer expiry
- [ ] Flag button to mark question for review (persisted in session state)
- [ ] Bookmark button to save question for later study
- [ ] Question counter: "Question 5 of 25" with progress bar
- [ ] Navigation: next question only (no going back in adaptive mode)
- [ ] Real-time mastery bar showing current session mastery
- [ ] Submit answer triggers: BKT mastery update, next item selection
- [ ] Keyboard shortcuts: 1-5 for options, Enter to submit, F to flag
- [ ] Loading state between questions (while next item is selected)
- [ ] Responsive: full-width on mobile, max-w-5xl centered on desktop
- [ ] Accessibility: screen reader support for question and options
- [ ] Subject and difficulty badges in header

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentQuestionView.tsx` | `apps/web/src/app/(protected)/student/practice/[sessionId]/page.tsx` | Convert to Next.js dynamic route with `export default`. Replace React Router `useNavigate`/`useLocation` with Next.js `useRouter`/`useParams`. Replace mock MOCK_QUESTIONS with API call. Extract components into atoms/molecules. Replace shadcn Card with proper answer option molecule. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/practice/question.types.ts` |
| Service | apps/server | `src/modules/practice/services/question-flow.service.ts` |
| Controller | apps/server | `src/modules/practice/controllers/question-flow.controller.ts` |
| Route | apps/server | `src/modules/practice/routes/question-flow.routes.ts` |
| View (Page) | apps/web | `src/app/(protected)/student/practice/[sessionId]/page.tsx` |
| Template | apps/web | `src/components/templates/practice-session-template.tsx` |
| Organism | apps/web | `src/components/practice/question-stem.tsx` |
| Organism | apps/web | `src/components/practice/answer-options.tsx` |
| Molecule | apps/web | `src/components/practice/answer-option-card.tsx` |
| Molecule | apps/web | `src/components/practice/question-timer.tsx` |
| Molecule | apps/web | `src/components/practice/session-progress-bar.tsx` |
| Molecule | apps/web | `src/components/practice/mastery-live-bar.tsx` |
| Molecule | apps/web | `src/components/practice/question-header.tsx` |
| API Tests | apps/server | `src/modules/practice/__tests__/question-flow.service.test.ts` |
| API Tests | apps/server | `src/modules/practice/__tests__/question-flow.controller.test.ts` |
| E2E | apps/web | `e2e/adaptive-practice.spec.ts` |

## Database Schema
Uses `student_responses` table defined in STORY-ST-4:

```sql
-- session_flags: flagged/bookmarked questions within a session
CREATE TABLE session_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES assessment_items(id),
  flag_type TEXT NOT NULL CHECK (flag_type IN ('flagged', 'bookmarked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, item_id, flag_type)
);
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/practice/sessions/:sessionId/current` | Student | Get current question for session |
| POST | `/api/v1/practice/sessions/:sessionId/answer` | Student | Submit answer, get feedback + next item |
| POST | `/api/v1/practice/sessions/:sessionId/flag` | Student | Flag/bookmark current question |
| POST | `/api/v1/practice/sessions/:sessionId/end` | Student | End session early |

**POST /answer request:**
```typescript
{
  item_id: string;
  selected_option: string;  // "A" through "E"
  response_time_ms: number;
}
```

**POST /answer response:**
```typescript
{
  is_correct: boolean;
  correct_option: string;
  explanation: string;
  rationale: { correct: string; wrong_options: Record<string, string> };
  mastery_delta: { concept: string; before: number; after: number };
  next_item: { item_id: string; concept_id: string } | null;  // null if session complete
}
```

## Dependencies
- **Blocks:** STORY-ST-14 (feedback after answer)
- **Blocked by:** STORY-ST-12 (session must be launched)
- **Cross-epic:** Calls Python BKT service (STORY-ST-3) and adaptive selector (STORY-ST-10) via Express proxy

## Testing Requirements
- **API Tests (70%):** Current question returns valid question data for active session. Answer submission records response and updates mastery. Next item returned after answer (or null for last question). Flag endpoint persists flag. End session updates status to 'abandoned'. Controller validates session belongs to authenticated student.
- **E2E (30%):** Student launches practice, answers a question, sees feedback, proceeds to next question. Timer counts down and auto-submits. Keyboard shortcut selects option. Session completion navigates to summary.

## Implementation Notes
- Answer submission flow: client -> Express server -> Python BKT update -> Python item selection -> response with feedback + next item. This is a synchronous chain; target < 500ms total.
- SSE for mastery bar updates if latency is a concern; otherwise REST polling after each answer.
- No backward navigation in adaptive mode (each item selected based on current mastery state).
- Timer component is a reusable atom; same timer reused in actual exam delivery (future).
- Markdown rendering in question stems via `react-markdown` or similar library.
- Progress bar uses the progress-ring atom at small size, or a linear Tailwind progress bar.
- The prototype uses shadcn/ui Card for answer options; production should use a dedicated `answer-option-card` molecule with correct/incorrect state styling.
