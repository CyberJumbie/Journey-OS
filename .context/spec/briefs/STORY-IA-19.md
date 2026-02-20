# STORY-IA-19: Framework Search

**Epic:** E-17 (Framework Browser UI)
**Feature:** F-08 (Framework Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-17-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to search across framework nodes by name or keyword so that I can quickly find specific standards, competencies, or objectives without manually browsing the tree.

## Acceptance Criteria
- [ ] Search input on framework list page and tree view page
- [ ] Search across: node name, description, framework_id
- [ ] Results grouped by framework with framework name as section header
- [ ] Each result shows: node name, framework, level, parent path
- [ ] Click result navigates to tree view with that node expanded and highlighted
- [ ] Debounced input: 300ms delay before query fires
- [ ] Minimum 2 characters to trigger search
- [ ] Empty results state with clear messaging
- [ ] Neo4j full-text index used for performant search
- [ ] Result highlighting: bold the matching substring in the result display

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/FrameworkManagement.tsx` | `apps/web/src/components/institution/framework-search.tsx` | Extract search bar and results panel from the FrameworkManagement page. Convert to client component with debounced input. Replace inline styles with Tailwind + design tokens. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Service | apps/server | `src/services/framework/framework-search.service.ts` |
| Controller | apps/server | `src/controllers/framework/framework-search.controller.ts` |
| Routes | apps/server | `src/routes/institution/framework.routes.ts` (update) |
| Components | apps/web | `src/components/institution/framework-search.tsx`, `src/components/institution/search-result-item.tsx` |
| Tests | apps/server | `src/services/framework/__tests__/framework-search.service.test.ts` |

## Database Schema

No Supabase changes. Neo4j full-text index creation:

```cypher
CREATE FULLTEXT INDEX frameworkSearch IF NOT EXISTS
FOR (n:USMLE_System|USMLE_Discipline|USMLE_Topic|LCMEStandard|Competency|EPA|UMEOutcome|BloomLevel)
ON EACH [n.name, n.description]
```

### Neo4j Query Pattern
```cypher
CALL db.index.fulltext.queryNodes('frameworkSearch', $query) YIELD node, score
RETURN node.name, node.framework, node.level, node.parent_path, labels(node), score
ORDER BY score DESC
LIMIT 20
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/institution/frameworks/search` | InstitutionalAdmin+ | Search framework nodes by keyword |

## Dependencies
- **Blocked by:** STORY-IA-6 (Framework List Page must exist)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (5)
- Search endpoint: returns matching nodes with correct fields
- Empty query: returns empty results (not an error)
- No results: returns empty array with message
- Cross-framework results: results include nodes from multiple frameworks
- Auth enforcement: 403 for non-admin roles

## Implementation Notes
- Neo4j full-text index must be created before search works. Include in migration/seed step.
- Debounced search prevents excessive Neo4j queries during typing.
- Parent path display helps distinguish nodes with similar names across frameworks.
- Result highlighting: use `<mark>` tag around matching substring for bold display.
- Minimum 2 characters prevents overly broad queries.
- Service uses `readonly #neo4jRepository` with constructor DI.
- PostgREST `.or()` filter escaping rules do NOT apply here -- this is pure Neo4j full-text search.
