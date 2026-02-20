# STORY-IA-44: Snapshot Comparison

**Epic:** E-31 (LCME Report Export)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-31-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to compare two compliance snapshots side by side so that I can track compliance improvements and regressions over time and demonstrate continuous improvement to LCME reviewers.

## Acceptance Criteria
- [ ] Snapshot selector: pick two snapshots from dropdown (date-labeled)
- [ ] Side-by-side comparison: standard/element compliance scores
- [ ] Diff highlighting: improved (green arrow up), regressed (red arrow down), unchanged (gray)
- [ ] Delta values: "+5%" or "-3%" per element
- [ ] Summary statistics: total improvements, total regressions, net change
- [ ] New/removed elements highlighted (if standards changed between snapshots)
- [ ] Comparison view at `/admin/compliance/compare?a={id1}&b={id2}`
- [ ] API endpoint: GET /api/compliance/snapshots/compare?a={id1}&b={id2}
- [ ] Export comparison as PDF
- [ ] Responsive table layout with sticky headers

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/institution/AccreditationReports.tsx` (comparison section) | `apps/web/src/app/(protected)/admin/compliance/compare/page.tsx` | Prototype shows report list with status indicators. Production creates dedicated comparison page. Remove `C` color constants and font refs. Remove `useBreakpoint`, `useNavigate`, `useLocation`. Convert `export default` (required for page.tsx). Add snapshot selector dropdowns. Add side-by-side comparison table. Add delta indicators (arrows + percentages). Add summary statistics section. Use design tokens for diff colors. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/comparison.types.ts` |
| Service | apps/server | `src/modules/compliance/services/snapshot-comparison.service.ts` |
| Controller | apps/server | `src/modules/compliance/controllers/snapshot.controller.ts` (extend) |
| Route | apps/server | `src/modules/compliance/routes/snapshot.routes.ts` (extend) |
| View - Page | apps/web | `src/app/(protected)/admin/compliance/compare/page.tsx` |
| View - Table | apps/web | `src/components/organisms/compliance/snapshot-comparison-table.tsx` |
| View - Delta | apps/web | `src/components/atoms/delta-indicator.tsx` |
| View - Selector | apps/web | `src/components/molecules/snapshot-selector.tsx` |
| View - Summary | apps/web | `src/components/molecules/comparison-summary.tsx` |
| Hook | apps/web | `src/hooks/use-snapshot-comparison.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/snapshot-comparison.service.test.ts` |

## Database Schema
No new tables. Reads from `compliance_snapshots` table (IA-39).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/snapshots/compare` | institutional_admin | Compare two snapshots |
| GET | `/api/v1/compliance/snapshots/compare/export/pdf` | institutional_admin | Export comparison as PDF |

Query params: `a` (snapshot ID 1), `b` (snapshot ID 2)

## Dependencies
- **Blocked by:** S-IA-31-1 (at least two snapshots needed for comparison)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /compliance/snapshots/compare returns side-by-side data
2. Delta computed correctly for each element (snapshot_b - snapshot_a)
3. Improved elements marked with positive delta
4. Regressed elements marked with negative delta
5. Unchanged elements marked as unchanged
6. Summary stats: total improvements, regressions, net change
7. New elements in snapshot_b highlighted
8. Removed elements from snapshot_a highlighted
9. PDF export includes comparison data
10. Unauthorized user gets 403

## Implementation Notes
- Comparison algorithm: iterate both snapshot JSON structures, compute per-element deltas
- Handle schema evolution: if LCME standards change between snapshots, mark added/removed elements
- Delta indicator is a reusable atom component (arrow + percentage)
- Comparison PDF reuses PDF export service with comparison-specific template
- This feature is critical for demonstrating continuous improvement to LCME reviewers
- Snapshot selector uses shadcn/ui Select component with date-formatted labels
- URL-based comparison (`?a={id1}&b={id2}`) enables bookmarking and sharing
- Private fields with `#` syntax, constructor DI per architecture rules
