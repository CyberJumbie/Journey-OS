# STORY-F-1: Course Model & Repository

**Epic:** E-08 (Course CRUD & Hierarchy)
**Feature:** F-04
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-08-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need course CRUD operations with dual-write to Supabase and Neo4j so that course data stays consistent across both datastores.

## Acceptance Criteria
- [ ] Course TypeScript types defined with strict typing (id, title, code, description, credits, academic_year, status, institution_id, program_id, course_director_id)
- [ ] Course model class with private `#fields`, public getters, constructor DI
- [ ] CourseRepository with create, read, update, soft-delete operations
- [ ] DualWriteService integration: Supabase first, Neo4j second, sync_status tracked
- [ ] CourseService with business logic validation (unique course code per institution, credit range validation)
- [ ] Course Director assignment via relationship update
- [ ] Custom error classes: `CourseNotFoundError`, `DuplicateCourseCodeError`, `CourseValidationError`
- [ ] 10-12 API tests covering CRUD, validation errors, dual-write consistency, and CD assignment
- [ ] Named exports only, TypeScript strict

## Reference Screens
> **None** -- backend-only story. Course views are built in STORY-F-13 and STORY-F-20.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/course/course.types.ts` |
| Model | apps/server | `src/models/course.model.ts` |
| Repository | apps/server | `src/repositories/course.repository.ts` |
| Service | apps/server | `src/services/course/course.service.ts` |
| Errors | apps/server | `src/errors/course.errors.ts` |
| Tests | apps/server | `src/services/course/__tests__/course.service.test.ts`, `src/repositories/__tests__/course.repository.test.ts` |

## Database Schema

### Supabase -- `courses` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `title` | varchar(255) | NOT NULL |
| `code` | varchar(50) | NOT NULL |
| `description` | text | NULL |
| `credits` | integer | NOT NULL, CHECK (credits >= 1 AND credits <= 12) |
| `academic_year` | varchar(20) | NOT NULL |
| `status` | varchar(20) | NOT NULL, DEFAULT 'draft', CHECK IN ('draft', 'active', 'archived') |
| `program_id` | uuid | NOT NULL, FK -> programs |
| `course_director_id` | uuid | NULL, FK -> auth.users |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

UNIQUE constraint on (program_id, code, academic_year).

### Neo4j -- Course node
```
(Course {
  id: uuid,
  title: string,
  code: string,
  status: string,
  academic_year: string
})

Relationships:
  (Program)-[:OFFERS]->(Course)
  (User)-[:DIRECTS]->(Course)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/courses` | Faculty+ | Create course |
| GET | `/api/v1/courses/:id` | Faculty+ | Get course by ID |
| PATCH | `/api/v1/courses/:id` | Faculty+ (owner/CD) | Update course |
| DELETE | `/api/v1/courses/:id` | Faculty+ (owner/CD) | Soft-delete (archive) course |
| PATCH | `/api/v1/courses/:id/director` | Admin+ | Assign Course Director |

## Dependencies
- **Blocks:** STORY-F-11 (Course Hierarchy), STORY-F-13 (Course Views), STORY-F-20 (Course Wizard), STORY-F-9 (Upload Dropzone), STORY-F-12 (Course Cards)
- **Blocked by:** STORY-U-3 (RBAC middleware)
- **Cross-lane:** STORY-U-3 (Sprint 3 auth)

## Testing Requirements
### API Tests (10-12)
1. Create course with valid data returns 201
2. Create course with duplicate code in same program returns 409
3. Create course with invalid credits (<1 or >12) returns 422
4. Read course by ID returns full course data
5. Read non-existent course returns 404
6. Update course title succeeds
7. Soft-delete sets status to 'archived'
8. DualWriteService creates both Supabase record and Neo4j node
9. DualWriteService sets sync_status to 'synced' on success
10. Assign Course Director updates relationship
11. Unique code constraint scoped to program_id + academic_year
12. Course model private fields not accessible via bracket notation

## Implementation Notes
- Neo4j label: `Course` (PascalCase per convention).
- Relationship: `(Institution)-[:HAS_PROGRAM]->(Program)-[:OFFERS]->(Course)`.
- Course Director is a user with `course_director` role assigned via `(User)-[:DIRECTS]->(Course)`.
- Soft-delete: set status to `archived`, never hard-delete.
- DualWriteService pattern: write to Supabase, get ID, write to Neo4j with same ID, update sync_status.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names. Story briefs may reference outdated names.
- Use `.select().single()` on ALL Supabase write operations to verify exactly 1 row was affected.
- `courses` has no direct `institution_id` -- must join through `programs.institution_id`.
