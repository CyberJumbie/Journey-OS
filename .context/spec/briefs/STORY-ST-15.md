# STORY-ST-15: Session Summary

**Epic:** E-41 (Adaptive Practice UI)
**Feature:** F-19
**Sprint:** 32
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-41-4

---

## User Story
As a **Student (Marcus Williams)**, I need a session summary showing mastery changes, concept breakdown, and study recommendations so that I can understand what I learned and plan my next session.

## Acceptance Criteria
- [ ] Session summary page displayed after last question at `/student/practice/:sessionId/summary`
- [ ] Overall score: correct/total with percentage and visual indicator
- [ ] Time spent: total duration and average per question
- [ ] Mastery changes: before/after mastery per concept practiced (with delta)
- [ ] Concept breakdown table: concept name, questions, correct, mastery delta
- [ ] Strongest/weakest concepts highlighted with badges
- [ ] Recommendations: "Focus on [concept] next" based on lowest mastery
- [ ] Option to start new session with recommended focus (pre-fills scope)
- [ ] Option to return to dashboard
- [ ] Option to view detailed progress analytics
- [ ] Session record finalized in database (status: 'completed')
- [ ] Performance analysis: strengths and areas for improvement

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentResults.tsx` | `apps/web/src/app/(protected)/student/practice/[sessionId]/summary/page.tsx` | Convert to Next.js dynamic route with `export default`. Replace React Router with Next.js. Replace mock MOCK_RESULTS with API-driven data. Extract summary cards, performance analysis, and question review into separate components. Replace inline gradient background with Tailwind. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/practice/session-summary.types.ts` |
| Service | apps/server | `src/modules/practice/services/session-summary.service.ts` |
| Controller | apps/server | `src/modules/practice/controllers/session-summary.controller.ts` |
| Route | apps/server | `src/modules/practice/routes/session-summary.routes.ts` |
| View (Page) | apps/web | `src/app/(protected)/student/practice/[sessionId]/summary/page.tsx` |
| Template | apps/web | `src/components/templates/session-summary-template.tsx` |
| Organism | apps/web | `src/components/practice/session-score-card.tsx` |
| Organism | apps/web | `src/components/practice/concept-breakdown-table.tsx` |
| Organism | apps/web | `src/components/practice/performance-analysis.tsx` |
| Organism | apps/web | `src/components/practice/study-recommendations.tsx` |
| Molecule | apps/web | `src/components/practice/question-review-row.tsx` |
| Molecule | apps/web | `src/components/practice/summary-stat-card.tsx` |
| API Tests | apps/server | `src/modules/practice/__tests__/session-summary.service.test.ts` |
| API Tests | apps/server | `src/modules/practice/__tests__/session-summary.controller.test.ts` |

## Database Schema
No additional tables. Reads from and updates existing tables:

- `practice_sessions` — update `status = 'completed'`, `completed_at = NOW()`, `correct_count`
- `student_responses` — aggregate correct/incorrect per concept
- `session_concept_breakdown` — pre-computed concept breakdown (from STORY-ST-5)
- `mastery_history` — before/after mastery snapshots for the session period

**Finalization query:**
```sql
UPDATE practice_sessions
SET status = 'completed',
    completed_at = NOW(),
    correct_count = $2,
    duration_seconds = EXTRACT(EPOCH FROM NOW() - started_at)
WHERE id = $1 AND student_id = $3
RETURNING *;
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/practice/sessions/:sessionId/summary` | Student | Session summary with breakdown and recommendations |
| POST | `/api/v1/practice/sessions/:sessionId/finalize` | Student | Finalize session (set completed) |

**GET /summary response:**
```typescript
{
  session_id: string;
  score: { correct: number; total: number; percentage: number };
  time: { total_seconds: number; avg_per_question_seconds: number };
  mastery_changes: Array<{
    concept: string;
    before: number;
    after: number;
    delta: number;
    questions: number;
    correct: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    concept: string;
    mastery: number;
    reason: string;
  }>;
  question_review: Array<{
    question_number: number;
    stem_preview: string;
    your_answer: string;
    correct_answer: string;
    is_correct: boolean;
    time_seconds: number;
    subject: string;
  }>;
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-12 (session exists), STORY-ST-13 (questions answered)
- **Cross-epic:** Session data feeds into STORY-ST-5 (session history) and STORY-ST-8 (trend charts)

## Testing Requirements
- **API Tests (70%):** Summary returns correct score calculation. Mastery changes correctly show before/after delta. Concept breakdown aggregates correctly from individual responses. Recommendations sorted by lowest mastery. Finalize endpoint updates session status to 'completed'. Summary only accessible by session owner. Summary returns 404 for non-existent session.
- **E2E (0%):** Covered by adaptive practice E2E in STORY-ST-13.

## Implementation Notes
- Session summary data computed server-side from session response records in `student_responses`.
- Mastery before/after requires snapshot of mastery state at session start — stored in `practice_sessions.config` JSONB as `mastery_snapshot` when session is created (STORY-ST-12).
- Recommendations algorithm: rank concepts by `(mastery_level ASC, questions_practiced DESC)` — lowest mastery with most practice = persistent weakness.
- "Start new session" button navigates to practice launcher (STORY-ST-12) with query params pre-filling recommended concept scope.
- The prototype shows 4 summary stat cards (Accuracy, Correct, Incorrect, Total Time) in a responsive grid — reproduce this pattern with the `summary-stat-card` molecule.
- Question review list shows truncated stems with correct/incorrect indicators, matching the prototype's breakdown section.
- Strengths/weaknesses computed from concept breakdown: concepts with >= 80% correct are strengths; <= 50% are weaknesses.
