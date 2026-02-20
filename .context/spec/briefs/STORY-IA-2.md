# STORY-IA-2: SLO Model & Repository

**Epic:** E-14 (ILO & SLO CRUD)
**Feature:** F-07 (Learning Objective Management)
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-14-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need SLO CRUD operations with dual-write so that course-level learning objectives are managed separately from ILOs and available for curriculum mapping.

## Acceptance Criteria
- [ ] SLO TypeScript types: id, course_id, code, title, description, bloom_level, status, created_by, created_at, updated_at
- [ ] SLO model class with private `#fields`, public getters, constructor DI
- [ ] SLORepository with create, read, update, soft-delete operations
- [ ] Course-scoped: all queries filter by `course_id`
- [ ] DualWriteService: Supabase first, Neo4j second, `sync_status` tracked
- [ ] SLO code uniqueness enforced within course scope
- [ ] Bloom's taxonomy level validation (Remember, Understand, Apply, Analyze, Evaluate, Create)
- [ ] SLOService with business logic: validation, scope enforcement
- [ ] `.select().single()` on ALL Supabase write operations to verify exactly 1 row affected

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/objective/slo.types.ts` |
| Model | apps/server | `src/models/slo.model.ts` |
| Repository | apps/server | `src/repositories/slo.repository.ts` |
| Service | apps/server | `src/services/objective/slo.service.ts` |
| Tests | apps/server | `src/services/objective/__tests__/slo.service.test.ts`, `src/repositories/__tests__/slo.repository.test.ts` |

## Database Schema

### Supabase -- `slos` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `course_id` | uuid | NOT NULL, FK -> courses(id) |
| `code` | varchar(50) | NOT NULL, UNIQUE within course_id |
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
CREATE UNIQUE INDEX idx_slos_course_code ON slos(course_id, code) WHERE status = 'active';
```

### Neo4j -- SLO node
```
(SLO {
  id: uuid,
  course_id: uuid,
  code: string,
  title: string,
  bloom_level: string,
  status: string
})

(Course)-[:HAS_SLO]->(SLO)
```

## API Endpoints
No new API endpoints in this story. Service and repository layer only -- controller/routes added in a later story.

## Dependencies
- **Blocked by:** STORY-F-1 (courses must exist -- E-08 course CRUD)
- **Blocks:** STORY-IA-22 (SLO-to-ILO Linking), STORY-IA-14 (FULFILLS Workflow)
- **Cross-lane:** E-08 (course CRUD provides course_id FK)

## Testing Requirements
### API Tests (10-12)
- CRUD: create SLO, read by ID, read by course_id, update title/description, soft-delete sets status='archived'
- Scope isolation: SLO from course A not accessible via course B query
- Code uniqueness: duplicate code within same course rejected, same code across courses allowed
- Bloom validation: invalid bloom level rejected, all 6 valid levels accepted
- Dual-write: Supabase record and Neo4j node both created, sync_status set to 'synced'
- Archived SLO: excluded from default queries, cannot be re-proposed for FULFILLS

## Implementation Notes
- Neo4j label: `SLO` (acronym, already PascalCase-compatible).
- ILO and SLO are SEPARATE node types per architecture rules -- never combine into generic "Objective".
- Bloom level uses same enum as ILO for consistency.
- Soft-delete: archived SLOs cannot be proposed for new FULFILLS relationships.
- SLOs are created by Course Directors or Faculty, but Institutional Admins also have CRUD access.
- Before writing migration DDL, verify table names via Supabase MCP `list_tables`.
- Use `updateSyncStatus()` method in repository for sync_status updates -- do not bypass type safety with `as unknown as`.
