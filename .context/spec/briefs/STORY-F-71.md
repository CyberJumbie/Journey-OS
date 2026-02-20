# STORY-F-71: Exam Builder UI

**Epic:** E-26 (Blueprint & Assembly Engine)
**Feature:** F-12
**Sprint:** 29
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-26-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a drag-and-drop exam builder with a live blueprint compliance meter so that I can assemble exams interactively while ensuring coverage targets are met.

## Acceptance Criteria
- [ ] Exam builder page at `/exams/build`
- [ ] Left panel: recommended items list with search, filter by system/discipline/Bloom
- [ ] Right panel: exam item sequence with drag-and-drop reorder via @dnd-kit
- [ ] Drag items from recommendations to exam; drag to remove
- [ ] Live blueprint compliance meter: real-time coverage percentage per dimension (system, Bloom, difficulty)
- [ ] Visual indicators: green (on target >=80%), yellow (60-80%), red (<60%)
- [ ] Exam metadata form: title, description, time limit, passing score (persisted to `exams` table)
- [ ] Save as draft functionality (status = `'draft'` or `'building'`)
- [ ] Item count and total time estimate display
- [ ] Undo/redo for item additions and removals (client-side state stack)
- [ ] Keyboard accessible drag-and-drop (a11y via @dnd-kit)
- [ ] Performance: smooth drag with 200+ items loaded
- [ ] Autosave every 30 seconds (debounced PUT to API)
- [ ] 8-12 API tests for server-side exam CRUD; 1 E2E test for drag-and-drop assembly flow

## Reference Screens
> Refactor the prototype for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/exams/ExamAssembly.tsx` | `apps/web/src/app/(protected)/exams/build/page.tsx` | Extract left panel into `ItemRecommendationPanel` organism; extract right panel into `ExamSequencePanel` organism; extract blueprint validation sidebar into `ComplianceMeter` molecule; replace inline `style={{}}` with Tailwind design tokens; replace `C.*` constants with CSS custom properties; remove embedded sidebar (use shared layout); implement actual @dnd-kit drag-and-drop (prototype uses click-to-add); extract progress bars into reusable `DimensionProgressBar` atom |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/exam-builder.types.ts` |
| Service | apps/server | `src/services/exam/exam-builder.service.ts` |
| Controller | apps/server | `src/controllers/exam/exam-builder.controller.ts` |
| Routes | apps/server | `src/routes/exam/exam-builder.routes.ts` |
| View | apps/web | `src/app/(protected)/exams/build/page.tsx` |
| Components | apps/web | `src/components/exam/item-recommendation-panel.tsx`, `src/components/exam/exam-sequence-panel.tsx`, `src/components/exam/compliance-meter.tsx`, `src/components/exam/exam-metadata-form.tsx`, `src/components/exam/dimension-progress-bar.tsx` |
| Template | apps/web | `src/components/templates/exam-builder-template.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/exam-builder.service.test.ts` |
| E2E | apps/web | `e2e/exam-builder.spec.ts` |

## Database Schema
Uses existing `exams` table (with new `blueprint_id` FK from STORY-F-65) and `exam_items` join table.

Exam builder writes:
- `exams`: title, description, course_id, created_by, blueprint_id, time_limit_minutes, status (`'draft'`/`'building'`/`'ready'`), total_questions
- `exam_items`: exam_id, question_id, position, points

No new tables needed.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/exams` | Create new exam (from blueprint) |
| GET | `/api/exams/:id` | Get exam with items |
| PUT | `/api/exams/:id` | Update exam metadata |
| PUT | `/api/exams/:id/items` | Bulk update item sequence (full replace) |
| POST | `/api/exams/:id/items` | Add item to exam |
| DELETE | `/api/exams/:id/items/:itemId` | Remove item from exam |
| PUT | `/api/exams/:id/status` | Transition exam status |

## Dependencies
- **Blocks:** STORY-F-73 (exam must be built before assignment)
- **Blocked by:** STORY-F-65 (blueprint model), STORY-F-70 (recommendation engine)
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: create exam from blueprint, add item, remove item, reorder items (position update), save as draft, update metadata, bulk item replace, status transition validation, autosave idempotency
- 1 E2E test: open builder, search for item, drag to exam panel, verify compliance meter updates, save exam

## Implementation Notes
- Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop. Provides keyboard accessibility out of the box.
- Compliance meter recalculates on every item add/remove. Computation is client-side for responsiveness (reuse `CoverageOptimizer` logic from STORY-F-70 as a shared utility or call the API on debounce).
- Autosave: `useEffect` with 30-second `setInterval`, calls `PUT /api/exams/:id/items` with current item sequence. Debounce to avoid rapid saves during drag operations.
- Exam state: `exams.status` transitions: `draft` -> `building` (first item added) -> `ready` (manual finalize) -> further states in STORY-F-75.
- DualWriteService: `(Exam)-[:INCLUDES]->(AssessmentItem)` relationships in Neo4j on save.
- Undo/redo: maintain client-side state stack (array of item sequences). Max depth 50.
- Performance: virtualize the recommendation list with TanStack Virtual for large item banks.
- Blueprint compliance thresholds: green (>=80% of target), yellow (60-80%), red (<60%). These match the gap flagging thresholds in STORY-F-72.
