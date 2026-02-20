# STORY-IA-4: ILO Model & Repository

**Epic:** E-14 (ILO & SLO CRUD)
**Feature:** F-07 (Learning Objective Management)
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-14-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need ILO CRUD operations with dual-write so that institutional learning objectives are managed and available across both datastores.

## Acceptance Criteria
- [ ] ILO TypeScript types: id, institution_id, code, title, description, bloom_level, status, created_by, created_at, updated_at
- [ ] ILO model class with private `#fields`, public getters, constructor DI
- [ ] ILORepository with create, read, update, soft-delete operations
- [ ] Institution-scoped: all queries filter by `institution_id` (no cross-institution access)
- [ ] DualWriteService: Supabase first, Neo4j second, `sync_status` tracked
- [ ] ILO code uniqueness enforced within institution scope
- [ ] Bloom's taxonomy level validation (Remember, Understand, Apply, Analyze, Evaluate, Create)
- [ ] ILOService with business logic: validation, scope enforcement
- [ ] `.select().single()` on ALL Supabase write operations

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/objective/ilo.types.ts` |
| Model | apps/server | `src/models/ilo.model.ts` |
| Repository | apps/server | `src/repositories/ilo.repository.ts` |
| Service | apps/server | `src/services/objective/ilo.service.ts` |
| Tests | apps/server | `src/services/objective/__tests__/ilo.service.test.ts`, `src/repositories/__tests__/ilo.repository.test.ts` |

## Database Schema

### Supabase -- `ilos` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions(id) |
| `code` | varchar(50) | NOT NULL, UNIQUE within institution_id |
| `title` | varchar(255) | NOT NULL |
| `description` | text | NULL |
| `bloom_level` | varchar(20) | NOT NULL, CHECK IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create') |
| `status` | varchar(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active', 'archived') |
| `created_by` | uuid | NOT NULL, FK -> profiles(id) |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

```sql
CREATE UNIQUE INDEX idx_ilos_institution_code ON ilos(institution_id, code) WHERE status = 'active';
```

### Neo4j -- ILO node
```
(ILO {
  id: uuid,
  institution_id: uuid,
  code: string,
  title: string,
  bloom_level: string,
  status: string
})

(Institution)-[:DEFINES]->(ILO)
```

## API Endpoints
No new API endpoints in this story. Service and repository layer only.

## Dependencies
- **Blocked by:** STORY-SA-5 (institution must exist)
- **Blocks:** STORY-IA-10 (Framework Linking Service), STORY-IA-14 (FULFILLS Workflow), STORY-IA-22 (SLO-to-ILO Linking)
- **Cross-lane:** STORY-U-6 (RBAC: institutional_admin role)

## Testing Requirements
### API Tests (10-12)
- CRUD: create ILO, read by ID, read by institution_id, update title/description, soft-delete sets status='archived'
- Scope isolation: ILO from institution A not accessible via institution B query
- Code uniqueness: duplicate code within same institution rejected, same code across institutions allowed
- Bloom validation: invalid bloom level rejected, all 6 valid levels accepted
- Dual-write: Supabase record and Neo4j node both created, sync_status set to 'synced'
- Archived ILO: excluded from default queries, cannot be target of new FULFILLS relationships

## Implementation Notes
- Neo4j label: `ILO` (acronym, already PascalCase-compatible).
- ILO and SLO are SEPARATE node types per architecture rules -- never combine into generic "Objective".
- Bloom level stored as enum, not free text.
- Soft-delete sets status to 'archived'; archived ILOs cannot be targets of new FULFILLS relationships.
- Before writing migration DDL, verify table names via Supabase MCP `list_tables`.
- Use `updateSyncStatus()` method in repository for sync_status updates.
- Service uses `readonly #supabaseClient` and `readonly #neo4jRepository` with constructor DI.
