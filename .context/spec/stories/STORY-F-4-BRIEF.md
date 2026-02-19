# STORY-F-4 Brief: Template Model & CRUD

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-4
old_id: S-F-39-1
epic: E-39 (Templates & Help)
feature: F-18
sprint: 16
lane: faculty
lane_priority: 3
within_lane_order: 4
size: M
depends_on: []
blocks:
  - STORY-F-14 (faculty) — Template Management Page
  - STORY-F-49 (faculty) — Template Picker in Workbench
personas_served: [faculty]
```

---

## Section 1: Summary

Faculty members need to save, reuse, and share their preferred question generation configurations as templates. This story delivers the full backend stack for generation templates: TypeScript types, domain model, repository with dual-write (Supabase + Neo4j), service layer with ownership/sharing/versioning logic, REST controller with six endpoints, and custom error classes. No frontend -- that comes in STORY-F-14. Templates mirror the batch generation config shape (E-20) so they integrate seamlessly with the generation workbench.

**User Story:** As a Faculty member, I need to create, edit, delete, and share generation templates so that I can save and reuse my preferred question generation configurations.

---

## Section 2: Task Breakdown

Implementation order follows the mandated sequence: Types -> Model -> Repository -> Service -> Controller -> Tests.

### Task 1: TypeScript Types
**File:** `packages/types/src/template/template.types.ts`
- Define `TemplateSharingLevel` enum: `private`, `shared_course`, `shared_institution`, `public`
- Define `Template` interface with all fields
- Define `TemplateVersion` interface
- Define `TemplateCreateInput`, `TemplateUpdateInput`, `TemplateDuplicateInput` DTOs
- Define `TemplateListQuery` for filtering/pagination

### Task 2: Barrel Export
**File:** `packages/types/src/template/index.ts`
- Re-export all types from `template.types.ts`

### Task 3: Custom Error Classes
**File:** `apps/server/src/errors/template.errors.ts`
- `TemplateNotFoundError` extends `JourneyOSError`
- `TemplatePermissionError` extends `JourneyOSError`
- `TemplateVersionNotFoundError` extends `JourneyOSError`

### Task 4: Domain Model
**File:** `apps/server/src/models/template.model.ts`
- `Template` class with private fields, public getters
- Constructor accepts `TemplateCreateInput` or hydration params
- Methods: `update()`, `duplicate()`, `canBeAccessedBy()`, `canBeEditedBy()`, `toDTO()`, `toNeo4jProperties()`
- State validation on mutations
- Version creation on update

### Task 5: Repository
**File:** `apps/server/src/repositories/template.repository.ts`
- `TemplateRepository` class with constructor DI for Supabase client + Neo4j driver
- Methods: `create()`, `findById()`, `findByOwner()`, `findAccessible()`, `update()`, `delete()`, `createVersion()`, `findVersions()`, `findVersionById()`
- All mutations follow DualWrite pattern: Supabase first -> Neo4j second -> sync_status = 'synced'

### Task 6: Service
**File:** `apps/server/src/services/template/template.service.ts`
- `TemplateService` class with constructor DI for `TemplateRepository`
- Methods: `create()`, `getById()`, `list()`, `update()`, `delete()`, `duplicate()`, `getVersions()`, `getVersion()`
- Ownership checks on all mutations
- Sharing-level access checks on reads
- Versioning logic: update creates new version snapshot before applying changes

### Task 7: Controller
**File:** `apps/server/src/controllers/template/template.controller.ts`
- `TemplateController` class with constructor DI for `TemplateService`
- Six route handlers mapped to REST endpoints
- Input validation via Zod schemas
- Error mapping to HTTP status codes

### Task 8: Route Registration
**File:** `apps/server/src/api/templates.routes.ts`
- Wire controller methods to Express router
- Apply `authMiddleware('faculty')` to all routes

### Task 9: Service Tests
**File:** `apps/server/src/tests/template/template.service.test.ts`
- 7-8 tests covering business logic, ownership, sharing, versioning, duplication

### Task 10: Controller Tests
**File:** `apps/server/src/tests/template/template.controller.test.ts`
- 5-6 tests covering HTTP contracts, auth, error responses, pagination

---

## Section 3: Data Model (TypeScript Interfaces)

```typescript
// packages/types/src/template/template.types.ts

/** Sharing levels control who can read a template */
export const TEMPLATE_SHARING_LEVELS = [
  'private',
  'shared_course',
  'shared_institution',
  'public',
] as const;

export type TemplateSharingLevel = typeof TEMPLATE_SHARING_LEVELS[number];

/** Question types supported by the generation pipeline */
export const TEMPLATE_QUESTION_TYPES = [
  'single_best_answer',
  'extended_matching',
  'sequential_item_set',
] as const;

export type TemplateQuestionType = typeof TEMPLATE_QUESTION_TYPES[number];

/**
 * Difficulty distribution across Bloom levels.
 * Keys are Bloom levels (1-6), values are percentage weights (must sum to 1.0).
 */
export interface DifficultyDistribution {
  readonly easy: number;    // 0.0-1.0  (Bloom 1-2)
  readonly medium: number;  // 0.0-1.0  (Bloom 3-4)
  readonly hard: number;    // 0.0-1.0  (Bloom 5-6)
}

/**
 * Bloom level targeting configuration.
 * Array of Bloom levels (1-6) to include in generation.
 */
export type BloomLevelConfig = readonly number[];

/**
 * Scope configuration: which content to draw from.
 */
export interface TemplateScopeConfig {
  readonly course_id?: string;
  readonly session_ids?: readonly string[];
  readonly subconcept_ids?: readonly string[];
  readonly usmle_systems?: readonly string[];
  readonly usmle_disciplines?: readonly string[];
}

