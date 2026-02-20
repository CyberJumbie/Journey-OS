# STORY-IA-41: Element Drill-Down View

**Epic:** E-30 (LCME Compliance Engine)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-30-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to drill down into a specific LCME element to see the full evidence chain with direct links so that I can verify compliance and identify gaps.

## Acceptance Criteria
- [ ] Drill-down page at `/admin/compliance/elements/:elementId`
- [ ] Element header: standard name, element number, element description
- [ ] Compliance status badge (met/partial/unmet) with percentage
- [ ] Compliance scorecard: overall, FULFILLS, teaching, assessment sub-scores
- [ ] Evidence chain tree: Element -> ILOs -> SLOs -> Courses (collapsible)
- [ ] Each node in chain is a clickable link to its detail page
- [ ] Gap indicator: highlight missing links in the chain (e.g., ILO with no SLO mapping)
- [ ] Evidence count: number of complete chains vs total expected
- [ ] Filter chain by course or program
- [ ] Breadcrumb: Compliance > Standard N > Element N.N
- [ ] Export evidence chain as PDF for site visit documentation
- [ ] Loading state with skeleton matching tree layout
- [ ] List of identified gaps with descriptions

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/LCMEElementDrillDown.tsx` | `apps/web/src/app/(protected)/admin/compliance/elements/[elementId]/page.tsx` | Replace `AdminDashboardLayout` with route group layout. Replace React Router `useParams` with Next.js `params` prop. Convert `export default` (required for page.tsx). Replace hardcoded colors (`text-blue-600`, `text-purple-600`, `text-green-600`) with design tokens. Add proper evidence chain tree component (collapsible). Add gap indicator badges. Replace mock `mappedILOs` and `gaps` with API data. Add Back to Heatmap button with Next.js navigation. Add PDF export button. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/evidence-chain.types.ts` |
| Service | apps/server | `src/modules/compliance/services/element-drilldown.service.ts` |
| Controller | apps/server | `src/modules/compliance/controllers/element-drilldown.controller.ts` |
| Route | apps/server | `src/modules/compliance/routes/compliance.routes.ts` (extend) |
| View - Page | apps/web | `src/app/(protected)/admin/compliance/elements/[elementId]/page.tsx` |
| View - Tree | apps/web | `src/components/organisms/compliance/evidence-chain-tree.tsx` |
| View - Node | apps/web | `src/components/molecules/chain-node.tsx` |
| View - Gap | apps/web | `src/components/atoms/gap-indicator.tsx` |
| View - Scorecard | apps/web | `src/components/molecules/compliance-scorecard.tsx` |
| Hook | apps/web | `src/hooks/use-element-drilldown.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/element-drilldown.service.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/element-drilldown.controller.test.ts` |

## Database Schema
No new tables. Reads from compliance results and Neo4j graph.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/elements/:elementId` | institutional_admin | Get element drill-down with evidence chains |
| GET | `/api/v1/compliance/elements/:elementId/export` | institutional_admin | Export evidence chain as PDF |

## Dependencies
- **Blocked by:** S-IA-30-1 (compliance computation with evidence chains)
- **Blocks:** None
- **Cross-epic:** Links to ILO pages (E-14), SLO pages (E-09), Course pages (E-08)

## Testing Requirements
### API Tests (10)
1. GET /compliance/elements/:elementId returns element details
2. Evidence chain tree includes Element -> ILO -> SLO -> Course chain
3. Compliance scorecard includes overall, FULFILLS, teaching, assessment scores
4. Gap indicators identify missing links in chain
5. Each chain node includes clickable link data
6. Evidence count: complete chains vs expected
7. Filter by course returns scoped chain
8. Filter by program returns scoped chain
9. PDF export generates downloadable file
10. Unauthorized user gets 403

## Implementation Notes
- Evidence chain tree uses a recursive tree component; consider D3.js tree layout for complex chains
- Gap indicators are critical: they show exactly where curriculum mapping is incomplete
- PDF export for individual elements reuses pattern from S-IA-31-2
- Deep links to ILO/SLO/Course detail pages enable quick navigation for fixing gaps
- Prototype shows scorecard with 4 sub-scores: Overall (combined), FULFILLS (30%), Teaching (30%), Assessment (40%)
- Prototype shows gaps as a text list -- production should use visual gap indicators inline in the tree
- Progress bar under scorecard shows overall coverage percentage
