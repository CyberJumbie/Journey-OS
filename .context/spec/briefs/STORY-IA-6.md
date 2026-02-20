# STORY-IA-6: Framework List Page

**Epic:** E-17 (Framework Browser UI)
**Feature:** F-08 (Framework Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-17-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a framework management page showing all available educational frameworks as cards with summary stats so that I can see which frameworks are seeded and ready for curriculum mapping.

## Acceptance Criteria
- [ ] Framework list page at `/institution/frameworks` (InstitutionalAdmin only)
- [ ] Card grid layout: one card per framework (8 total)
- [ ] Each card shows: framework name, description, node count, hierarchy depth, icon
- [ ] Cards sorted by: node count descending (USMLE first)
- [ ] Click card navigates to hierarchy tree view (STORY-IA-21)
- [ ] FrameworkService queries Neo4j for framework stats (count per label)
- [ ] Loading skeleton while stats are fetched
- [ ] Empty state if no frameworks seeded yet
- [ ] RBAC: InstitutionalAdmin and SuperAdmin access
- [ ] Cards filtered by institution's selected frameworks (from institution settings)

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/FrameworkManagement.tsx` | `apps/web/src/app/(protected)/institution/frameworks/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract framework card into reusable molecule. |
| `pages/institution/FrameworkConfiguration.tsx` | `apps/web/src/components/institution/framework-card-grid.tsx` | Extract card grid layout as organism. Use design tokens for card styling (border-radius, shadow, padding). |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/framework/framework-summary.types.ts` |
| Service | apps/server | `src/services/framework/framework.service.ts` |
| Controller | apps/server | `src/controllers/framework/framework.controller.ts` |
| Routes | apps/server | `src/routes/institution/framework.routes.ts` |
| View | apps/web | `src/app/(protected)/institution/frameworks/page.tsx` |
| Components | apps/web | `src/components/institution/framework-card-grid.tsx`, `src/components/institution/framework-card.tsx` |
| Tests | apps/server | `src/controllers/framework/__tests__/framework.controller.test.ts` |

## Database Schema

No new Supabase tables. Framework data is seeded in Neo4j (STORY-U-12).

### Neo4j Query Pattern
```cypher
MATCH (n) WHERE n.framework IS NOT NULL
RETURN n.framework AS framework, count(n) AS count, max(n.depth) AS max_depth
ORDER BY count DESC
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/institution/frameworks` | InstitutionalAdmin+ | List framework summaries with stats |

## Dependencies
- **Blocked by:** STORY-U-6 (RBAC), STORY-U-12 (framework data must be seeded to browse)
- **Blocks:** STORY-IA-21 (Hierarchy Tree View), STORY-IA-19 (Framework Search)
- **Cross-lane:** STORY-U-12 (universal lane -- seeded data displayed here)

## Testing Requirements
### API Tests (8)
- List endpoint returns all 8 framework summaries
- Stats accuracy: node count and depth match Neo4j data
- Auth enforcement: 403 for non-admin roles
- Empty state: returns empty array when no frameworks seeded
- Role restriction: faculty cannot access endpoint
- Card data structure: each card has name, description, count, depth, icon
- Sort order: cards sorted by node count descending
- Neo4j query performance: completes within acceptable latency

## Implementation Notes
- Framework data is read-only for users -- seeded via STORY-U-12. This page is a browse UI.
- Card component is an organism in Atomic Design; reusable for other card-grid views.
- Design tokens for card styling: `--radius-lg`, `--shadow-md`, `--spacing-4` padding from packages/ui theme.
- Consider caching framework stats (they change only when re-seeding) -- use stale-while-revalidate pattern.
- Neo4j query: `MATCH (n) WHERE n.framework IS NOT NULL RETURN n.framework AS framework, count(n) AS count`.
- FrameworkService uses `readonly #neo4jRepository` with constructor DI.