/**
 * Prompt overrides allow faculty to customize generation behavior.
 */
export interface TemplatePromptOverrides {
  readonly vignette_instructions?: string;
  readonly stem_instructions?: string;
  readonly distractor_instructions?: string;
  readonly clinical_setting?: string;
  readonly patient_demographics?: string;
}

/**
 * Template metadata for categorization and search.
 */
export interface TemplateMetadata {
  readonly category?: string;       // e.g., "midterm", "board_prep", "formative"
  readonly tags?: readonly string[];
  readonly notes?: string;
}

/**
 * Core Template entity.
 */
export interface Template {
  readonly id: string;
  readonly institution_id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly description: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config: TemplateScopeConfig;
  readonly prompt_overrides: TemplatePromptOverrides;
  readonly metadata: TemplateMetadata;
  readonly sharing_level: TemplateSharingLevel;
  readonly current_version: number;
  readonly graph_node_id: string | null;
  readonly sync_status: 'pending' | 'synced' | 'failed';
  readonly created_at: string;  // ISO 8601
  readonly updated_at: string;  // ISO 8601
}

/**
 * Immutable snapshot of a template at a point in time.
 */
export interface TemplateVersion {
  readonly id: string;
  readonly template_id: string;
  readonly version_number: number;
  readonly name: string;
  readonly description: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config: TemplateScopeConfig;
  readonly prompt_overrides: TemplatePromptOverrides;
  readonly metadata: TemplateMetadata;
  readonly sharing_level: TemplateSharingLevel;
  readonly created_by: string;
  readonly created_at: string;  // ISO 8601
}

/**
 * Input for creating a new template.
 */
export interface TemplateCreateInput {
  readonly name: string;
  readonly description?: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config?: TemplateScopeConfig;
  readonly prompt_overrides?: TemplatePromptOverrides;
  readonly metadata?: TemplateMetadata;
  readonly sharing_level?: TemplateSharingLevel;  // defaults to 'private'
}

/**
 * Input for updating an existing template. All fields optional (partial update).
 */
export interface TemplateUpdateInput {
  readonly name?: string;
  readonly description?: string;
  readonly question_type?: TemplateQuestionType;
  readonly difficulty_distribution?: DifficultyDistribution;
  readonly bloom_levels?: BloomLevelConfig;
  readonly scope_config?: TemplateScopeConfig;
  readonly prompt_overrides?: TemplatePromptOverrides;
  readonly metadata?: TemplateMetadata;
  readonly sharing_level?: TemplateSharingLevel;
}

/**
 * Input for duplicating a template.
 */
export interface TemplateDuplicateInput {
  readonly new_name?: string;  // defaults to "{original_name} (Copy)"
}

/**
 * Query parameters for listing templates.
 */
export interface TemplateListQuery {
  readonly page?: number;      // default 1
  readonly limit?: number;     // default 20
  readonly sharing_level?: TemplateSharingLevel;
  readonly question_type?: TemplateQuestionType;
  readonly course_id?: string;
  readonly search?: string;    // name/description search
  readonly owner_only?: boolean;
}

/**
 * Paginated response wrapper.
 */
