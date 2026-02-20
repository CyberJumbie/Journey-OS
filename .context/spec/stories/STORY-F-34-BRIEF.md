# STORY-F-34 Brief: TEACHES Relationship Creation

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-34
old_id: S-F-12-4
epic: E-12 (AI Concept Extraction)
feature: F-06 (Concept Extraction & Mapping)
sprint: 5
lane: faculty
lane_priority: 3
within_lane_order: 34
size: S
depends_on:
  - STORY-F-31 (faculty) — SubConcept Extraction Service (SubConcepts must be extracted)
blocks:
  - STORY-F-38 — Concept Review UI (E-13)
  - STORY-F-39 — Curriculum Map (E-13)
personas_served: [faculty, institutional_admin]
```

---

## Section 1: Summary

**What to build:** A service that automatically creates TEACHES relationships in the knowledge graph linking Courses to their extracted SubConcepts. When SubConcepts are extracted from a course's content, the service creates `(Course)-[:TEACHES]->(SubConcept)` edges in Neo4j and corresponding junction rows in Supabase, using the DualWriteService pattern.

**Parent epic:** E-12 (AI Concept Extraction) under F-06 (Concept Extraction & Mapping). This is the final step of the extraction pipeline -- after SubConcepts are extracted (F-31), optionally enriched (F-35), and deduped (F-36), the TEACHES relationships connect them to their source courses.

**User story:** As a faculty member, I need courses automatically linked to their extracted SubConcepts via TEACHES relationships so that the knowledge graph reflects what each course covers.

**User flows affected:** UF-13 (Concept Extraction & Review), UF-14 (Curriculum Management).

**Personas:** Faculty (sees course-concept mappings), Institutional Admin (views cross-course concept coverage).

**Why a separate story:** TEACHES relationship creation involves DualWriteService coordination, dedup logic for existing relationships, and status management -- sufficient complexity for its own small story.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | TEACHES types and DTOs | `packages/types/src/concept/teaches.types.ts` | 30m |
| 2 | Update concept barrel export | `packages/types/src/concept/index.ts` | 5m |
| 3 | Supabase migration: course_subconcept junction table | Supabase MCP | 20m |
| 4 | TeachesRepository | `apps/server/src/repositories/teaches.repository.ts` | 1.5h |
| 5 | TeachesService (DualWrite) | `apps/server/src/services/teaches.service.ts` | 1.5h |
| 6 | API tests: TeachesService | `apps/server/src/tests/teaches.service.test.ts` | 1.5h |

**Total estimate:** ~6h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/concept/teaches.types.ts

/** TEACHES relationship status */
export type TeachesStatus = "unverified" | "verified" | "rejected";

/** TEACHES relationship creation DTO */
export interface CreateTeachesRequest {
  readonly course_id: string;
  readonly subconcept_id: string;
  readonly source_content_id: string;
}

/** Stored TEACHES junction record (Supabase row) */
export interface TeachesRelationship {
  readonly id: string;
  readonly course_id: string;
  readonly subconcept_id: string;
  readonly status: TeachesStatus;
  readonly source_content_id: string;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Neo4j TEACHES relationship properties */
export interface TeachesRelProperties {
  readonly status: string;
  readonly source_content_id: string;
  readonly created_at: string;
}

/** Batch creation result */
export interface TeachesBatchResult {
  readonly total_requested: number;
  readonly created: number;
  readonly skipped_duplicates: number;
  readonly errors: readonly TeachesError[];
}

/** Error detail for batch creation */
export interface TeachesError {
  readonly course_id: string;
  readonly subconcept_id: string;
  readonly error_message: string;
}

/** SyncStatus (import from shared) */
export type SyncStatus = "pending" | "synced" | "failed";
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_course_subconcept_junction
CREATE TABLE course_subconcept (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    subconcept_id UUID NOT NULL REFERENCES subconcepts(id),
    status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'rejected')),
    source_content_id UUID NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, subconcept_id)
);

-- Indexes
CREATE INDEX idx_course_subconcept_course_id ON course_subconcept(course_id);
CREATE INDEX idx_course_subconcept_subconcept_id ON course_subconcept(subconcept_id);
CREATE INDEX idx_course_subconcept_status ON course_subconcept(status);

-- RLS
ALTER TABLE course_subconcept ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty reads teaches for own courses" ON course_subconcept
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE course_director_id = auth.uid()
        )
        OR (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
    );

CREATE POLICY "System inserts teaches relationships" ON course_subconcept
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System updates teaches relationships" ON course_subconcept
    FOR UPDATE USING (true);

CREATE POLICY "SuperAdmin full access to teaches" ON course_subconcept
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**Neo4j Schema:**
```cypher
// TEACHES relationship creation
MATCH (c:Course {id: $course_id}), (sc:SubConcept {id: $subconcept_id})
CREATE (c)-[:TEACHES {
  status: 'unverified',
  source_content_id: $source_content_id,
  created_at: datetime()
}]->(sc)

