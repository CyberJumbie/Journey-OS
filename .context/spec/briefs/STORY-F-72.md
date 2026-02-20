# STORY-F-72: Gap Flagging

**Epic:** E-26 (Blueprint & Assembly Engine)
**Feature:** F-12
**Sprint:** 29
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-26-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need the system to highlight under-represented categories in my exam so that I can address coverage gaps before finalizing the exam.

## Acceptance Criteria
- [ ] Gap analysis runs on current exam composition vs blueprint targets
- [ ] Flags categories below threshold (configurable, default: 80% of target)
- [ ] Gap severity levels: warning (60-80% of target), critical (<60% of target)
- [ ] Gap summary panel in exam builder showing all flagged categories with severity badges
- [ ] Suggested actions: "Add N more [Category] items" with one-click auto-fill button
- [ ] Auto-fill uses recommendation engine (STORY-F-70) to select best items for the specific gap
- [ ] Gaps update in real-time as items are added/removed (client-side computation)
- [ ] Server-side validation on exam save confirms gap state
- [ ] 6-8 API tests: gap computation, severity thresholds, auto-fill integration, server validation

## Reference Screens
No dedicated screen. Gap flagging is an indicator panel within the Exam Builder (STORY-F-71).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A (part of `ExamAssembly.tsx` validation sidebar) | `apps/web/src/components/exam/gap-summary-panel.tsx` | Extract from compliance meter sidebar into a dedicated `GapSummaryPanel` organism; add severity badges (critical=red, warning=yellow) using design tokens; add "Auto-fill" button per gap row that triggers recommendation API |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/recommendation.types.ts` (extend with gap types) |
| Service | apps/server | `src/services/exam/gap-flagging.service.ts` |
| Controller | apps/server | `src/controllers/exam/exam-builder.controller.ts` (extend with gap endpoint) |
| View | apps/web | `src/components/exam/gap-summary-panel.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/gap-flagging.service.test.ts` |

## Database Schema
No new tables. Gap analysis is computed from:
- `blueprints` -- target distributions
- `exam_items` + `assessment_items` -- current exam composition

Gap state is ephemeral (not persisted). Server-side validation on status transition to `'ready'` checks gap state.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exams/:id/gaps` | Compute gap analysis for current exam state |
| POST | `/api/exams/:id/gaps/auto-fill` | Auto-fill a specific gap (body: `{ dimension, category, count }`) |

Response for GET:
```json
{
  "overallCoverage": 72.5,
  "gaps": [
    {
      "dimension": "system",
      "category": "Respiratory",
      "actual": 2,
      "target": 5,
      "deficit": 3,
      "severity": "critical",
      "suggestion": "Add 3 more Respiratory items"
    }
  ],
  "passesThreshold": false
}
```

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-65 (blueprint), STORY-F-70 (recommendation engine for auto-fill)
- **Cross-lane:** none

## Testing Requirements
- 6-8 API tests: gap computation with known exam/blueprint, warning severity at 70% coverage, critical severity at 50% coverage, no gaps when fully covered, auto-fill returns items matching gap category, auto-fill respects remaining item count, server validation on exam finalize rejects critical gaps
- 0 E2E tests

## Implementation Notes
- Gap flagging reuses the coverage computation logic from `CoverageOptimizer` (STORY-F-70). Extract the coverage calculation into a shared utility function that both services import.
- Real-time gap updates are computed client-side for responsiveness. The client maintains local coverage state and recalculates on every item add/remove. Server validates on save/finalize.
- Auto-fill triggers the recommendation engine with gap-specific constraints: `POST /api/blueprints/:id/recommend` with `lockedItemIds` = current exam items, filtered to the gap dimension/category.
- Severity thresholds are configurable per blueprint but default to: warning = 60-80% of target, critical = <60% of target.
- Gap summary panel sits below the compliance meter in the exam builder right sidebar.
