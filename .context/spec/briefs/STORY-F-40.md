# STORY-F-40: Concept Review Queue UI

**Epic:** E-13 (Concept Review & Verification)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-13-1

---

## User Story
As a **Faculty member (Dr. Amara Osei, Course Director)**, I need a review queue showing extracted concepts pending verification so that I can approve, reject, or edit them before they become part of the verified curriculum map.

## Acceptance Criteria
- [ ] Review queue page listing all unverified SubConcepts for a course
- [ ] Filterable by: source content, confidence score range, enrichment status
- [ ] Sortable by: confidence score, extraction date, name
- [ ] Per-concept actions: Approve, Reject (with reason), Edit (name/description)
- [ ] Concept detail panel showing: name, description, source chunk text, confidence score, StandardTerm mappings
- [ ] Review statistics banner: total, approved, rejected, pending counts
- [ ] Pagination for large concept lists
- [ ] RBAC enforced: only Course Directors and Institutional Admins can review
- [ ] 12-15 API tests for list, filter, approve, reject, edit actions, permission checks
- [ ] 1 E2E test: full review flow (view queue, approve concept, verify status change)
- [ ] TypeScript strict, named exports only, design tokens only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/SubConceptReviewQueue.tsx` | `apps/web/src/app/(protected)/courses/[courseId]/concepts/page.tsx` | Extract ConceptReviewQueue organism, ConceptReviewCard molecule, ReviewStatsBanner molecule; replace inline styles with Tailwind design tokens; convert to named exports; use `@web/*` path alias |
| `pages/admin/SubConceptDetail.tsx` | `apps/web/src/components/concepts/concept-detail-panel.tsx` | Extract detail panel as slide-over molecule; replace inline styles with design tokens |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/review.types.ts` |
| Controller | apps/server | `src/controllers/concept/concept-review.controller.ts` |
| Route | apps/server | `src/routes/concept/concept-review.routes.ts` |
| Service | apps/server | `src/services/concept/concept-review.service.ts` |
| View - Page | apps/web | `src/app/(protected)/courses/[courseId]/concepts/page.tsx` |
| View - Queue | apps/web | `src/components/concepts/concept-review-queue.tsx` |
| View - Card | apps/web | `src/components/concepts/concept-review-card.tsx` |
| View - Detail | apps/web | `src/components/concepts/concept-detail-panel.tsx` |
| View - Stats | apps/web | `src/components/concepts/review-stats-banner.tsx` |
| View - Filters | apps/web | `src/components/concepts/concept-filters.tsx` |
| Tests | apps/server | `src/controllers/concept/__tests__/concept-review.controller.test.ts` |
| E2E | apps/web | `e2e/concept-review.spec.ts` |

## Database Schema
No new tables. Reads from existing `subconcepts`, `course_subconcepts`, `standard_terms`, `chunks` tables. Review actions write to `concept_reviews` table (created in STORY-F-41).

## API Endpoints

### GET /api/v1/courses/:courseId/concepts
**Auth:** JWT required (course_director or institutional_admin role)
**Query Params:** `status`, `source_content_id`, `confidence_min`, `confidence_max`, `sort_by`, `sort_dir`, `page`, `limit`
**Success Response (200):**
```json
{
  "data": {
    "items": [{ "id": "uuid", "name": "...", "description": "...", "confidence_score": 0.85, "status": "extracted", "source_content": "...", "standard_terms": [...] }],
    "pagination": { "page": 1, "limit": 20, "total": 150 },
    "stats": { "total": 150, "approved": 45, "rejected": 10, "pending": 95 }
  },
  "error": null
}
```

### PATCH /api/v1/concepts/:conceptId/review
**Auth:** JWT required (course_director or institutional_admin)
**Request:**
```json
{ "action": "approve" | "reject" | "edit", "reason": "string (required for reject)", "name": "string (for edit)", "description": "string (for edit)" }
```

## Dependencies
- **Blocked by:** STORY-F-31 (concepts must be extracted), STORY-F-34 (TEACHES relationships exist)
- **Blocks:** STORY-F-44
- **Cross-lane:** STORY-U-3 (RBAC: course_director role required)

## Testing Requirements
- 12-15 API tests: list unverified concepts, filter by source content, filter by confidence range, sort by confidence, pagination, approve action, reject with reason, edit name/description, RBAC enforcement (non-director rejected), stats calculation, empty queue, concept detail with StandardTerm mappings
- 1 E2E test: navigate to queue, view concept list, approve a concept, verify status changes to verified
- Use `afterEach(() => cleanup())` in component tests since `globals: false`.

## Implementation Notes
- `ConceptReviewQueue` is an Organism; `ConceptReviewCard`, `ConceptDetailPanel`, `ReviewStatsBanner` are Molecules (Atomic Design).
- Only Course Directors and Institutional Admins can review concepts (RBAC enforced via `rbac.require(AuthRole.COURSE_DIRECTOR)`).
- Reject action requires a reason string (stored in audit trail).
- Edit action updates SubConcept name/description and triggers re-embedding for dedup consistency.
- Use design tokens for status badges: `--color-info` (pending), `--color-success` (approved), `--color-error` (rejected).
- Detail panel opens as a slide-over showing the source chunk context.
- Apply `.eq()` filters BEFORE `.order()` and `.range()` on Supabase queries.
- Use `Promise.all` for independent Supabase queries (stats + list).