// Later transitions to TEACHES_VERIFIED (E-13):
// Delete TEACHES, create TEACHES_VERIFIED (relationship type swap, not property change)
```

---

## Section 5: API Contract (complete request/response)

This story is a backend service -- no public REST endpoint. The TeachesService is invoked internally as the final step of the extraction pipeline.

**Internal Service Interface:**
```typescript
interface ITeachesService {
  createForSubConcept(request: CreateTeachesRequest): Promise<TeachesRelationship>;
  createBatch(requests: CreateTeachesRequest[]): Promise<TeachesBatchResult>;
  existsForPair(courseId: string, subconceptId: string): Promise<boolean>;
}
```

---

## Section 6: Frontend Spec

Not applicable for this story. TEACHES relationships will be visualized in the Curriculum Map (E-13) and Concept Review UI.

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/teaches.types.ts` | Types | Create |
| 2 | `packages/types/src/concept/index.ts` | Types | Edit (add teaches export) |
| 3 | Supabase migration via MCP | Database | Apply |
| 4 | `apps/server/src/repositories/teaches.repository.ts` | Repository | Create |
| 5 | `apps/server/src/services/teaches.service.ts` | Service | Create |
| 6 | `apps/server/src/tests/teaches.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-31 | faculty | **NOT YET** | SubConcepts must exist before TEACHES relationships can be created |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Junction table operations
- `neo4j-driver` — TEACHES relationship creation in graph
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/concept/subconcept.types.ts` — `SubConcept` type (from F-31)

### Does NOT Depend On
- Anthropic API (no LLM calls)
- Frontend/Next.js (backend service only)
- Redis (no pub/sub)
- RBAC middleware (internal service, not exposed via HTTP)

---

## Section 9: Test Fixtures (inline)

```typescript
// TEACHES creation request
export const VALID_TEACHES_REQUEST: CreateTeachesRequest = {
  course_id: "course-uuid-001",
  subconcept_id: "subconcept-uuid-001",
  source_content_id: "content-uuid-001",
};

// Batch requests
export const BATCH_TEACHES_REQUESTS: CreateTeachesRequest[] = [
  { course_id: "course-uuid-001", subconcept_id: "subconcept-uuid-001", source_content_id: "content-uuid-001" },
  { course_id: "course-uuid-001", subconcept_id: "subconcept-uuid-002", source_content_id: "content-uuid-001" },
  { course_id: "course-uuid-001", subconcept_id: "subconcept-uuid-003", source_content_id: "content-uuid-001" },
];

// Duplicate request (same course + subconcept pair)
export const DUPLICATE_TEACHES_REQUEST: CreateTeachesRequest = {
  course_id: "course-uuid-001",
  subconcept_id: "subconcept-uuid-001",
  source_content_id: "content-uuid-002",
};

// Stored relationship
export const STORED_TEACHES: TeachesRelationship = {
  id: "teaches-uuid-001",
  course_id: "course-uuid-001",
  subconcept_id: "subconcept-uuid-001",
  status: "unverified",
  source_content_id: "content-uuid-001",
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Batch result
export const EXPECTED_BATCH_RESULT: TeachesBatchResult = {
  total_requested: 3,
  created: 3,
  skipped_duplicates: 0,
  errors: [],
};

export const BATCH_WITH_DUPLICATE_RESULT: TeachesBatchResult = {
  total_requested: 3,
  created: 2,
  skipped_duplicates: 1,
  errors: [],
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/teaches.service.test.ts`

```
describe("TeachesService")
  describe("createForSubConcept")
    ✓ creates junction row in Supabase with status 'unverified'
    ✓ creates TEACHES relationship in Neo4j with properties
    ✓ sets sync_status to 'synced' on successful dual-write
    ✓ sets sync_status to 'failed' if Neo4j write fails
    ✓ skips creation if relationship already exists (dedup)
    ✓ includes source_content_id in relationship properties

  describe("createBatch")
    ✓ creates multiple TEACHES relationships in batch
    ✓ skips duplicates and counts them in result
    ✓ continues after individual relationship failure
    ✓ returns TeachesBatchResult with correct counts

  describe("existsForPair")
    ✓ returns true if course-subconcept pair exists
    ✓ returns false if pair does not exist
```

**Total: ~12 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. TEACHES creation is a backend service. E2E tests will be added with the Concept Review UI (E-13).

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | TEACHES relationship created in Neo4j: (Course)-[:TEACHES]->(SubConcept) | API test |
| 2 | Relationship properties include status='unverified', created_at, source_content_id | API test |
| 3 | Junction row created in Supabase course_subconcept table | API test |
| 4 | No duplicate TEACHES between same Course and SubConcept | API test |
| 5 | DualWriteService: Supabase first, Neo4j second, sync_status tracked | API test |
| 6 | Batch creation handles multiple SubConcepts for one Course | API test |
| 7 | One SubConcept can be TEACHES by multiple Courses (many-to-many) | Schema design |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| TEACHES relationship: (Course)-[:TEACHES]->(SubConcept) | S-F-12-4 SS Acceptance Criteria |
| Status 'unverified' transitions to TEACHES_VERIFIED | S-F-12-4 SS Notes |
| Relationship type swap (not property change) in Neo4j | S-F-12-4 SS Notes |
| Junction table: course_subconcept | S-F-12-4 SS Notes |
| DualWrite: Supabase first, Neo4j second | CLAUDE.md SS Architecture Rules |
| Final step of extraction pipeline | S-F-12-4 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `courses` and `subconcepts` tables exist, `course_subconcept` migration applied
- **Neo4j:** Running with Course and SubConcept nodes (from F-1 and F-31)
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend relationship service only). TEACHES relationships will be visualized in the Curriculum Map when E-13 is implemented.
