# STORY-F-65: Blueprint Definition Model

**Epic:** E-26 (Blueprint & Assembly Engine)
**Feature:** F-12
**Sprint:** 29
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-26-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to define an exam blueprint with target distributions across USMLE systems, disciplines, and Bloom's taxonomy levels so that I can ensure my exam covers the curriculum proportionally.

## Acceptance Criteria
- [ ] Blueprint model with target percentages per dimension: USMLE system, discipline, Bloom level
- [ ] Percentages per dimension must sum to 100% (Zod validation)
- [ ] Blueprint metadata: name, description, total question count, time limit, passing score
- [ ] CRUD operations for blueprints (create, read, update, soft-delete)
- [ ] Blueprint versioning: immutable once an exam is built from it (lock via `locked_at` timestamp)
- [ ] Repository layer with Supabase storage + Neo4j dual-write via DualWriteService
- [ ] Neo4j: (Blueprint)-[:TARGETS]->(USMLE_System) with `weight` property
- [ ] Seed data: default USMLE Step 1 blueprint with standard distributions
- [ ] Validation: at least one target per dimension required
- [ ] Soft delete with `archived_at` timestamp and audit trail
- [ ] Custom error class: `BlueprintNotFoundError`, `BlueprintLockedError`, `BlueprintValidationError`
- [ ] 10-14 API tests: CRUD, validation (sum != 100), lock enforcement, dual-write sync, soft delete

## Reference Screens
No UI screens. Backend model and API only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/blueprint.types.ts` |
| Model | apps/server | `src/models/exam/blueprint.model.ts` |
| Repository | apps/server | `src/repositories/exam/blueprint.repository.ts` |
| Service | apps/server | `src/services/exam/blueprint.service.ts` |
| Controller | apps/server | `src/controllers/exam/blueprint.controller.ts` |
| Routes | apps/server | `src/routes/exam/blueprint.routes.ts` |
| Errors | apps/server | `src/errors/exam.errors.ts` |
| Seed | apps/server | `src/seeds/default-blueprint.seed.ts` |
| Tests | apps/server | `src/services/exam/__tests__/blueprint.service.test.ts`, `src/repositories/exam/__tests__/blueprint.repository.test.ts` |

## Database Schema
```sql
CREATE TABLE blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  description text DEFAULT '',
  total_questions integer NOT NULL CHECK (total_questions > 0),
  time_limit_minutes integer,
  passing_score numeric CHECK (passing_score >= 0 AND passing_score <= 100),
  system_targets jsonb NOT NULL DEFAULT '[]',
  discipline_targets jsonb NOT NULL DEFAULT '[]',
  bloom_targets jsonb NOT NULL DEFAULT '[]',
  difficulty_targets jsonb NOT NULL DEFAULT '{"easy": 30, "medium": 50, "hard": 20}',
  locked_at timestamptz,
  locked_by uuid REFERENCES profiles(id),
  archived_at timestamptz,
  sync_status text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'failed')),
  graph_node_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exams ADD COLUMN blueprint_id uuid REFERENCES blueprints(id);
```

Neo4j schema:
- `(Blueprint {id, name, total_questions})`
- `(Blueprint)-[:TARGETS {weight: float}]->(USMLE_System)`
- `(Blueprint)-[:USED_BY]->(Exam)`

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/blueprints` | Create blueprint |
| GET | `/api/blueprints` | List blueprints (course-scoped) |
| GET | `/api/blueprints/:id` | Get blueprint detail |
| PUT | `/api/blueprints/:id` | Update blueprint (fails if locked) |
| DELETE | `/api/blueprints/:id` | Soft-delete blueprint |
| POST | `/api/blueprints/:id/lock` | Lock blueprint (immutable) |

## Dependencies
- **Blocks:** STORY-F-70 (recommendation engine), STORY-F-71 (exam builder), STORY-F-72 (gap flagging)
- **Blocked by:** Item bank must exist (STORY-F-64)
- **Cross-lane:** none

## Testing Requirements
- 10-14 API tests: create valid blueprint, create with invalid sum (!=100), update unlocked, update locked (expect `BlueprintLockedError`), get by ID, list by course, soft-delete, lock, dual-write sync status, seed data insertion, validation of at least one target per dimension, passing score bounds
- 0 E2E tests

## Implementation Notes
- DualWriteService pattern: Supabase `blueprints` table first, then Neo4j Blueprint node with TARGETS relationships.
- USMLE systems use SCREAMING_SNAKE_CASE labels in Neo4j (e.g., `USMLE_Cardiovascular`).
- Bloom levels: Remember, Understand, Apply, Analyze, Evaluate, Create.
- `system_targets` JSON structure: `[{ "system": "Cardiovascular", "percentage": 25 }, ...]`
- `bloom_targets` JSON structure: `[{ "level": "Apply", "percentage": 40 }, ...]`
- Blueprint is the foundation for the entire exam assembly pipeline.
- Use `#private` fields in the Blueprint model class (JS private, not TS `private`).
- Lock enforcement: any PUT to a locked blueprint returns 409 Conflict with `BlueprintLockedError`.
- Add `blueprint_id` FK column to existing `exams` table via migration.
