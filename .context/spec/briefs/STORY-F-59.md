# STORY-F-59: Import Report

**Epic:** E-24 (Legacy Import Pipeline)
**Feature:** F-11 (Legacy Import)
**Sprint:** 17
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-24-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an import report showing accepted, rejected, and skipped counts with error details so that I can understand what was imported and fix any issues with rejected items.

## Acceptance Criteria
- [ ] Report page: summary card with total, accepted, rejected, skipped counts
- [ ] Pie/donut chart: visual breakdown of import outcomes
- [ ] Rejected items table: item identifier, rejection reason, source row number
- [ ] Skipped items table: item identifier, skip reason (e.g., duplicate detected)
- [ ] Accepted items: link to item bank filtered by import batch
- [ ] Export report as CSV for record-keeping
- [ ] Report persisted: accessible from import history list
- [ ] 5-8 API tests: report generation, counts accuracy, rejected details, CSV export
- [ ] TypeScript strict, named exports only

## Reference Screens
> Part of `FacultyQuestionUpload.tsx` -- the results/report section.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/uploads/FacultyQuestionUpload.tsx` (results section) | `apps/web/src/app/(protected)/import/[importId]/report/page.tsx` | Extract the `uploadStage === "results"` section into a separate report page; replace `qualityReport` mock data with API-driven report from `import_jobs`; replace hardcoded grid/badge colors with design tokens; add donut chart using Recharts; add CSV export button; convert `export default` to page default export; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/import/report.types.ts` |
| Controller | apps/server | `src/controllers/import/import-report.controller.ts` |
| Service | apps/server | `src/services/import/import-report.service.ts` |
| View | apps/web | `src/app/(protected)/import/[importId]/report/page.tsx`, `src/components/import/import-report-summary.tsx`, `src/components/import/rejected-items-table.tsx`, `src/components/import/outcome-chart.tsx` |
| Tests | apps/server | `src/controllers/import/__tests__/import-report.controller.test.ts` |

## Database Schema
No new tables. Report data sourced from existing `import_jobs` and `import_items` tables (created in STORY-F-57).

```sql
-- Report summary query:
SELECT
  ij.total_items,
  ij.accepted_count,
  ij.rejected_count,
  ij.skipped_count,
  ij.report_summary
FROM import_jobs ij
WHERE ij.id = :importId AND ij.user_id = :userId;

-- Rejected items detail:
SELECT ii.source_row, ii.error_reason, ii.status
FROM import_items ii
WHERE ii.import_job_id = :importId AND ii.status IN ('rejected', 'skipped')
ORDER BY ii.source_row ASC;
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/import/:importId/report` | Faculty+ | Get import report summary and details |
| GET | `/api/v1/import/:importId/report/csv` | Faculty+ | Export report as CSV |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-57 (Import pipeline produces report data)
- **Cross-epic:** None

## Testing Requirements
### API Tests (5-8)
1. GET report returns correct total, accepted, rejected, skipped counts
2. Rejected items include source row number and error reason
3. Skipped items include source row number and skip reason
4. CSV export returns valid CSV with all item details
5. Report 404 for non-existent import job
6. Report 403 for import job owned by different user
7. Report counts match actual import_items records

## Implementation Notes
- Report data sourced from `import_jobs` table: counts stored as integers, detailed reasons in `import_items`.
- Rejected items table should show enough context for faculty to fix source file and re-import.
- Consider "Re-import rejected" button that opens field mapping with only rejected rows pre-loaded.
- Donut chart: use Recharts `PieChart` with `innerRadius` for donut style. Hex colors in SVG props with `/* token: --color-name */` comments per CLAUDE.md charting exception.
- Report page URL pattern: `/import/:importId/report`.
- Design tokens for outcome colors: accepted = `--color-success`, rejected = `--color-destructive`, skipped = `--color-warning`.
- Use `@web/*` path alias for all web app imports.
- Before writing any queries, run `list_tables` via Supabase MCP to verify actual table/column names.
