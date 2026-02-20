# STORY-IA-31: Visual Mapping Interface

**Epic:** E-15 (Objective Mapping & Framework Linking)
**Feature:** F-07
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-15-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a drag-and-drop visual interface for mapping SLOs to ILOs and linking objectives to framework nodes so that curriculum alignment is intuitive and efficient.

## Acceptance Criteria
- [ ] Split-panel layout: SLOs on left, ILOs on right, framework nodes in collapsible panel
- [ ] Drag SLO onto ILO to create FULFILLS proposal
- [ ] Drag objective onto framework node to create framework link
- [ ] Visual connection lines showing existing relationships
- [ ] Color-coded relationship types (FULFILLS, AT_BLOOM, MAPS_TO_COMPETENCY, etc.)
- [ ] Undo: remove a proposed link before submitting
- [ ] Bulk submit: send all proposed links as a batch
- [ ] Mapping progress indicator showing mapped vs unmapped SLOs
- [ ] Controller endpoints: batch link creation, link deletion
- [ ] Responsive: minimum 1024px viewport width
- [ ] 12-15 API tests for batch link creation, drag-drop data format, validation
- [ ] 1 E2E test: drag SLO onto ILO, submit, verify FULFILLS proposal created

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/OutcomeMapping.tsx` | `apps/web/src/app/(protected)/admin/outcome-mapping/page.tsx` | Replace `DashboardLayout` with route group layout. Convert `export default` (required for page.tsx). Replace manual click-to-select with proper drag-and-drop via `@dnd-kit/core`. Add SVG connection lines between mapped nodes. Add framework panel (third column). Add mapping progress bar from prototype. Remove React Router `useNavigate`. Replace `alert()` with toast notification. Use design tokens for all colors. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/mapping/mapping.types.ts` |
| Controller | apps/server | `src/controllers/mapping/mapping.controller.ts` |
| Route | apps/server | `src/routes/mapping.routes.ts` |
| Validation | apps/server | `src/middleware/mapping.validation.ts` |
| View - Page | apps/web | `src/app/(protected)/admin/outcome-mapping/page.tsx` |
| View - Mapper | apps/web | `src/components/organisms/objective-mapper/objective-mapper.tsx` |
| View - SLO Panel | apps/web | `src/components/molecules/slo-panel.tsx` |
| View - ILO Panel | apps/web | `src/components/molecules/ilo-panel.tsx` |
| View - Framework Panel | apps/web | `src/components/molecules/framework-panel.tsx` |
| View - Connection | apps/web | `src/components/atoms/connection-line.tsx` |
| View - Draggable | apps/web | `src/components/atoms/draggable-node.tsx` |
| Hook | apps/web | `src/hooks/use-objective-mapper.ts` |
| Tests | apps/server | `src/controllers/mapping/__tests__/mapping.controller.test.ts` |
| E2E | apps/web | `e2e/objective-mapping.spec.ts` |

## Database Schema
Uses existing junction tables for FULFILLS and framework links. Verify via `list_tables`.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/mappings/batch` | institutional_admin | Create batch of mapping proposals |
| DELETE | `/api/v1/mappings/:id` | institutional_admin | Remove a proposed link |
| GET | `/api/v1/mappings/course/:courseId` | institutional_admin | Get existing mappings for course |

## Dependencies
- **Blocked by:** S-IA-15-1 (FULFILLS workflow), S-IA-15-2 (framework linking service)
- **Blocks:** None
- **Cross-epic:** S-U-01-3 (RBAC: institutional_admin role)

## Testing Requirements
### API Tests (12)
1. POST /mappings/batch creates multiple FULFILLS proposals
2. POST /mappings/batch creates framework links
3. Batch with invalid SLO/ILO IDs returns 422
4. DELETE /mappings/:id removes proposed link
5. GET /mappings/course/:courseId returns existing mappings
6. Duplicate mapping in batch is rejected
7. Mixed FULFILLS + framework links in single batch
8. Undo (delete) only works on pending proposals
9. Batch submit creates audit trail entries
10. Mappings scoped to admin's institution
11. Unauthorized user gets 403
12. Empty batch returns 422

### E2E Test (1)
1. Drag SLO onto ILO, submit batch, verify FULFILLS proposal created

## Implementation Notes
- ObjectiveMapper is an Organism with SLOPanel, ILOPanel, FrameworkPanel (Molecules) and ConnectionLine, DraggableNode (Atoms)
- Use `@dnd-kit/core` for drag-and-drop (React DnD alternative)
- Connection lines rendered with SVG paths between related nodes
- Color coding per relationship type using design tokens
- Bulk submit calls FULFILLS workflow (S-IA-15-1) and framework linking (S-IA-15-2) services
- Performance: lazy-load framework panel; only fetch framework nodes when panel is expanded
- Prototype shows a select-to-link UX; production upgrades to full drag-and-drop
- Progress indicator: `{mapped SLOs} / {total SLOs}` with progress bar
