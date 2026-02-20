# STORY-IA-28: Gap Drill-Down UI

**Epic:** E-29 (Gap-Driven Generation)
**Feature:** F-13
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-28-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to click a heatmap cell and drill down into the specific USMLE topics with blind spots so that I can understand exactly which concepts are under-assessed and take targeted action.

## Acceptance Criteria
- [ ] Clicking a heatmap cell opens a drill-down panel/page for that system-discipline intersection
- [ ] Drill-down shows: list of USMLE Topics in that cell, each with coverage percentage
- [ ] Topics sorted by coverage ascending (worst gaps first)
- [ ] Each topic expandable to show SubConcepts with individual coverage status (assessed/unassessed)
- [ ] "Blind spots" badge on topics with >50% unassessed SubConcepts
- [ ] Summary stats at top: total topics, topics with gaps, total blind spots
- [ ] Action button per topic: "Generate Questions" (navigates to workbench with gap scope)
- [ ] Breadcrumb navigation: Heatmap -> System: Discipline -> Topic details
- [ ] 8-10 API tests: drill-down rendering, topic list sorting, SubConcept expansion, blind spot detection, navigation

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/institution/CoverageDashboard.tsx` (drill-down section) | `apps/web/src/app/(protected)/coverage/[system]/[discipline]/page.tsx` | Extract drill-down section from CoverageDashboard. Replace React Router with Next.js dynamic segments `[system]/[discipline]`. Remove `C` color constants and `sans`/`serif`/`mono` font refs. Replace inline styles with design tokens. Remove `useBreakpoint` hook. Add topic expansion, blind spot badges, generate action buttons. Use `export default` for page.tsx. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/gap-drilldown.types.ts` |
| Atoms | packages/ui | `src/atoms/coverage-badge.tsx`, `src/atoms/blind-spot-indicator.tsx` |
| Molecules | packages/ui | `src/molecules/topic-coverage-row.tsx` |
| Organisms | apps/web | `src/components/organisms/coverage/gap-drilldown-panel.tsx`, `src/components/organisms/coverage/topic-subconcept-list.tsx` |
| Pages | apps/web | `src/app/(protected)/coverage/[system]/[discipline]/page.tsx` |
| Hook | apps/web | `src/hooks/use-gap-drilldown.ts` |
| Tests | apps/web | `src/components/organisms/coverage/__tests__/gap-drilldown-panel.test.tsx` |

## Database Schema
No new tables. Reads from existing coverage computation results via Neo4j.

### Neo4j Query
```cypher
MATCH (t:USMLE_Topic)-[:IN_SYSTEM]->(s:USMLE_System {name: $system}),
      (t)-[:IN_DISCIPLINE]->(d:USMLE_Discipline {name: $discipline})
OPTIONAL MATCH (sc:SubConcept)-[:BELONGS_TO]->(t)
OPTIONAL MATCH (q:Question)-[:ASSESSES]->(sc)
RETURN t, collect(sc), count(q)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/coverage/drilldown` | institutional_admin | Get gap drill-down for system-discipline intersection |

Query params: `system`, `discipline`

## Dependencies
- **Blocked by:** S-IA-28-2 (heatmap component to click from)
- **Blocks:** S-IA-29-2 (Gap-to-Workbench Handoff)
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /coverage/drilldown returns topics for system-discipline intersection
2. Topics sorted by coverage ascending (worst gaps first)
3. Each topic includes SubConcept breakdown
4. Blind spot flag calculated correctly (>50% unassessed)
5. Summary stats: total topics, gaps count, blind spots count
6. Empty system-discipline intersection returns empty list
7. Invalid system/discipline returns 404
8. Data scoped to admin's institution
9. "Generate Questions" action constructs correct workbench URL
10. Unauthorized user gets 403

## Implementation Notes
- Route: `/coverage/[system]/[discipline]` -- uses dynamic segments for USMLE system and discipline
- Blind spot logic: `topic.blind_spot = (unassessed_subconcepts / total_subconcepts) > 0.5`
- "Generate Questions" button passes scope params via URL: `/workbench?mode=generate&system=X&discipline=Y&topic=Z`
- Use design tokens for coverage badges (green/yellow/red)
- Topic expansion uses Radix Accordion or manual expand/collapse
- Breadcrumb: Heatmap -> System: Discipline -> Topic
