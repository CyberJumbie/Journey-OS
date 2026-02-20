# STORY-F-66: Item Detail View

**Epic:** E-25 (Item Bank Browser & Export)
**Feature:** F-11
**Sprint:** 18
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-25-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a detailed item view showing full metadata, tags, version history, and provenance so that I have complete context for each question in the item bank.

## Acceptance Criteria
- [ ] Full question display: vignette, stem, lead-in, answer choices with correct answer highlighted, rationale/explanation
- [ ] Metadata panel: question type, difficulty, Bloom level, USMLE system (from tags), discipline
- [ ] Tags panel: all assigned tags with inline editing (add/remove)
- [ ] Version history: timeline of changes from `question_versions` table (created, ai_refined, faculty_edited, regenerated)
- [ ] Provenance panel: source concept, SLO, course, generation method (from `generation_metadata` JSONB)
- [ ] Quality scores: `quality_score` from `assessment_items` plus per-metric scores if available in metadata
- [ ] Usage statistics: times used in exams (count from `exam_items`), performance metrics placeholder
- [ ] Edit capability: inline editing of question fields creates new version in `question_versions`
- [ ] Breadcrumb navigation: Repository > [Course] > [Question ID]
- [ ] 8-12 API tests: detail fetch, version history, tag editing, provenance chain, edit creates version

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/questions/ItemDetail.tsx` | `apps/web/src/app/(protected)/repository/[itemId]/page.tsx` | Extract clinical vignette section into `QuestionDisplay` organism; extract metadata panel into `ItemMetadataPanel` molecule; extract options list into `OptionsList` molecule; replace inline `style={{}}` with Tailwind design tokens; replace `C.*` constants with CSS custom properties; remove embedded sidebar; convert review action buttons to separate `ReviewActions` molecule; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/item-bank/detail.types.ts` |
| Service | apps/server | `src/services/item-bank/item-detail.service.ts` |
| Controller | apps/server | `src/controllers/item-bank/item-detail.controller.ts` |
| View | apps/web | `src/app/(protected)/repository/[itemId]/page.tsx` |
| Components | apps/web | `src/components/repository/question-display.tsx`, `src/components/repository/item-metadata-panel.tsx`, `src/components/repository/version-timeline.tsx`, `src/components/repository/item-tag-editor.tsx`, `src/components/repository/provenance-panel.tsx` |
| Tests | apps/server | `src/services/item-bank/__tests__/item-detail.service.test.ts` |

## Database Schema
Uses existing tables:
- `assessment_items` -- main question data (stem, vignette, lead_in, options, explanation, difficulty, bloom_level, quality_score, tags, generation_metadata, course_id, status)
- `question_versions` -- version history (version, vignette, stem, lead_in, options, explanation, change_type, change_summary, changed_by, created_at)
- `exam_items` -- usage count via `COUNT(*) WHERE question_id = :id`

No new tables needed. Provenance data extracted from `generation_metadata` JSONB field on `assessment_items`.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/item-bank/:itemId` | Full item detail with metadata |
| GET | `/api/item-bank/:itemId/versions` | Version history timeline |
| PUT | `/api/item-bank/:itemId` | Edit item (creates new version) |
| PUT | `/api/item-bank/:itemId/tags` | Update tags (DualWriteService) |
| GET | `/api/item-bank/:itemId/usage` | Usage statistics (exam count, performance) |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-64 (browser page exists to navigate from)
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: fetch detail with all fields, fetch nonexistent item (expect 404), version history ordered by version desc, tag update triggers DualWriteService, edit creates new version entry, usage count from exam_items, provenance extraction from generation_metadata, inline edit validation
- 0 E2E tests

## Implementation Notes
- Provenance chain: extract from `generation_metadata` JSONB which stores `{ concept, slo_id, course_id, pipeline_version, model }`. For graph-based provenance, query Neo4j: `(Question)-[:TESTS]->(SubConcept)-[:PART_OF]->(Concept)-[:MAPPED_TO]->(SLO)-[:BELONGS_TO]->(Course)`.
- Version history from `question_versions` table ordered by `version DESC`. Each edit creates a new row with `change_type = 'faculty_edited'`.
- Tag editing triggers DualWriteService to update both Supabase `assessment_items.tags` array and Neo4j tag relationships.
- Usage statistics: `SELECT COUNT(*) FROM exam_items WHERE question_id = :id` for times used.
- Edit creates new version, not in-place update -- preserves audit trail. Insert into `question_versions`, then update `assessment_items` with new field values.
- Breadcrumb: parse `course_id` -> fetch course name for breadcrumb display.
