# STORY-IA-40: Compliance Heatmap

**Epic:** E-30 (LCME Compliance Engine)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-30-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need an interactive 12-standard compliance heatmap so that I can quickly identify which LCME standards are met, partially met, or unmet across the institution.

## Acceptance Criteria
- [ ] Heatmap grid: 12 standards (rows) x elements (columns) within each standard
- [ ] Cell color: green (met, 100%), yellow (partial, 50-99%), orange (partial, 1-49%), red (unmet, 0%)
- [ ] Hover tooltip: element name, compliance percentage, evidence count
- [ ] Click cell to navigate to element drill-down (S-IA-30-3)
- [ ] Standard-level summary row showing aggregate compliance
- [ ] Overall institution compliance score displayed prominently
- [ ] Legend explaining color scale
- [ ] Print-friendly layout option
- [ ] Responsive: scrollable on smaller screens with sticky header
- [ ] Last computed timestamp displayed
- [ ] Recompute button triggering fresh computation
- [ ] Export CSV and Generate Report buttons

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/LCMEComplianceHeatmap.tsx` | `apps/web/src/app/(protected)/admin/compliance/page.tsx` | Replace `AdminDashboardLayout` with route group layout. Convert `export default` (required for page.tsx). Replace hardcoded `bg-green-500`, `bg-amber-500`, `bg-red-500` cell colors with design tokens. Replace mock data with API call to compliance computation. Add proper tooltip component (Radix Tooltip). Add click-to-drill-down navigation via Next.js router. Add print media query styles. Add auto-generated legend from design tokens. Replace `alert()` in generate handler with proper async flow. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/compliance.types.ts` (extend) |
| Service | apps/server | `src/modules/compliance/services/compliance-computation.service.ts` (extend) |
| Controller | apps/server | `src/modules/compliance/controllers/compliance.controller.ts` (extend) |
| View - Page | apps/web | `src/app/(protected)/admin/compliance/page.tsx` |
| View - Heatmap | apps/web | `src/components/organisms/compliance/compliance-heatmap.tsx` |
| View - Cell | apps/web | `src/components/atoms/heatmap-cell.tsx` |
| View - Legend | apps/web | `src/components/molecules/compliance-legend.tsx` |
| Hook | apps/web | `src/hooks/use-compliance-heatmap.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/compliance-heatmap-data.test.ts` |
| Tests | apps/web | `src/components/organisms/compliance/__tests__/compliance-heatmap.test.tsx` |

## Database Schema
No new tables. Reads from `compliance_results` table populated by IA-27.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/heatmap/:institutionId` | institutional_admin | Get heatmap data (12 standards x elements) |
| POST | `/api/v1/compliance/recompute/:institutionId` | institutional_admin | Trigger fresh compliance computation |

## Dependencies
- **Blocked by:** S-IA-30-1 (compliance computation data)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (8)
1. GET /compliance/heatmap returns 12 standards with elements
2. Each element has compliance status and percentage
3. Cell colors map correctly to percentage thresholds
4. Standard-level aggregate computed correctly
5. Overall institution score is weighted average
6. Recompute triggers fresh computation
7. Heatmap data scoped to admin's institution
8. Unauthorized user gets 403

## Implementation Notes
- Heatmap rendering: consider custom CSS grid or D3.js for cell rendering and interactions
- Color scale uses design tokens; do not hardcode hex values
- Print layout: `@media print` rules for simplified colors for grayscale printers
- Heatmap data structure: nested array of standards -> elements -> compliance score
- Prototype shows 3 standards with 6 elements; production expands to 12 standards with ~105 elements
- Export CSV button from prototype preserved
- Generate Report button navigates to or triggers PDF export flow (IA-43)
- Cell click navigates to `/admin/compliance/elements/${elementId}` (IA-41)
