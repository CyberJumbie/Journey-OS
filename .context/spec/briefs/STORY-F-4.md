# STORY-F-4: Template Model & CRUD

**Epic:** E-39 (Templates & Help)
**Feature:** F-18
**Sprint:** 16
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-39-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to create, edit, delete, and share generation templates so that I can save and reuse my preferred question generation configurations.

## Acceptance Criteria
- [ ] Template model: name, description, question_type, difficulty_distribution, bloom_levels, scope_config, prompt_overrides, metadata
- [ ] CRUD operations: create, read, update, delete with ownership checks
- [ ] Sharing: templates can be `private`, `shared_course`, `shared_institution`, `public`
- [ ] Duplicate template: copy an existing template as starting point
- [ ] Template versioning: edit creates new version, previous versions accessible
- [ ] DualWriteService: Supabase `templates` table + Neo4j `Template` node
- [ ] Ownership: creator is owner; shared templates are read-only to non-owners
- [ ] Custom error classes: `TemplateNotFoundError`, `TemplatePermissionError`
- [ ] 10-14 API tests: CRUD operations, sharing levels, ownership checks, versioning, dual-write
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Template Management Page is built in STORY-F-14.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/template/template.types.ts` |
| Model | apps/server | `src/models/template.model.ts` |
| Repository | apps/server | `src/repositories/template.repository.ts` |
| Service | apps/server | `src/services/template/template.service.ts` |
| Controller | apps/server | `src/controllers/template/template.controller.ts` |
| Errors | apps/server | `src/errors/template.errors.ts` |
| Tests | apps/server | `src/services/template/__tests__/template.service.test.ts`, `src/controllers/template/__tests__/template.controller.test.ts` |

## Database Schema

### Supabase -- `templates` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `name` | varchar(255) | NOT NULL |
| `description` | text | NULL |
| `question_type` | varchar(50) | NOT NULL |
| `difficulty_distribution` | jsonb | NOT NULL |
| `bloom_levels` | jsonb | NOT NULL |
| `scope_config` | jsonb | NULL |
| `prompt_overrides` | jsonb | NULL |
| `metadata` | jsonb | NULL |
| `sharing_level` | varchar(30) | NOT NULL, DEFAULT 'private', CHECK IN ('private', 'shared_course', 'shared_institution', 'public') |
| `version` | integer | NOT NULL, DEFAULT 1 |
| `owner_id` | uuid | NOT NULL, FK -> auth.users |
| `course_id` | uuid | NULL, FK -> courses |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Neo4j -- Template node
```
(Template {
  id: uuid,
  name: string,
  question_type: string,
  sharing_level: string,
  version: integer
})

Relationships:
  (User)-[:OWNS]->(Template)
  (Template)-[:FOR_COURSE]->(Course)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/templates` | Faculty+ | Create template |
| GET | `/api/v1/templates` | Faculty+ | List templates (filtered by sharing + ownership) |
| GET | `/api/v1/templates/:id` | Faculty+ | Get template by ID |
| PATCH | `/api/v1/templates/:id` | Owner only | Update template (creates new version) |
| DELETE | `/api/v1/templates/:id` | Owner only | Delete template |
| POST | `/api/v1/templates/:id/duplicate` | Faculty+ | Duplicate template |

## Dependencies
- **Blocks:** STORY-F-14 (Template Management Page)
- **Blocked by:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (10-14)
1. Create template with valid data returns 201
2. Read template by ID returns full template data
3. Update template increments version number
4. Delete template by owner succeeds
5. Delete template by non-owner returns 403
6. List templates returns only visible templates (own + shared at appropriate level)
7. Duplicate template creates copy with new ID and owner
8. Sharing level restricts visibility: private only to owner
9. Sharing level: shared_course visible to course members
10. Sharing level: shared_institution visible to institution members
11. DualWriteService creates both Supabase record and Neo4j node
12. Ownership check blocks edit by non-owner
13. Template model private fields not accessible via bracket notation

## Implementation Notes
- Template config mirrors batch config shape (E-20) for seamless integration.
- Neo4j relationships: `(User)-[:OWNS]->(Template)`, `(Template)-[:FOR_COURSE]->(Course)`.
- Sharing levels use RBAC: `shared_course` checks course membership, `shared_institution` checks institution membership.
- Version history stored as separate `template_versions` table or JSONB array -- decide at implementation.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
- Use `.select().single()` on ALL Supabase write operations.
- Existing types in `packages/types/src/template/` -- read them first and reuse.