export interface TemplateListResponse {
  readonly data: readonly Template[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

---

## Section 4: Database Schema

### 4.1 Supabase DDL

```sql
-- ═══ TEMPLATES ═══

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    question_type TEXT NOT NULL DEFAULT 'single_best_answer'
        CHECK (question_type IN ('single_best_answer', 'extended_matching', 'sequential_item_set')),
    difficulty_distribution JSONB NOT NULL DEFAULT '{"easy": 0.3, "medium": 0.5, "hard": 0.2}',
    bloom_levels JSONB NOT NULL DEFAULT '[3, 4, 5]',
    scope_config JSONB NOT NULL DEFAULT '{}',
    prompt_overrides JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    sharing_level TEXT NOT NULL DEFAULT 'private'
        CHECK (sharing_level IN ('private', 'shared_course', 'shared_institution', 'public')),
    current_version INTEGER NOT NULL DEFAULT 1,
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_institution ON templates(institution_id);
CREATE INDEX idx_templates_owner ON templates(owner_id);
CREATE INDEX idx_templates_sharing ON templates(sharing_level);
CREATE INDEX idx_templates_sync ON templates(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_templates_question_type ON templates(question_type);

-- ═══ TEMPLATE VERSIONS ═══

CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    question_type TEXT NOT NULL,
    difficulty_distribution JSONB NOT NULL,
    bloom_levels JSONB NOT NULL,
    scope_config JSONB NOT NULL DEFAULT '{}',
    prompt_overrides JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    sharing_level TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_template_versions_unique ON template_versions(template_id, version_number);
CREATE INDEX idx_template_versions_template ON template_versions(template_id);

-- ═══ ROW-LEVEL SECURITY ═══

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Owner sees own templates
CREATE POLICY "Owner sees own templates" ON templates
    FOR SELECT USING (owner_id = auth.uid());

-- Faculty sees shared_institution templates from their institution
CREATE POLICY "Faculty sees institution-shared templates" ON templates
    FOR SELECT USING (
        sharing_level = 'shared_institution'
        AND institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Faculty sees public templates
CREATE POLICY "Faculty sees public templates" ON templates
    FOR SELECT USING (sharing_level = 'public');

-- Owner can insert for own institution
CREATE POLICY "Faculty can create templates" ON templates
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        AND institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Owner can update own templates
CREATE POLICY "Owner can update own templates" ON templates
    FOR UPDATE USING (owner_id = auth.uid());

-- Owner can delete own templates
CREATE POLICY "Owner can delete own templates" ON templates
    FOR DELETE USING (owner_id = auth.uid());

-- SuperAdmin bypasses
CREATE POLICY "SuperAdmin sees all templates" ON templates
    FOR SELECT USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );

ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- Versions inherit parent template access
CREATE POLICY "Users see versions of accessible templates" ON template_versions
    FOR SELECT USING (
        template_id IN (SELECT id FROM templates)
    );
```

### 4.2 Neo4j Schema

```cypher
-- Constraint
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Template) REQUIRE n.id IS UNIQUE;

-- Template node (skinny: <100 bytes per Skinny Node Principle)
-- Properties: id, name, sharing_level, question_type
-- Full config lives in Supabase only.

-- Create Template node example:
CREATE (t:Template {
  id: $id,
  name: $name,
  sharing_level: $sharing_level,
  question_type: $question_type
})

-- Ownership relationship
-- (User)-[:OWNS]->(Template)
MATCH (u:User {id: $owner_id})
MATCH (t:Template {id: $template_id})
CREATE (u)-[:OWNS]->(t)

-- Course scoping relationship (optional, only if scope_config.course_id is set)
-- (Template)-[:FOR_COURSE]->(Course)
MATCH (t:Template {id: $template_id})
MATCH (c:Course {id: $course_id})
CREATE (t)-[:FOR_COURSE]->(c)
```

### 4.3 Dual-Write Sequence

```
1. Supabase INSERT templates row (sync_status: 'pending')
2. Neo4j CREATE (:Template) node with skinny properties
3. Neo4j CREATE (User)-[:OWNS]->(Template) relationship
4. Neo4j CREATE (Template)-[:FOR_COURSE]->(Course) if scope_config.course_id exists
5. Supabase UPDATE templates SET graph_node_id = neo4j_id, sync_status = 'synced'

On Neo4j failure:
  - sync_status stays 'pending'
  - Inngest retry job picks up pending rows every 5 minutes
  - Max 3 retries, then sync_status = 'failed' + admin notification
```

---

## Section 5: API Contract

Base URL: `/api/v1`
Auth: Bearer JWT (Supabase Auth) in `Authorization` header
All responses: `{ data, error, meta }` envelope

### 5.1 POST /api/v1/templates

**Auth:** faculty
**Description:** Create a new generation template.

**Request Body:**
```json
{
  "name": "Board Prep - Cardiovascular",
  "description": "High-difficulty cardiovascular questions for board preparation",
  "question_type": "single_best_answer",
  "difficulty_distribution": { "easy": 0.1, "medium": 0.3, "hard": 0.6 },
  "bloom_levels": [4, 5, 6],
  "scope_config": {
    "course_id": "uuid",
    "usmle_systems": ["Cardiovascular"]
  },
  "prompt_overrides": {
    "clinical_setting": "Emergency department",
    "vignette_instructions": "Focus on acute presentations"
  },
  "metadata": {
    "category": "board_prep",
    "tags": ["cardiovascular", "step1"]
  },
  "sharing_level": "shared_institution"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "institution_id": "uuid",
    "owner_id": "uuid",
    "name": "Board Prep - Cardiovascular",
    "description": "High-difficulty cardiovascular questions for board preparation",
    "question_type": "single_best_answer",
    "difficulty_distribution": { "easy": 0.1, "medium": 0.3, "hard": 0.6 },
    "bloom_levels": [4, 5, 6],
    "scope_config": { "course_id": "uuid", "usmle_systems": ["Cardiovascular"] },
    "prompt_overrides": { "clinical_setting": "Emergency department", "vignette_instructions": "Focus on acute presentations" },
    "metadata": { "category": "board_prep", "tags": ["cardiovascular", "step1"] },
    "sharing_level": "shared_institution",
    "current_version": 1,
    "graph_node_id": null,
    "sync_status": "pending",
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR` — Invalid body (missing name, invalid question_type, bloom_levels out of range, difficulty_distribution not summing to 1.0)
- `401 UNAUTHORIZED` — Missing or invalid JWT
- `403 FORBIDDEN` — Role is not faculty

### 5.2 GET /api/v1/templates

**Auth:** faculty
**Description:** List templates accessible to the current user. Includes own templates + templates shared at the appropriate level.
**Query Params:** `?page=1&limit=20&sharing_level=private&question_type=single_best_answer&course_id=uuid&search=cardio&owner_only=true`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "institution_id": "uuid",
      "owner_id": "uuid",
      "name": "Board Prep - Cardiovascular",
      "description": "...",
      "question_type": "single_best_answer",
      "difficulty_distribution": { "easy": 0.1, "medium": 0.3, "hard": 0.6 },
      "bloom_levels": [4, 5, 6],
      "scope_config": { "course_id": "uuid" },
      "prompt_overrides": {},
      "metadata": { "category": "board_prep" },
      "sharing_level": "shared_institution",
      "current_version": 3,
      "graph_node_id": "neo4j-id",
      "sync_status": "synced",
      "created_at": "2026-02-19T12:00:00Z",
      "updated_at": "2026-02-19T14:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
}
```

### 5.3 GET /api/v1/templates/:id

**Auth:** faculty
**Description:** Get a single template by ID. Enforces sharing-level access.

**Response (200):**
```json
{
  "data": { "...full Template object..." }
}
```

**Error Responses:**
- `404 NOT_FOUND` — Template does not exist
- `403 FORBIDDEN` — User does not have access based on sharing level

### 5.4 PUT /api/v1/templates/:id

**Auth:** faculty (owner only)
**Description:** Update a template. Creates a new version snapshot before applying changes.

**Request Body (partial update):**
```json
{
  "name": "Board Prep - Cardiovascular v2",
  "difficulty_distribution": { "easy": 0.0, "medium": 0.4, "hard": 0.6 },
  "bloom_levels": [5, 6]
}
```

**Response (200):**
```json
{
  "data": {
    "...updated Template...",
    "current_version": 4,
    "updated_at": "2026-02-19T15:00:00Z"
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR` — Invalid update fields
- `403 TEMPLATE_PERMISSION_ERROR` — Not the owner
- `404 TEMPLATE_NOT_FOUND` — Template does not exist

### 5.5 DELETE /api/v1/templates/:id

**Auth:** faculty (owner only)
**Description:** Soft delete not implemented -- hard delete of template and all versions. Neo4j node + relationships also deleted.

**Response (204):** No content

**Error Responses:**
- `403 TEMPLATE_PERMISSION_ERROR` — Not the owner
- `404 TEMPLATE_NOT_FOUND` — Template does not exist

### 5.6 POST /api/v1/templates/:id/duplicate

**Auth:** faculty (must have read access)
**Description:** Duplicate an existing template as a new template owned by the requesting user. Resets to `private` sharing, version 1.

**Request Body:**
```json
{
  "new_name": "My Copy of Board Prep"
}
```

**Response (201):**
```json
{
  "data": {
    "...new Template...",
    "owner_id": "requesting-user-uuid",
    "name": "My Copy of Board Prep",
    "sharing_level": "private",
    "current_version": 1
  }
}
```

**Error Responses:**
- `404 TEMPLATE_NOT_FOUND` — Source template does not exist
- `403 FORBIDDEN` — No read access to source template

### 5.7 GET /api/v1/templates/:id/versions

**Auth:** faculty (must have read access)
**Description:** List all versions for a template, ordered by version_number descending.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "template_id": "uuid",
      "version_number": 3,
      "name": "Board Prep - Cardiovascular v2",
      "description": "...",
      "question_type": "single_best_answer",
      "difficulty_distribution": { "easy": 0.0, "medium": 0.4, "hard": 0.6 },
      "bloom_levels": [5, 6],
      "scope_config": {},
      "prompt_overrides": {},
      "metadata": {},
      "sharing_level": "shared_institution",
      "created_by": "uuid",
      "created_at": "2026-02-19T15:00:00Z"
    }
  ]
}
```

---

## Section 6: Frontend Spec

Not applicable. This story is backend-only (types through controller + tests). Frontend comes in STORY-F-14 (Template Management Page).

---

## Section 7: Files to Create

Implementation order matches Types -> Model -> Repository -> Service -> Controller -> Tests.

```
1. packages/types/src/template/template.types.ts     — All TypeScript interfaces/types
2. packages/types/src/template/index.ts              — Barrel export
3. apps/server/src/errors/template.errors.ts         — Custom error classes
4. apps/server/src/models/template.model.ts          — Domain model class
5. apps/server/src/repositories/template.repository.ts — Dual-write repository
6. apps/server/src/services/template/template.service.ts — Business logic service
7. apps/server/src/controllers/template/template.controller.ts — REST controller
8. apps/server/src/api/templates.routes.ts           — Express route registration
9. apps/server/src/tests/template/template.service.test.ts — Service unit tests
10. apps/server/src/tests/template/template.controller.test.ts — Controller integration tests
```

**Files to modify (wire-up):**
```
11. apps/server/src/api/index.ts                     — Register template routes
12. apps/server/src/composition-root.ts              — Wire TemplateRepository -> TemplateService -> TemplateController
13. packages/types/src/index.ts                      — Re-export template types
```

---

## Section 8: Dependencies

### NPM Packages (already in monorepo)
- `express` — Route handling
- `zod` — Input validation schemas
- `@supabase/supabase-js` — Supabase client for PostgreSQL operations
- `neo4j-driver` — Neo4j JavaScript driver
- `uuid` (or `crypto.randomUUID`) — ID generation
- `vitest` — Test framework
- `supertest` — HTTP assertion library for controller tests

### Internal Dependencies
- `packages/types` — Shared TypeScript interfaces
- `apps/server/src/errors/index.ts` — Base `JourneyOSError` class
- `apps/server/src/middleware/auth.middleware.ts` — JWT validation + `AuthenticatedRequest` type
- `apps/server/src/middleware/role.middleware.ts` — Role-based access guard
- `apps/server/src/composition-root.ts` — DI wiring

### Infrastructure
- **DualWriteService:** This story implements the dual-write pattern inline in the repository (Supabase first -> Neo4j second -> sync_status). If a shared `DualWriteService` class already exists from earlier universal-lane stories, use it. If not, implement the pattern directly in `TemplateRepository` following the exact sequence from Architecture v10 Section 15.1.
- **Inngest sync retry:** The existing `journey/sync.retry` Inngest job (runs every 5 minutes) should automatically pick up `sync_status = 'pending'` rows from the templates table. No new Inngest job needed.

---

## Section 9: Test Fixtures

### 9.1 Faculty Users

```json
{
  "faculty_owner": {
    "id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    "email": "dr.carter@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0001-0001-000000000001",
    "is_course_director": true
  },
  "faculty_same_institution": {
    "id": "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
    "email": "dr.johnson@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0001-0001-000000000001",
    "is_course_director": false
  },
  "faculty_other_institution": {
    "id": "cccccccc-3333-3333-3333-cccccccccccc",
    "email": "dr.williams@howard.edu",
    "role": "faculty",
    "institution_id": "inst-0002-0002-0002-000000000002",
    "is_course_director": false
  }
}
```

### 9.2 Template Fixtures

```json
{
  "private_template": {
    "id": "tmpl-0001-0001-0001-000000000001",
    "institution_id": "inst-0001-0001-0001-000000000001",
    "owner_id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    "name": "My Private Template",
    "description": "Personal question generation settings",
    "question_type": "single_best_answer",
    "difficulty_distribution": { "easy": 0.3, "medium": 0.5, "hard": 0.2 },
    "bloom_levels": [3, 4, 5],
    "scope_config": {},
    "prompt_overrides": {},
    "metadata": { "category": "formative" },
    "sharing_level": "private",
    "current_version": 1,
    "graph_node_id": "neo4j-tmpl-001",
    "sync_status": "synced",
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-01T10:00:00Z"
  },
  "shared_institution_template": {
    "id": "tmpl-0002-0002-0002-000000000002",
    "institution_id": "inst-0001-0001-0001-000000000001",
    "owner_id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    "name": "Board Prep - Cardiovascular",
    "description": "High-difficulty cardiovascular questions for board preparation",
    "question_type": "single_best_answer",
    "difficulty_distribution": { "easy": 0.1, "medium": 0.3, "hard": 0.6 },
    "bloom_levels": [4, 5, 6],
    "scope_config": {
      "course_id": "course-cardio-001",
      "usmle_systems": ["Cardiovascular"]
    },
    "prompt_overrides": {
      "clinical_setting": "Emergency department",
      "vignette_instructions": "Focus on acute presentations"
    },
    "metadata": { "category": "board_prep", "tags": ["cardiovascular", "step1"] },
    "sharing_level": "shared_institution",
    "current_version": 3,
    "graph_node_id": "neo4j-tmpl-002",
    "sync_status": "synced",
    "created_at": "2026-01-15T08:00:00Z",
    "updated_at": "2026-02-10T14:30:00Z"
  },
  "public_template": {
    "id": "tmpl-0003-0003-0003-000000000003",
    "institution_id": "inst-0002-0002-0002-000000000002",
    "owner_id": "cccccccc-3333-3333-3333-cccccccccccc",
    "name": "General Anatomy Review",
    "description": "Standard anatomy question template for any institution",
    "question_type": "single_best_answer",
    "difficulty_distribution": { "easy": 0.4, "medium": 0.4, "hard": 0.2 },
    "bloom_levels": [2, 3, 4],
    "scope_config": { "usmle_systems": ["Musculoskeletal", "Nervous"] },
    "prompt_overrides": {},
    "metadata": { "category": "review" },
    "sharing_level": "public",
    "current_version": 1,
    "graph_node_id": "neo4j-tmpl-003",
    "sync_status": "synced",
    "created_at": "2026-02-05T09:00:00Z",
    "updated_at": "2026-02-05T09:00:00Z"
  }
}
```

### 9.3 Version History Fixture

```json
{
  "versions_for_shared_institution_template": [
    {
      "id": "ver-0001",
      "template_id": "tmpl-0002-0002-0002-000000000002",
      "version_number": 1,
      "name": "Board Prep - Cardiovascular",
      "description": "Initial version",
      "question_type": "single_best_answer",
      "difficulty_distribution": { "easy": 0.3, "medium": 0.5, "hard": 0.2 },
      "bloom_levels": [3, 4, 5],
      "scope_config": {},
      "prompt_overrides": {},
      "metadata": {},
      "sharing_level": "private",
      "created_by": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
      "created_at": "2026-01-15T08:00:00Z"
    },
    {
      "id": "ver-0002",
      "template_id": "tmpl-0002-0002-0002-000000000002",
      "version_number": 2,
      "name": "Board Prep - Cardiovascular",
      "description": "High-difficulty cardiovascular questions",
      "question_type": "single_best_answer",
      "difficulty_distribution": { "easy": 0.2, "medium": 0.4, "hard": 0.4 },
      "bloom_levels": [4, 5],
      "scope_config": { "course_id": "course-cardio-001" },
      "prompt_overrides": {},
      "metadata": { "category": "board_prep" },
      "sharing_level": "shared_institution",
      "created_by": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
      "created_at": "2026-01-20T11:00:00Z"
    },
    {
      "id": "ver-0003",
      "template_id": "tmpl-0002-0002-0002-000000000002",
      "version_number": 3,
      "name": "Board Prep - Cardiovascular",
      "description": "High-difficulty cardiovascular questions for board preparation",
      "question_type": "single_best_answer",
      "difficulty_distribution": { "easy": 0.1, "medium": 0.3, "hard": 0.6 },
      "bloom_levels": [4, 5, 6],
      "scope_config": { "course_id": "course-cardio-001", "usmle_systems": ["Cardiovascular"] },
      "prompt_overrides": { "clinical_setting": "Emergency department" },
      "metadata": { "category": "board_prep", "tags": ["cardiovascular", "step1"] },
      "sharing_level": "shared_institution",
      "created_by": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
      "created_at": "2026-02-10T14:30:00Z"
    }
  ]
}
```

---

## Section 10: API Test Spec (vitest)

### 10.1 Service Tests (`template.service.test.ts`) — 8 tests

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `create() — creates template with defaults` | New template gets `private` sharing, version 1, pending sync_status. Owner set from user context. |
| 2 | `create() — validates difficulty_distribution sums to 1.0` | Rejects input where easy + medium + hard != 1.0 with ValidationError. |
| 3 | `getById() — owner can access private template` | Owner retrieves their own private template successfully. |
| 4 | `getById() — non-owner cannot access private template` | Faculty from same institution gets `TemplatePermissionError` for private template. |
| 5 | `getById() — same-institution user can access shared_institution template` | Faculty from same institution reads shared_institution template successfully. |
| 6 | `update() — creates version snapshot before applying changes` | After update, `current_version` increments. Previous state is preserved in `template_versions`. |
| 7 | `update() — non-owner gets TemplatePermissionError` | Non-owner attempting update receives `TemplatePermissionError`. |
| 8 | `delete() — non-owner gets TemplatePermissionError` | Non-owner attempting delete receives `TemplatePermissionError`. |
| 9 | `duplicate() — creates new template with requesting user as owner` | Duplicated template has new ID, new owner, `private` sharing, version 1. Config copied from source. |
| 10 | `list() — returns accessible templates based on sharing level` | Owner sees own private + all shared_institution from their institution + all public. Non-owner sees only shared/public. |

### 10.2 Controller Tests (`template.controller.test.ts`) — 6 tests

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `POST /api/v1/templates — 201 on valid input` | Returns created template with correct shape. |
| 2 | `POST /api/v1/templates — 400 on invalid body` | Missing `name` or invalid `question_type` returns VALIDATION_ERROR. |
| 3 | `GET /api/v1/templates — 200 with pagination` | Returns paginated list with correct meta. |
| 4 | `GET /api/v1/templates/:id — 404 for non-existent` | Returns TEMPLATE_NOT_FOUND error. |
| 5 | `PUT /api/v1/templates/:id — 403 for non-owner` | Returns TEMPLATE_PERMISSION_ERROR. |
| 6 | `DELETE /api/v1/templates/:id — 204 on success` | Owner successfully deletes. Returns no content. |
| 7 | `POST /api/v1/templates/:id/duplicate — 201 with new owner` | Duplicate creates new template owned by requesting user. |
| 8 | `GET /api/v1/templates/:id/versions — returns version history` | Returns ordered list of version snapshots. |

**Total: 18 tests** (10 service + 8 controller) -- exceeds the 10-14 minimum.

### 10.3 Test Structure

```typescript
// apps/server/src/tests/template/template.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateService } from '../../services/template/template.service';
import { TemplateRepository } from '../../repositories/template.repository';
import { TemplateNotFoundError, TemplatePermissionError } from '../../errors/template.errors';

describe('TemplateService', () => {
  let service: TemplateService;
  let mockRepo: /* mocked TemplateRepository */;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findAccessible: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createVersion: vi.fn(),
      findVersions: vi.fn(),
    };
    service = new TemplateService(mockRepo);
  });

  describe('create()', () => {
    it('creates template with defaults', async () => {
      // Arrange: valid input without optional fields
      // Act: call service.create()
      // Assert: sharing_level = 'private', current_version = 1, owner_id matches user
    });

    it('validates difficulty_distribution sums to 1.0', async () => {
      // Arrange: input with easy=0.5, medium=0.5, hard=0.5
      // Act + Assert: throws ValidationError
    });
  });

  describe('getById()', () => {
    it('owner can access private template', async () => { /* ... */ });
    it('non-owner cannot access private template', async () => {
      // Assert: throws TemplatePermissionError
    });
    it('same-institution user can access shared_institution template', async () => { /* ... */ });
  });

  describe('update()', () => {
    it('creates version snapshot before applying changes', async () => {
      // Assert: createVersion called with pre-update state
      // Assert: current_version incremented
    });
    it('non-owner gets TemplatePermissionError', async () => { /* ... */ });
  });

  describe('delete()', () => {
    it('non-owner gets TemplatePermissionError', async () => { /* ... */ });
  });

  describe('duplicate()', () => {
    it('creates new template with requesting user as owner', async () => {
      // Assert: new ID, new owner, private sharing, version 1
    });
  });

  describe('list()', () => {
    it('returns accessible templates based on sharing level', async () => { /* ... */ });
  });
});
```

---

## Section 11: E2E Test Spec

Not applicable. This story is backend-only. E2E tests come with STORY-F-14 (Template Management Page).

---

## Section 12: Acceptance Criteria

- [ ] Template model: `name`, `description`, `question_type`, `difficulty_distribution`, `bloom_levels`, `scope_config`, `prompt_overrides`, `metadata`
- [ ] CRUD operations: create, read, update, delete with ownership checks
- [ ] Sharing: templates can be `private`, `shared_course`, `shared_institution`, `public`
- [ ] Duplicate template: copy an existing template as starting point
- [ ] Template versioning: edit creates new version, previous versions accessible
- [ ] DualWriteService: Supabase `templates` table + Neo4j `Template` node
- [ ] Ownership: creator is owner; shared templates are read-only to non-owners
- [ ] Custom error classes: `TemplateNotFoundError`, `TemplatePermissionError`
- [ ] 10-14 API tests: CRUD operations, sharing levels, ownership checks, versioning, dual-write
- [ ] TypeScript strict, named exports only

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/source/03-schema/SUPABASE_DDL_v1.md` | Table conventions (UUID PKs, `sync_status`, `graph_node_id`, `institution_id` RLS, timestamp columns), RLS policy patterns, index naming conventions. No `templates` table exists in source -- designed from patterns. |
| `.context/source/03-schema/NODE_REGISTRY_v1.md` | Neo4j naming conventions (PascalCase for single-concept labels), constraint patterns, Skinny Node Principle (<100 bytes), relationship conventions. No `Template` node exists in source -- designed from patterns. |
| `.context/source/03-schema/API_CONTRACT_v1.md` | API conventions (base URL `/api/v1`, `{ data, error, meta }` envelope, pagination `?page=1&limit=20`, error codes), auth patterns (Bearer JWT, role enforcement). No template endpoints exist in source -- designed from CRUD patterns. |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Dual-write pattern (Section 15.1), monorepo structure (Section 3.7), model routing, Inngest sync retry pattern. |
| `.context/source/04-process/CODE_STANDARDS.md` | MVC layer rules, OOP standards (private fields, public getters, constructor DI), repository pattern, service pattern, controller pattern, error class hierarchy, testing standards, composition root pattern. |
| `.context/spec/stories/S-F-39-1.md` | Original story file with acceptance criteria and implementation notes. |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** PostgreSQL database with `templates` and `template_versions` tables migrated
- **Neo4j Aura:** Graph database with `Template` uniqueness constraint applied
- **Node.js:** v20+ runtime

### Required Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # for server-side operations
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

### Migration Steps (before implementation)
1. Run the Supabase DDL from Section 4.1 to create `templates` and `template_versions` tables
2. Run the Neo4j constraint from Section 4.2: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:Template) REQUIRE n.id IS UNIQUE;`
3. Verify the `User` node type exists in Neo4j (created by universal-lane auth stories)
4. Verify the `Course` node type exists in Neo4j (created by institutional structure stories)

---

## Section 15: Figma / Make Prototype

Not applicable. This story is backend-only.

---

## Appendix A: Error Class Definitions

```typescript
// apps/server/src/errors/template.errors.ts

import { JourneyOSError } from './index';

export class TemplateNotFoundError extends JourneyOSError {
  constructor(templateId: string) {
    super(
      `Template '${templateId}' not found`,
      'TEMPLATE_NOT_FOUND'
    );
  }
}

export class TemplatePermissionError extends JourneyOSError {
  constructor(action: string, templateId: string) {
    super(
      `Permission denied: cannot ${action} template '${templateId}'`,
      'TEMPLATE_PERMISSION_ERROR'
    );
  }
}

export class TemplateVersionNotFoundError extends JourneyOSError {
  constructor(templateId: string, versionNumber: number) {
    super(
      `Version ${versionNumber} of template '${templateId}' not found`,
      'TEMPLATE_VERSION_NOT_FOUND'
    );
  }
}
```

## Appendix B: Zod Validation Schemas

```typescript
// Used in controller for request body validation

import { z } from 'zod';

export const DifficultyDistributionSchema = z.object({
  easy: z.number().min(0).max(1),
  medium: z.number().min(0).max(1),
  hard: z.number().min(0).max(1),
}).refine(
  (d) => Math.abs(d.easy + d.medium + d.hard - 1.0) < 0.001,
  { message: 'Difficulty distribution must sum to 1.0' }
);

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  question_type: z.enum(['single_best_answer', 'extended_matching', 'sequential_item_set']),
  difficulty_distribution: DifficultyDistributionSchema,
  bloom_levels: z.array(z.number().int().min(1).max(6)).min(1).max(6),
  scope_config: z.object({
    course_id: z.string().uuid().optional(),
    session_ids: z.array(z.string().uuid()).optional(),
    subconcept_ids: z.array(z.string().uuid()).optional(),
    usmle_systems: z.array(z.string()).optional(),
    usmle_disciplines: z.array(z.string()).optional(),
  }).optional(),
  prompt_overrides: z.object({
    vignette_instructions: z.string().max(1000).optional(),
    stem_instructions: z.string().max(1000).optional(),
    distractor_instructions: z.string().max(1000).optional(),
    clinical_setting: z.string().max(200).optional(),
    patient_demographics: z.string().max(500).optional(),
  }).optional(),
  metadata: z.object({
    category: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(2000).optional(),
  }).optional(),
  sharing_level: z.enum(['private', 'shared_course', 'shared_institution', 'public']).optional(),
});

export const TemplateUpdateSchema = TemplateCreateSchema.partial();

export const TemplateDuplicateSchema = z.object({
  new_name: z.string().min(1).max(200).optional(),
});

export const TemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sharing_level: z.enum(['private', 'shared_course', 'shared_institution', 'public']).optional(),
  question_type: z.enum(['single_best_answer', 'extended_matching', 'sequential_item_set']).optional(),
  course_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  owner_only: z.coerce.boolean().optional(),
});
```

## Appendix C: Sharing Level Access Matrix

| Sharing Level | Owner | Same Institution Faculty | Other Institution Faculty |
|---------------|-------|--------------------------|--------------------------|
| `private` | Read/Write/Delete | No access | No access |
| `shared_course` | Read/Write/Delete | Read (if enrolled in course) | No access |
| `shared_institution` | Read/Write/Delete | Read | No access |
| `public` | Read/Write/Delete | Read | Read |

**Rules:**
- Only the owner can update, delete, or change sharing level
- Duplicating creates a new template -- the duplicator becomes the owner of the copy
- `shared_course` requires checking that the requesting user is enrolled in or teaching the course specified in `scope_config.course_id`
- If `shared_course` is set but `scope_config.course_id` is missing, treat as `private`

## Appendix D: Domain Model Skeleton

```typescript
// apps/server/src/models/template.model.ts

import type {
  Template as TemplateDTO,
  TemplateCreateInput,
  TemplateUpdateInput,
  TemplateSharingLevel,
  TemplateVersion,
} from '@journey-os/types/template';
import { TemplatePermissionError } from '../errors/template.errors';

export class TemplateModel {
  readonly id: string;
  private _institutionId: string;
  private _ownerId: string;
  private _name: string;
  private _description: string;
  private _questionType: string;
  private _difficultyDistribution: { easy: number; medium: number; hard: number };
  private _bloomLevels: number[];
  private _scopeConfig: Record<string, unknown>;
  private _promptOverrides: Record<string, unknown>;
  private _metadata: Record<string, unknown>;
  private _sharingLevel: TemplateSharingLevel;
  private _currentVersion: number;
  private _graphNodeId: string | null;
  private _syncStatus: 'pending' | 'synced' | 'failed';
  private _createdAt: string;
  private _updatedAt: string;

  constructor(params: {
    id?: string;
    institutionId: string;
    ownerId: string;
    input: TemplateCreateInput;
  }) {
    this.id = params.id ?? crypto.randomUUID();
    this._institutionId = params.institutionId;
    this._ownerId = params.ownerId;
    this._name = params.input.name;
    this._description = params.input.description ?? '';
    this._questionType = params.input.question_type;
    this._difficultyDistribution = { ...params.input.difficulty_distribution };
    this._bloomLevels = [...params.input.bloom_levels];
    this._scopeConfig = params.input.scope_config ? { ...params.input.scope_config } : {};
    this._promptOverrides = params.input.prompt_overrides ? { ...params.input.prompt_overrides } : {};
    this._metadata = params.input.metadata ? { ...params.input.metadata } : {};
    this._sharingLevel = params.input.sharing_level ?? 'private';
    this._currentVersion = 1;
    this._graphNodeId = null;
    this._syncStatus = 'pending';
    const now = new Date().toISOString();
    this._createdAt = now;
    this._updatedAt = now;
  }

  get name(): string { return this._name; }
  get ownerId(): string { return this._ownerId; }
  get institutionId(): string { return this._institutionId; }
  get sharingLevel(): TemplateSharingLevel { return this._sharingLevel; }
  get currentVersion(): number { return this._currentVersion; }
  get syncStatus(): string { return this._syncStatus; }

  /** Check if a user can read this template based on sharing level */
  canBeAccessedBy(userId: string, userInstitutionId: string, userCourseIds?: string[]): boolean {
    if (this._ownerId === userId) return true;
    if (this._sharingLevel === 'public') return true;
    if (this._sharingLevel === 'shared_institution' && this._institutionId === userInstitutionId) return true;
    if (this._sharingLevel === 'shared_course' && this._institutionId === userInstitutionId) {
      const courseId = (this._scopeConfig as { course_id?: string }).course_id;
      return !!courseId && !!userCourseIds?.includes(courseId);
    }
    return false;
  }

  /** Check if a user can modify this template (owner only) */
  canBeEditedBy(userId: string): boolean {
    return this._ownerId === userId;
  }

  /** Enforce ownership before mutation */
  assertOwnership(userId: string, action: string): void {
    if (!this.canBeEditedBy(userId)) {
      throw new TemplatePermissionError(action, this.id);
    }
  }

  /** Create a version snapshot of current state (call BEFORE applying update) */
  createVersionSnapshot(createdBy: string): TemplateVersion {
    return {
      id: crypto.randomUUID(),
      template_id: this.id,
      version_number: this._currentVersion,
      name: this._name,
      description: this._description,
      question_type: this._questionType as TemplateDTO['question_type'],
      difficulty_distribution: { ...this._difficultyDistribution },
      bloom_levels: [...this._bloomLevels],
      scope_config: { ...this._scopeConfig } as TemplateDTO['scope_config'],
      prompt_overrides: { ...this._promptOverrides } as TemplateDTO['prompt_overrides'],
      metadata: { ...this._metadata } as TemplateDTO['metadata'],
      sharing_level: this._sharingLevel,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
  }

  /** Apply partial update. Must call createVersionSnapshot() first. */
  update(input: TemplateUpdateInput): void {
    if (input.name !== undefined) this._name = input.name;
    if (input.description !== undefined) this._description = input.description;
    if (input.question_type !== undefined) this._questionType = input.question_type;
    if (input.difficulty_distribution !== undefined) this._difficultyDistribution = { ...input.difficulty_distribution };
    if (input.bloom_levels !== undefined) this._bloomLevels = [...input.bloom_levels];
    if (input.scope_config !== undefined) this._scopeConfig = { ...input.scope_config };
    if (input.prompt_overrides !== undefined) this._promptOverrides = { ...input.prompt_overrides };
    if (input.metadata !== undefined) this._metadata = { ...input.metadata };
    if (input.sharing_level !== undefined) this._sharingLevel = input.sharing_level;
    this._currentVersion += 1;
    this._updatedAt = new Date().toISOString();
  }

  /** Mark Neo4j sync complete */
  markSynced(graphNodeId: string): void {
    this._graphNodeId = graphNodeId;
    this._syncStatus = 'synced';
  }

  /** Convert to DTO for API response */
  toDTO(): TemplateDTO {
    return {
      id: this.id,
      institution_id: this._institutionId,
      owner_id: this._ownerId,
      name: this._name,
      description: this._description,
      question_type: this._questionType as TemplateDTO['question_type'],
      difficulty_distribution: { ...this._difficultyDistribution },
      bloom_levels: [...this._bloomLevels],
      scope_config: { ...this._scopeConfig } as TemplateDTO['scope_config'],
      prompt_overrides: { ...this._promptOverrides } as TemplateDTO['prompt_overrides'],
      metadata: { ...this._metadata } as TemplateDTO['metadata'],
      sharing_level: this._sharingLevel,
      current_version: this._currentVersion,
      graph_node_id: this._graphNodeId,
      sync_status: this._syncStatus,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }

  /** Skinny properties for Neo4j node */
  toNeo4jProperties(): { id: string; name: string; sharing_level: string; question_type: string } {
    return {
      id: this.id,
      name: this._name,
      sharing_level: this._sharingLevel,
      question_type: this._questionType,
    };
  }

  /** Hydrate from database row */
  static fromRow(row: TemplateDTO): TemplateModel {
    const model = Object.create(TemplateModel.prototype) as TemplateModel;
    Object.assign(model, {
      id: row.id,
      _institutionId: row.institution_id,
      _ownerId: row.owner_id,
      _name: row.name,
      _description: row.description,
      _questionType: row.question_type,
      _difficultyDistribution: { ...row.difficulty_distribution },
      _bloomLevels: [...row.bloom_levels],
      _scopeConfig: { ...row.scope_config },
      _promptOverrides: { ...row.prompt_overrides },
      _metadata: { ...row.metadata },
      _sharingLevel: row.sharing_level,
      _currentVersion: row.current_version,
      _graphNodeId: row.graph_node_id,
      _syncStatus: row.sync_status,
      _createdAt: row.created_at,
      _updatedAt: row.updated_at,
    });
    return model;
  }
}
```
