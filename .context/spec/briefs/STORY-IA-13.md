# STORY-IA-13: USMLE Heatmap Component

**Epic:** E-28 (Coverage Computation & Heatmap)
**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-28-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need an interactive 16x7 USMLE heatmap visualization so that I can instantly identify which system-discipline intersections have strong coverage and which have critical gaps.

## Acceptance Criteria
- [ ] D3.js 16x7 heatmap grid: rows = USMLE Systems (16), columns = USMLE Disciplines (7)
- [ ] Color scale: red (0-0.3 low coverage) -> yellow (0.3-0.7 partial) -> green (0.7-1.0 full)
- [ ] Cell hover tooltip: system name, discipline name, coverage %, assessed/total counts
- [ ] Cell click: navigates to gap drill-down view
- [ ] Legend with color scale and coverage thresholds
- [ ] Filter controls: institution, program, course, academic year
- [ ] Responsive: scales to container width while maintaining readable cell sizes
- [ ] Export: download heatmap as PNG or SVG
- [ ] Accessibility: color-blind-friendly palette option, ARIA labels on cells
- [ ] Loading skeleton while coverage data fetches

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/institution/CoverageDashboard.tsx` | `apps/web/src/app/(protected)/admin/coverage/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract heatmap into D3-powered organism. Extract filter controls into molecules. |
| `pages/analytics/BlueprintCoverage.tsx` | `apps/web/src/components/coverage/usmle-heatmap.tsx` | Extract the heatmap grid rendering into a standalone React + D3 component. Use useRef + useEffect for D3 integration. Replace hardcoded colors with design token variables. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/heatmap.types.ts` |
| Atoms | packages/ui | `src/atoms/heatmap-cell.tsx`, `src/atoms/color-legend.tsx` |
| Molecules | apps/web | `src/components/coverage/heatmap-tooltip.tsx`, `src/components/coverage/coverage-filters.tsx` |
| Organisms | apps/web | `src/components/coverage/usmle-heatmap.tsx` |
| Page | apps/web | `src/app/(protected)/admin/coverage/page.tsx` |
| Hooks | apps/web | `src/hooks/use-coverage-data.ts` |
| Utils | apps/web | `src/utils/heatmap-scales.ts`, `src/utils/heatmap-export.ts` |
| Tests | apps/web | `src/components/coverage/__tests__/usmle-heatmap.test.tsx`, `src/utils/__tests__/heatmap-scales.test.ts` |

## Database Schema

No new tables. Consumes data from `coverage_snapshots` table (created in STORY-IA-3).

## API Endpoints

No new endpoints. Consumes existing `GET /api/v1/coverage` endpoint from STORY-IA-3.

## Dependencies
- **Blocked by:** STORY-IA-3 (Coverage Computation Service provides the data)
- **Blocks:** None (gap drill-down view is a future story)
- **Cross-lane:** None

## Testing Requirements
### API Tests (Frontend -- 12-15)
- Rendering: 16x7 grid rendered correctly with correct row/column labels
- Color mapping: cells colored correctly based on coverage score thresholds
- Tooltip content: correct system name, discipline name, coverage %, counts on hover
- Click navigation: clicking cell navigates to correct drill-down URL
- Filter changes: filter selection triggers new API call and re-renders heatmap
- Responsive scaling: grid adapts to container width
- Export: PNG and SVG export produce valid files
- Accessibility: ARIA labels present on all cells
- Color-blind mode: alternative palette applied when enabled
- Loading skeleton: shown while data fetches
- Empty data: displays informative empty state

## Implementation Notes
- Use D3.js for the heatmap rendering within a React wrapper (useRef + useEffect pattern).
- Color scale uses `d3.scaleSequential(d3.interpolateRdYlGn)` with domain [0, 1].
- Color-blind-friendly alternative: sequential blue scale with pattern fills for gap cells.
- Cell size calculation: `Math.max(containerWidth / 7, 60)` width, `Math.max(containerHeight / 16, 36)` height.
- Heatmap export uses `html2canvas` for PNG or direct SVG serialization.
- Filter changes trigger new API call to `/api/v1/coverage?institution=X&program=Y&course=Z`.
- Design tokens: use `--color-coverage-low`, `--color-coverage-mid`, `--color-coverage-high` from theme.
- D3 SVG props (`fill`, `stroke`) cannot use CSS custom properties -- use hex with `/* token: --color-name */` comment.
- `@web/*` path alias for all imports in apps/web.
