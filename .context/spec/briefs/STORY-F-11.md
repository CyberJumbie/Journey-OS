# STORY-F-11: Course Hierarchy

**Epic:** E-08 (Course CRUD & Hierarchy)
**Feature:** F-04
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-08-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need courses organized in a hierarchy (Institution > Program > Course > Section > Session) so that curriculum structure is navigable and well-organized.

## Acceptance Criteria
- [ ] Program, Section, and Session TypeScript types defined
- [ ] Program model with institution_id scope
- [ ] Section model with course_id scope and ordering (`position` integer field)
- [ ] Session model with section_id scope, week number, and scheduling fields
- [ ] Repository layer for Program, Section, Session with CRUD operations
- [ ] Service layer enforcing hierarchy constraints (section belongs to course, session belongs to section)
- [ ] Neo4j relationships: `(Program)-[:OFFERS]->(Course)-[:HAS_SECTION]->(Section)-[:HAS_SESSION]->(Session)`
- [ ] DualWriteService for all three entity types
- [ ] Cascading read: fetching a course returns its sections and sessions in a nested structure
- [ ] 10-12 API tests covering hierarchy CRUD, constraint validation, cascading reads
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Course views with hierarchy tree are built in STORY-F-13.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/course/hierarchy.types.ts` |
| Model | apps/server | `src/models/program.model.ts`, `src/models/section.model.ts`, `src/models/session.model.ts` |
| Repository | apps/server | `src/repositories/program.repository.ts`, `src/repositories/section.repository.ts`, `src/repositories/session.repository.ts` |
| Service | apps/server | `src/services/course/hierarchy.service.ts` |
| Tests | apps/server | `src/services/course/__tests__/hierarchy.service.test.ts` |

## Database Schema

### Supabase -- `programs` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `name` | varchar(255) | NOT NULL |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Supabase -- `sections` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `title` | varchar(255) | NOT NULL |
| `course_id` | uuid | NOT NULL, FK -> courses |
| `position` | integer | NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Supabase -- `sessions` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `title` | varchar(255) | NOT NULL |
| `section_id` | uuid | NOT NULL, FK -> sections |
| `week_number` | integer | NULL |
| `day_of_week` | varchar(10) | NULL |
| `start_time` | time | NULL |
| `end_time` | time | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Neo4j
```
(Program)-[:OFFERS]->(Course)-[:HAS_SECTION]->(Section)-[:HAS_SESSION]->(Session)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/courses/:id/hierarchy` | Faculty+ | Get full hierarchy tree for a course |
| POST | `/api/v1/courses/:id/sections` | Faculty+ | Create section in course |
| PATCH | `/api/v1/sections/:id` | Faculty+ | Update section |
| DELETE | `/api/v1/sections/:id` | Faculty+ | Delete section |
| POST | `/api/v1/sections/:id/sessions` | Faculty+ | Create session in section |
| PATCH | `/api/v1/sessions/:id` | Faculty+ | Update session |
| DELETE | `/api/v1/sessions/:id` | Faculty+ | Delete session |
| PATCH | `/api/v1/courses/:id/sections/reorder` | Faculty+ | Reorder sections |

## Dependencies
- **Blocks:** STORY-F-20 (Course Creation Wizard needs section/session builder)
- **Blocked by:** STORY-F-1 (course model must exist)
- **Cross-lane:** None

## Testing Requirements
### API Tests (10-12)
1. Create section under course succeeds
2. Create section with invalid course_id returns 404
3. Create session under section succeeds
4. Session inherits section's course scope
5. Reorder sections updates position values
6. Cascading read returns nested hierarchy (sections with sessions)
7. DualWriteService creates Neo4j nodes with relationships
8. Delete section cascades to sessions
9. Hierarchy constraint: cannot move section to different course
10. Section position is unique per course
11. Neo4j traversal returns full hierarchy subtree
12. Session scheduling fields are optional

## Implementation Notes
- Section ordering uses a `position` integer field for drag-and-drop reordering. See `docs/solutions/hierarchy-crud-reorder-pattern.md`.
- Sessions contain `week_number`, `day_of_week`, `start_time`, `end_time` for scheduling.
- Cascading read: fetching a course returns its sections and sessions in a nested structure.
- Neo4j traversal: use single query to fetch full hierarchy subtree for a course.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
- Use `.select().single()` on ALL Supabase write operations.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"` before passing to typed functions.
