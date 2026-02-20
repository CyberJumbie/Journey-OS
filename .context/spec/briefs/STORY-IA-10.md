# STORY-IA-10: Framework Linking Service

**Epic:** E-15 (Objective Mapping & Framework Linking)
**Feature:** F-07 (Learning Objective Management)
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-15-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to link ILOs and SLOs to accreditation framework nodes so that curriculum alignment to external standards (Bloom, competencies, LCME, EPA, UME) is tracked.

## Acceptance Criteria
- [ ] Five relationship types supported: AT_BLOOM, MAPS_TO_COMPETENCY, ADDRESSES_LCME, MAPS_TO_EPA, MAPS_TO_UME
- [ ] FrameworkLinkingService creates typed relationships between objectives and framework nodes
- [ ] Framework node types: BloomLevel, Competency, LCMEStandard, EPA, UMEOutcome
- [ ] Relationships stored in Neo4j with DualWriteService tracking in Supabase
- [ ] Validation: framework node must exist before linking (seeded in STORY-U-12)
- [ ] CRUD for framework links: create, read, delete (no update; delete and re-create)
- [ ] Dedup: check for existing relationship before creating (no duplicate edges)
- [ ] Custom error class: `FrameworkNodeNotFoundError`

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/objective/framework-link.types.ts` |
| Service | apps/server | `src/services/objective/framework-linking.service.ts` |
| Repository | apps/server | `src/repositories/framework-link.repository.ts` |
| Errors | apps/server | `src/errors/framework.errors.ts` |
| Tests | apps/server | `src/services/objective/__tests__/framework-linking.service.test.ts` |

## Database Schema

### Supabase -- `framework_links` table (tracking)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `source_type` | varchar(10) | NOT NULL, CHECK IN ('ilo', 'slo') |
| `source_id` | uuid | NOT NULL |
| `target_type` | varchar(30) | NOT NULL (BloomLevel, Competency, LCMEStandard, EPA, UMEOutcome) |
| `target_id` | varchar(100) | NOT NULL (Neo4j node reference) |
| `relationship_type` | varchar(30) | NOT NULL, CHECK IN ('AT_BLOOM', 'MAPS_TO_COMPETENCY', 'ADDRESSES_LCME', 'MAPS_TO_EPA', 'MAPS_TO_UME') |
| `created_by` | uuid | NOT NULL, FK -> profiles(id) |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j -- Relationships
```
(ILO)-[:AT_BLOOM]->(BloomLevel)
(SLO)-[:MAPS_TO_COMPETENCY]->(Competency)
(ILO)-[:ADDRESSES_LCME]->(LCMEStandard)
(SLO)-[:MAPS_TO_EPA]->(EPA)
(SLO)-[:MAPS_TO_UME]->(UMEOutcome)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/objectives/:id/framework-links` | InstitutionalAdmin+ | Create framework link |
| GET | `/api/v1/objectives/:id/framework-links` | InstitutionalAdmin+ | List framework links for an objective |
| DELETE | `/api/v1/objectives/:id/framework-links/:linkId` | InstitutionalAdmin+ | Remove framework link |

## Dependencies
- **Blocked by:** STORY-U-12 (framework nodes must be seeded), STORY-IA-4 (ILOs must exist), STORY-IA-2 (SLOs must exist)
- **Blocks:** None (downstream LCME compliance features in future sprints)
- **Cross-lane:** STORY-U-12 (universal lane -- framework seeding provides target nodes)

## Testing Requirements
### API Tests (10-12)
- Create: each of the 5 relationship types creates correctly
- Validation: linking to non-existent framework node throws FrameworkNodeNotFoundError
- Dedup: creating duplicate link returns error or idempotent success
- Read: list all framework links for an ILO, list all for an SLO
- Delete: removes relationship from both Neo4j and Supabase tracking
- Dual-write: Supabase record and Neo4j relationship both created, sync_status tracked
- Auth enforcement: 403 for non-admin roles
- Invalid source type: rejected with validation error

## Implementation Notes
- Framework nodes are seeded (read-only for users); only relationships are user-created.
- No update operation -- delete and re-create if change needed.
- Dedup check: query Neo4j for existing relationship before creating.
- Service uses `readonly #neo4jRepository` and `readonly #supabaseClient` with constructor DI.
- Express `req.params.id` is `string | string[]` -- narrow with `typeof === "string"`.
- Before writing migration DDL, verify table names via Supabase MCP `list_tables`.
