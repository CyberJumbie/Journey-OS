# STORY-IA-42: Gap-to-Workbench Handoff

**Epic:** E-29 (Gap-Driven Generation)
**Feature:** F-13
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-29-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need the "Generate for gap" action to launch the workbench pre-configured with the gap scope so that faculty can immediately start generating questions for under-assessed areas without manual configuration.

## Acceptance Criteria
- [ ] "Generate for gap" button in drill-down UI constructs a `GenerationSpec` with pre-filled scope (system, discipline, topic, SubConcepts)
- [ ] Navigation to workbench with spec passed via URL search params and/or session storage
- [ ] Workbench generation wizard auto-fills: scope step pre-populated, difficulty defaults to Medium
- [ ] Post-generation coverage delta shown: "Before: 23% -> After: 31% (+8%)" for the targeted cell
- [ ] Coverage delta computed by re-querying coverage service after new questions saved
- [ ] Faculty notification: if admin initiates gap generation, assigned faculty receives a notification
- [ ] 8-10 API tests: spec construction, navigation params, wizard pre-fill, coverage delta computation, notification dispatch

## Reference Screens
> No direct screen -- navigation action from CoverageDashboard drill-down to Generation Workbench.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/institution/CoverageDashboard.tsx` (action buttons) | `apps/web/src/components/molecules/gap-generate-button.tsx` | Extract "Generate" action from coverage table rows. Create gap-generate-button molecule with handoff logic. Create coverage-delta-card molecule for post-generation feedback. Navigation uses Next.js router with search params. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/gap-handoff.types.ts` |
| Service | apps/server | `src/services/coverage/gap-handoff.service.ts` |
| Controller | apps/server | `src/controllers/coverage/coverage.controller.ts` (update) |
| Route | apps/server | `src/routes/coverage.routes.ts` (update) |
| View - Button | apps/web | `src/components/molecules/gap-generate-button.tsx` |
| View - Delta | apps/web | `src/components/molecules/coverage-delta-card.tsx` |
| Hook | apps/web | `src/hooks/use-gap-handoff.ts` |
| Tests | apps/server | `src/services/coverage/__tests__/gap-handoff.test.ts` |
| Tests | apps/web | `src/components/molecules/__tests__/gap-generate-button.test.tsx` |

## Database Schema
No new tables. Uses existing coverage computation and notification tables.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/coverage/gap-handoff` | institutional_admin | Create handoff spec and notify faculty |
| GET | `/api/v1/coverage/delta` | institutional_admin | Compute coverage delta for a cell |

Query params for delta: `system`, `discipline`, `beforeTimestamp`

## Dependencies
- **Blocked by:** S-IA-29-1 (drill-down UI), S-F-19-1 (workbench exists to navigate to)
- **Blocks:** None
- **Cross-epic:** S-F-19-1 (Sprint 7 workbench), S-F-19-4 (generation wizard to pre-fill)

## Testing Requirements
### API Tests (8)
1. POST /coverage/gap-handoff creates GenerationSpec
2. Handoff spec includes system, discipline, topic, SubConcepts
3. Faculty notification created when admin initiates for another user
4. GET /coverage/delta returns before/after coverage percentages
5. Coverage delta computes correctly after new questions added
6. Handoff URL format includes all scope params
7. Session storage stores full GenerationSpec as fallback
8. Unauthorized user gets 403

## Implementation Notes
- Handoff URL format: `/workbench?mode=generate&prefill=gap&system=cardiovascular&discipline=pathology&topic=myocardial_infarction`
- Session storage fallback: store full `GenerationSpec` object in sessionStorage keyed by a handoff ID
- Coverage delta requires two snapshots: before generation, after -- use `CoverageComputationService.computeForCell(system, discipline)`
- Notification uses notification system from E-34 (if available) or falls back to in-app toast
- Role check: only institutional_admin and course_director can initiate gap-driven generation for other faculty
- Private fields with `#` syntax, constructor DI per architecture rules
