# STORY-ST-6: Mastery Breakdown Component

**Epic:** E-42 (Student Dashboard)
**Feature:** F-20
**Sprint:** 27
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-42-2

---

## User Story
As a **Student (Marcus Williams)**, I need to see concept-level progress bars for each USMLE system so that I can identify which specific topics need more study time.

## Acceptance Criteria
- [ ] Expandable accordion section per USMLE system showing child concepts
- [ ] Progress bar per concept with percentage label
- [ ] Color coding: mastered (green >80%), in-progress (yellow 50-80%), weak (red <50%) using design tokens
- [ ] Sort concepts by mastery (weakest first by default)
- [ ] Toggle sort: weakest-first vs alphabetical
- [ ] Concept count badge per system (e.g., "12/45 mastered")
- [ ] Clicking a concept links to practice session for that concept (disabled until Sprint 32)
- [ ] Mock data service provides realistic concept-level mastery for all 12 USMLE systems
- [ ] Smooth expand/collapse animation via Radix Accordion
- [ ] Accessible: proper ARIA labels on progress bars

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentProgress.tsx` (topic mastery section) | `apps/web/src/components/student/mastery-breakdown.tsx` | Extract the "Topic Mastery" panel with progress bars. Replace inline styles with Tailwind. Add accordion expand/collapse per USMLE system. Add sort toggle. |
| `components/shared/progress-ring.tsx` | `packages/ui/src/atoms/progress-ring.tsx` | Reuse for system-level summary ring in accordion header. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/mastery.types.ts` (extend with concept-level types) |
| Service | apps/server | `src/modules/student/services/mock-mastery.service.ts` (extend with concept-level data) |
| Controller | apps/server | `src/modules/student/controllers/student-dashboard.controller.ts` (extend) |
| Organism | apps/web | `src/components/student/mastery-breakdown.tsx` |
| Molecule | apps/web | `src/components/student/system-mastery-section.tsx` |
| Atom | apps/web | `src/components/student/concept-progress-bar.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/mock-mastery.service.test.ts` |

## Database Schema
Uses `student_mastery` table defined in STORY-ST-2. No additional tables needed.

**Query pattern:** Aggregate `student_mastery` rows grouped by USMLE system (via concept's system tag), returning per-concept mastery levels within each system.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/mastery/breakdown` | Student | Per-concept mastery grouped by USMLE system |

**Query parameters:**
- `sort` (`mastery_asc` or `alphabetical`, default `mastery_asc`)
- `system` (optional filter for a single USMLE system)

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-2 (dashboard page exists)
- **Cross-epic:** Mock data until STORY-ST-3 (BKT mastery estimation) replaces it in Sprint 31

## Testing Requirements
- **API Tests (70%):** Breakdown endpoint returns concepts grouped by system. Sorting by mastery ascending works. Sorting by alphabetical works. Concept count per system matches expected mock data. Only returns mastery for the authenticated student.
- **E2E (0%):** Covered by dashboard E2E in STORY-ST-2.

## Implementation Notes
- Progress bar is a reusable atom component. Use Tailwind `bg-[--color-*]` tokens for color coding.
- Mock mastery service should generate data for all 12 USMLE systems with 20-50 concepts each.
- Consider virtualized list for performance if concept count exceeds 200 within an expanded section.
- Accordion uses Radix Accordion primitive (available via shadcn/ui). Do NOT test Radix interactions in jsdom per CLAUDE.md rules.
- When BKT service is ready (Sprint 31), swap the mock mastery service via constructor DI. The component and controller remain unchanged.
