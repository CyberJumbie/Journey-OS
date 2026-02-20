# STORY-IA-10 Brief: Framework Linking Service

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-10
old_id: S-IA-15-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 10
sprint: 5
size: M
depends_on:
  - STORY-IA-4 (institutional_admin) — ILO Model & Repository
  - STORY-U-12 (universal) — Framework Seeding (framework nodes exist)
blocks:
  - STORY-IA-27 — Compliance Computation Service
  - STORY-IA-31 — Visual Mapping Interface
personas_served: [institutional_admin, faculty]
epic: E-15 (Objective Mapping & Framework Linking)
feature: F-07 (Learning Objectives)
user_flow: UF-11 (ILO Management & Framework Mapping)
```

## 1. Summary

**What to build:** A FrameworkLinkingService that creates, reads, and deletes typed Neo4j relationships between ILOs/SLOs and framework nodes. Five relationship types are supported:

1. `(ILO)-[:AT_BLOOM]->(BloomLevel)`
2. `(SLO)-[:MAPS_TO_COMPETENCY]->(ACGME_Domain)`
3. `(ILO)-[:ADDRESSES_LCME]->(LCME_Element)`
4. `(SLO)-[:MAPS_TO_EPA]->(EPA)`
5. `(SLO)-[:MAPS_TO_UME]->(UME_Subcompetency)`

Framework nodes are seeded and read-only; only the relationships are user-created. The service validates that both source (ILO/SLO) and target (framework node) exist before creating a relationship. Deduplication prevents duplicate edges. CRUD is create/read/delete only — no update (delete and re-create instead). All link operations are tracked in Supabase via DualWrite for sync auditing.

**Parent epic:** E-15 (Objective Mapping & Framework Linking) under F-07 (Learning Objectives). This is the core backend service that powers compliance mapping and curriculum alignment.

**User flows satisfied:**
- UF-11 (ILO Management & Framework Mapping) — admin links ILOs to LCME elements, Bloom levels
- UF-12 (SLO Creation & Competency Mapping) — faculty links SLOs to competencies, EPAs, UME subcompetencies

**Personas:** Institutional Admin (creates ILO links), Faculty (creates SLO links). Both use the same API — authorization is handled by RBAC middleware scoping to the user's institution.

**Why this story matters:** STORY-IA-10 is a critical infrastructure story. It blocks STORY-IA-27 (Compliance Computation Service), which cannot calculate compliance coverage without knowing which objectives map to which framework nodes. It also blocks STORY-IA-31 (Visual Mapping Interface), which provides the drag-and-drop UI for creating these links. Without this service, the entire compliance and curriculum alignment vertical is blocked.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define framework link types | `packages/types/src/objective/framework-link.types.ts` | CREATE |
| 2 | Create objective types barrel export | `packages/types/src/objective/index.ts` | CREATE |
| 3 | Export objective module from types root | `packages/types/src/index.ts` | UPDATE |
| 4 | Create FrameworkLinkError custom errors | `apps/server/src/errors/framework-link.error.ts` | CREATE |
| 5 | Export new errors from errors barrel | `apps/server/src/errors/index.ts` | UPDATE |
| 6 | Implement FrameworkLinkRepository | `apps/server/src/repositories/framework-link.repository.ts` | CREATE |
| 7 | Implement FrameworkLinkingService | `apps/server/src/services/objective/framework-linking.service.ts` | CREATE |
| 8 | Implement FrameworkLinkController | `apps/server/src/controllers/objective/framework-link.controller.ts` | CREATE |
| 9 | Register framework link routes | `apps/server/src/index.ts` | UPDATE |
| 10 | Write FrameworkLinkRepository unit tests | `apps/server/src/repositories/__tests__/framework-link.repository.test.ts` | CREATE |
| 11 | Write FrameworkLinkingService unit tests | `apps/server/src/services/objective/__tests__/framework-linking.service.test.ts` | CREATE |
| 12 | Write FrameworkLinkController unit tests | `apps/server/src/controllers/objective/__tests__/framework-link.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/objective/framework-link.types.ts`

```typescript
/**
 * The 5 supported relationship types between objectives and framework nodes.
 * Each type constrains which source_type and target label are valid.
 */
export type FrameworkLinkType =
  | "AT_BLOOM"
  | "MAPS_TO_COMPETENCY"
  | "ADDRESSES_LCME"
  | "MAPS_TO_EPA"
  | "MAPS_TO_UME";

/**
 * Valid source types for framework links.
 * ILO and SLO are SEPARATE node types — never combined.
 */
export type ObjectiveSourceType = "ILO" | "SLO";

/**
 * Request body for creating a framework link.
 */
export interface FrameworkLinkRequest {
  readonly source_id: string;
  readonly source_type: ObjectiveSourceType;
  readonly target_id: string;
  readonly link_type: FrameworkLinkType;
}

/**
 * A persisted framework link with metadata.
 */
export interface FrameworkLink {
  readonly id: string;
  readonly source_id: string;
  readonly source_type: ObjectiveSourceType;
  readonly target_id: string;
  readonly target_label: string;
  readonly target_name: string;
  readonly link_type: FrameworkLinkType;
  readonly created_by: string;
  readonly created_at: string;
}

/**
 * Response wrapper for framework links list.
 */
export interface FrameworkLinksResponse {
  readonly links: readonly FrameworkLink[];
}

/**
 * Validation rules for each link type.
 * Maps link_type to the allowed source_type and target Neo4j label.
 */
export interface FrameworkLinkRule {
  readonly link_type: FrameworkLinkType;
  readonly allowed_source: ObjectiveSourceType;
  readonly target_label: string;
}

/**
 * DualWrite tracking record for Supabase.
 */
export interface FrameworkLinkRecord {
  readonly id: string;
  readonly source_id: string;
  readonly source_type: ObjectiveSourceType;
  readonly target_id: string;
  readonly link_type: FrameworkLinkType;
  readonly created_by: string;
  readonly created_at: string;
  readonly sync_status: "synced" | "pending" | "failed";
  readonly institution_id: string;
}
```

### `packages/types/src/objective/index.ts`

```typescript
export type {
  FrameworkLinkType,
  ObjectiveSourceType,
  FrameworkLinkRequest,
  FrameworkLink,
  FrameworkLinksResponse,
  FrameworkLinkRule,
  FrameworkLinkRecord,
} from "./framework-link.types";
```

### Link Validation Rules (constant, used by service)

```typescript
/**
 * Maps each link type to valid source and target.
 * AT_BLOOM: ILO → BloomLevel
 * MAPS_TO_COMPETENCY: SLO → ACGME_Domain (or ACGME_Subdomain)
 * ADDRESSES_LCME: ILO → LCME_Element
 * MAPS_TO_EPA: SLO → EPA
 * MAPS_TO_UME: SLO → UME_Subcompetency
 */
export const FRAMEWORK_LINK_RULES: readonly FrameworkLinkRule[] = [
  { link_type: "AT_BLOOM",           allowed_source: "ILO", target_label: "BloomLevel" },
  { link_type: "MAPS_TO_COMPETENCY", allowed_source: "SLO", target_label: "ACGME_Domain" },
  { link_type: "ADDRESSES_LCME",     allowed_source: "ILO", target_label: "LCME_Element" },
  { link_type: "MAPS_TO_EPA",        allowed_source: "SLO", target_label: "EPA" },
  { link_type: "MAPS_TO_UME",        allowed_source: "SLO", target_label: "UME_Subcompetency" },
] as const;
```

## 4. Database Schema (inline, complete)

### Supabase Table: `framework_links`

This table tracks DualWrite metadata for Neo4j relationships. The actual relationship lives in Neo4j; this table provides auditability and sync status.

```sql
-- Migration: create_framework_links_table
CREATE TABLE IF NOT EXISTS framework_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ILO', 'SLO')),
  target_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('AT_BLOOM', 'MAPS_TO_COMPETENCY', 'ADDRESSES_LCME', 'MAPS_TO_EPA', 'MAPS_TO_UME')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  institution_id UUID NOT NULL,
  UNIQUE (source_id, target_id, link_type)
);

-- Index for listing links by source
CREATE INDEX idx_framework_links_source ON framework_links (source_id, source_type);

-- Index for institution scoping
CREATE INDEX idx_framework_links_institution ON framework_links (institution_id);

-- RLS
ALTER TABLE framework_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their institution's links"
  ON framework_links FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::UUID);

CREATE POLICY "Users can insert links for their institution"
  ON framework_links FOR INSERT
  WITH CHECK (institution_id = (auth.jwt() ->> 'institution_id')::UUID);

CREATE POLICY "Users can delete links for their institution"
  ON framework_links FOR DELETE
  USING (institution_id = (auth.jwt() ->> 'institution_id')::UUID);
```

### Neo4j Relationships (created by service)

```cypher
// AT_BLOOM: ILO → BloomLevel
MATCH (ilo:ILO {id: $source_id}), (bl:BloomLevel {id: $target_id})
CREATE (ilo)-[:AT_BLOOM {created_by: $user_id, created_at: datetime()}]->(bl)

// MAPS_TO_COMPETENCY: SLO → ACGME_Domain
MATCH (slo:SLO {id: $source_id}), (d:ACGME_Domain {id: $target_id})
CREATE (slo)-[:MAPS_TO_COMPETENCY {created_by: $user_id, created_at: datetime()}]->(d)

// ADDRESSES_LCME: ILO → LCME_Element
MATCH (ilo:ILO {id: $source_id}), (le:LCME_Element {id: $target_id})
CREATE (ilo)-[:ADDRESSES_LCME {created_by: $user_id, created_at: datetime()}]->(le)

// MAPS_TO_EPA: SLO → EPA
MATCH (slo:SLO {id: $source_id}), (epa:EPA {id: $target_id})
CREATE (slo)-[:MAPS_TO_EPA {created_by: $user_id, created_at: datetime()}]->(epa)

// MAPS_TO_UME: SLO → UME_Subcompetency
MATCH (slo:SLO {id: $source_id}), (ume:UME_Subcompetency {id: $target_id})
CREATE (slo)-[:MAPS_TO_UME {created_by: $user_id, created_at: datetime()}]->(ume)
```

### Deduplication Cypher (check before create)

```cypher
// Check if relationship already exists
MATCH (src {id: $source_id})-[r:AT_BLOOM]->(tgt {id: $target_id})
RETURN count(r) AS count
```

## 5. API Contract (complete request/response)

### POST /api/v1/objective/:id/framework-links

**Auth:** Required. Roles: `institutional_admin`, `faculty`.

**Path Parameters:**
- `id` (string) — Source objective ID (ILO or SLO UUID)

**Request:**
```json
{
  "source_type": "ILO",
  "target_id": "bloom-level-uuid-apply",
  "link_type": "AT_BLOOM"
}
```

Note: `source_id` is taken from the URL path param `:id`, not the request body.

**201 Created:**
```json
{
  "data": {
    "id": "link-uuid-1",
    "source_id": "ilo-uuid-1",
    "source_type": "ILO",
    "target_id": "bloom-level-uuid-apply",
    "target_label": "BloomLevel",
    "target_name": "Apply",
    "link_type": "AT_BLOOM",
    "created_by": "user-uuid-1",
    "created_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

**400 Validation Error (invalid link_type for source_type):**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Link type AT_BLOOM requires source_type ILO, but received SLO"
  }
}
```

**404 Not Found (source or target does not exist):**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Target node not found: BloomLevel with id bloom-level-uuid-xxx"
  }
}
```

**409 Conflict (duplicate link):**
```json
{
  "data": null,
  "error": {
    "code": "CONFLICT",
    "message": "A link of type AT_BLOOM already exists between these nodes"
  }
}
```

### GET /api/v1/objective/:id/framework-links

**Auth:** Required. Roles: `institutional_admin`, `faculty`.

**Path Parameters:**
- `id` (string) — Source objective ID (ILO or SLO UUID)

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `link_type` | string | No | Filter by link type |

**200 Success:**
```json
{
  "data": {
    "links": [
      {
        "id": "link-uuid-1",
        "source_id": "ilo-uuid-1",
        "source_type": "ILO",
        "target_id": "bloom-level-uuid-apply",
        "target_label": "BloomLevel",
        "target_name": "Apply",
        "link_type": "AT_BLOOM",
        "created_by": "user-uuid-1",
        "created_at": "2026-02-19T10:00:00Z"
      },
      {
        "id": "link-uuid-2",
        "source_id": "ilo-uuid-1",
        "source_type": "ILO",
        "target_id": "lcme-element-uuid-7.1",
        "target_label": "LCME_Element",
        "target_name": "Element 7.1: Biomedical Sciences",
        "link_type": "ADDRESSES_LCME",
        "created_by": "user-uuid-1",
        "created_at": "2026-02-19T10:05:00Z"
      }
    ]
  },
  "error": null
}
```

**200 Empty (no links):**
```json
{
  "data": {
    "links": []
  },
  "error": null
}
```

### DELETE /api/v1/objective/:id/framework-links/:linkId

**Auth:** Required. Roles: `institutional_admin`, `faculty`.

**Path Parameters:**
- `id` (string) — Source objective ID
- `linkId` (string) — Framework link UUID

**204 No Content:** (empty response body)

**404 Not Found:**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Framework link not found"
  }
}
```

## 6. Frontend Spec

**No frontend components in this story.** STORY-IA-10 is a backend-only service. The visual mapping interface is STORY-IA-31, which depends on this service. The API can be tested via the API test suite and manual curl/Postman calls.

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/objective/framework-link.types.ts` | CREATE | FrameworkLink types, rules, records |
| 2 | Types | `packages/types/src/objective/index.ts` | CREATE | Barrel export for objective types |
| 3 | Types | `packages/types/src/index.ts` | UPDATE | Add `export * from "./objective"` |
| 4 | Errors | `apps/server/src/errors/framework-link.error.ts` | CREATE | FrameworkLinkNotFoundError, DuplicateLinkError, InvalidLinkTypeError |
| 5 | Errors | `apps/server/src/errors/index.ts` | UPDATE | Export new error classes |
| 6 | Repository | `apps/server/src/repositories/framework-link.repository.ts` | CREATE | Neo4j CRUD + Supabase DualWrite |
| 7 | Service | `apps/server/src/services/objective/framework-linking.service.ts` | CREATE | Validation, dedup, DualWrite orchestration |
| 8 | Controller | `apps/server/src/controllers/objective/framework-link.controller.ts` | CREATE | Request parsing, response formatting |
| 9 | App | `apps/server/src/index.ts` | UPDATE | Register 3 framework link routes |
| 10 | Tests | `apps/server/src/repositories/__tests__/framework-link.repository.test.ts` | CREATE | Repository unit tests |
| 11 | Tests | `apps/server/src/services/objective/__tests__/framework-linking.service.test.ts` | CREATE | Service unit tests |
| 12 | Tests | `apps/server/src/controllers/objective/__tests__/framework-link.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-IA-4 | institutional_admin | PENDING | ILO Model & Repository — ILO node type in Neo4j, ILO table in Supabase |
| STORY-U-12 | universal | PENDING | Framework Seeding — BloomLevel, LCME_Element, ACGME_Domain, EPA, UME_Subcompetency nodes in Neo4j |
| STORY-U-1 | universal | DONE | Supabase Auth Setup |
| STORY-U-3 | universal | DONE | Express Auth Middleware |
| STORY-U-4 | universal | DONE | Seed Script Infrastructure — Neo4jClientConfig |
| STORY-U-6 | universal | DONE | RBAC Middleware |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `neo4j-driver` | ^5.x | Neo4j Cypher queries for relationship CRUD |
| `@supabase/supabase-js` | ^2.97.0 | DualWrite tracking in Supabase |
| `express` | ^5.2.1 | Request/Response types |
| `zod` | ^4.3.6 | Request body validation |
| `vitest` | ^4.0.18 | Test runner |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `apps/server/src/config/neo4j.config.ts` | `Neo4jClientConfig` for database connection |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/middleware/auth.middleware.ts` | Auth middleware for JWT validation |
| `apps/server/src/middleware/rbac.middleware.ts` | RBAC middleware for role enforcement |
| `packages/types/src/auth/roles.types.ts` | `AuthRole` enum |

## 9. Test Fixtures (inline)

### Framework Link Requests

```typescript
export const VALID_ILO_BLOOM_LINK: FrameworkLinkRequest = {
  source_id: "ilo-uuid-001",
  source_type: "ILO",
  target_id: "bloom-uuid-apply",
  link_type: "AT_BLOOM",
};

export const VALID_SLO_COMPETENCY_LINK: FrameworkLinkRequest = {
  source_id: "slo-uuid-001",
  source_type: "SLO",
  target_id: "acgme-uuid-patient-care",
  link_type: "MAPS_TO_COMPETENCY",
};

export const VALID_ILO_LCME_LINK: FrameworkLinkRequest = {
  source_id: "ilo-uuid-001",
  source_type: "ILO",
  target_id: "lcme-uuid-7-1",
  link_type: "ADDRESSES_LCME",
};

export const VALID_SLO_EPA_LINK: FrameworkLinkRequest = {
  source_id: "slo-uuid-002",
  source_type: "SLO",
  target_id: "epa-uuid-1",
  link_type: "MAPS_TO_EPA",
};

export const VALID_SLO_UME_LINK: FrameworkLinkRequest = {
  source_id: "slo-uuid-003",
  source_type: "SLO",
  target_id: "ume-uuid-pc-1",
  link_type: "MAPS_TO_UME",
};
```

### Invalid Requests

```typescript
export const INVALID_SLO_BLOOM_LINK: FrameworkLinkRequest = {
  source_id: "slo-uuid-001",
  source_type: "SLO",
  target_id: "bloom-uuid-apply",
  link_type: "AT_BLOOM",  // AT_BLOOM requires ILO, not SLO
};

export const INVALID_ILO_EPA_LINK: FrameworkLinkRequest = {
  source_id: "ilo-uuid-001",
  source_type: "ILO",
  target_id: "epa-uuid-1",
  link_type: "MAPS_TO_EPA",  // MAPS_TO_EPA requires SLO, not ILO
};

export const NONEXISTENT_TARGET_LINK: FrameworkLinkRequest = {
  source_id: "ilo-uuid-001",
  source_type: "ILO",
  target_id: "nonexistent-uuid",
  link_type: "AT_BLOOM",
};
```

### Mock Framework Links (returned from service)

```typescript
export const MOCK_LINKS: FrameworkLink[] = [
  {
    id: "link-uuid-001",
    source_id: "ilo-uuid-001",
    source_type: "ILO",
    target_id: "bloom-uuid-apply",
    target_label: "BloomLevel",
    target_name: "Apply",
    link_type: "AT_BLOOM",
    created_by: "user-uuid-001",
    created_at: "2026-02-19T10:00:00Z",
  },
  {
    id: "link-uuid-002",
    source_id: "ilo-uuid-001",
    source_type: "ILO",
    target_id: "lcme-uuid-7-1",
    target_label: "LCME_Element",
    target_name: "Element 7.1: Biomedical Sciences",
    link_type: "ADDRESSES_LCME",
    created_by: "user-uuid-001",
    created_at: "2026-02-19T10:05:00Z",
  },
];
```

### Mock Neo4j Session

```typescript
export function mockNeo4jSession() {
  return {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export function mockNeo4jDriver() {
  const session = mockNeo4jSession();
  return {
    driver: {
      session: vi.fn().mockReturnValue(session),
    },
    session,
  };
}
```

### Mock Supabase for DualWrite

```typescript
export function mockSupabaseDualWrite() {
  const insertResult = { data: { id: "link-uuid-001" }, error: null };
  const selectResult = { data: MOCK_LINKS, error: null };
  const deleteResult = { data: null, error: null };

  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(selectResult),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(deleteResult),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  };
}
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(
  params?: Record<string, string>,
  body?: Record<string, unknown>,
  query?: Record<string, string>,
): Partial<Request> {
  return {
    params: params ?? {},
    body: body ?? {},
    query: query ?? {},
    user: {
      sub: "user-uuid-001",
      email: "admin@example.edu",
      role: "institutional_admin",
      institution_id: "inst-uuid-001",
      is_course_director: false,
      aud: "authenticated",
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    },
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
    sendStatus(code: number) {
      res.statusCode = code;
      return res as Response;
    },
  };
  return res;
}
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/repositories/__tests__/framework-link.repository.test.ts`

```
describe("FrameworkLinkRepository")
  describe("createLink")
    it("creates Neo4j relationship with correct type and properties")
    it("inserts DualWrite record into Supabase framework_links table")
    it("sets sync_status to 'synced' after successful Neo4j write")
    it("sets sync_status to 'failed' when Neo4j write fails")
    it("closes Neo4j session after operation")

  describe("getLinks")
    it("queries Supabase framework_links by source_id")
    it("filters by link_type when provided")
    it("enriches results with target_label and target_name from Neo4j")

  describe("deleteLink")
    it("deletes Neo4j relationship by link metadata")
    it("deletes Supabase framework_links record")
    it("closes Neo4j session after operation")

  describe("checkDuplicate")
    it("returns true when relationship already exists in Neo4j")
    it("returns false when relationship does not exist")

  describe("nodeExists")
    it("returns true for existing node with matching label")
    it("returns false for non-existent node")
```

### `apps/server/src/services/objective/__tests__/framework-linking.service.test.ts`

```
describe("FrameworkLinkingService")
  describe("createLink")
    it("creates link for valid ILO → BloomLevel (AT_BLOOM)")
    it("creates link for valid SLO → ACGME_Domain (MAPS_TO_COMPETENCY)")
    it("creates link for valid ILO → LCME_Element (ADDRESSES_LCME)")
    it("creates link for valid SLO → EPA (MAPS_TO_EPA)")
    it("creates link for valid SLO → UME_Subcompetency (MAPS_TO_UME)")
    it("throws InvalidLinkTypeError when source_type doesn't match link_type rule")
    it("throws NotFoundError when source ILO/SLO does not exist")
    it("throws NotFoundError when target framework node does not exist")
    it("throws DuplicateLinkError when link already exists")

  describe("getLinks")
    it("returns all links for a given source_id")
    it("filters by link_type when provided")
    it("returns empty array when no links exist")

  describe("deleteLink")
    it("deletes link by linkId")
    it("throws FrameworkLinkNotFoundError when link does not exist")
    it("removes both Neo4j relationship and Supabase record")
```

### `apps/server/src/controllers/objective/__tests__/framework-link.controller.test.ts`

```
describe("FrameworkLinkController")
  describe("handleCreateLink")
    it("returns 201 with FrameworkLink for valid request")
    it("returns 400 for missing source_type")
    it("returns 400 for missing target_id")
    it("returns 400 for missing link_type")
    it("returns 400 for invalid link_type value")
    it("returns 404 when source or target not found")
    it("returns 409 when duplicate link exists")
    it("narrows req.params.id with typeof check")

  describe("handleGetLinks")
    it("returns 200 with FrameworkLinksResponse")
    it("returns 200 with empty links array when none exist")
    it("passes link_type filter from query string")
    it("narrows req.params.id with typeof check")

  describe("handleDeleteLink")
    it("returns 204 for successful deletion")
    it("returns 404 when link not found")
    it("narrows req.params.id and req.params.linkId with typeof check")
    it("response bodies match ApiResponse envelope")
```

**Total: ~35 test cases** (exceeds 10-12 minimum).

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

**Not applicable for this story.** STORY-IA-10 is a backend-only service with no frontend. E2E tests will be added with STORY-IA-31 (Visual Mapping Interface), which provides the UI for creating framework links. API-level tests with mocked Neo4j sessions and Supabase provide comprehensive coverage of the service logic.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `POST /api/v1/objective/:id/framework-links` creates a typed Neo4j relationship | Test: Neo4j session.run called with correct Cypher |
| AC-2 | Five relationship types supported: AT_BLOOM, MAPS_TO_COMPETENCY, ADDRESSES_LCME, MAPS_TO_EPA, MAPS_TO_UME | Test: one test per link type |
| AC-3 | Validation: link_type must match source_type (e.g., AT_BLOOM requires ILO) | Test: InvalidLinkTypeError thrown for mismatch |
| AC-4 | Validation: source node (ILO/SLO) must exist | Test: NotFoundError for missing source |
| AC-5 | Validation: target framework node must exist with correct label | Test: NotFoundError for missing target |
| AC-6 | Deduplication: no duplicate edges for same source/target/type | Test: DuplicateLinkError on second create |
| AC-7 | `GET /api/v1/objective/:id/framework-links` returns all links for source | Test: correct response shape |
| AC-8 | `DELETE /api/v1/objective/:id/framework-links/:linkId` removes link | Test: 204 response, Neo4j + Supabase deletion |
| AC-9 | DualWrite: Supabase record created with sync_status tracking | Test: Supabase insert verified |
| AC-10 | DualWrite: Supabase first, then Neo4j, sync_status updated | Code review: write order |
| AC-11 | Routes protected — requires `institutional_admin` or `faculty` role | Test: RBAC middleware applied |
| AC-12 | ILO and SLO treated as SEPARATE node types (never combined) | Code review: distinct Cypher labels |
| AC-13 | JS `#private` fields used (not TS `private`) | Code review |
| AC-14 | Constructor DI: Neo4j driver + Supabase client injected | Code review: constructor signature |
| AC-15 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-16 | Express `req.params` values narrowed with `typeof === "string"` | Code review |
| AC-17 | 10+ API tests pass | Test suite: ~35 tests in vitest |
| AC-18 | `framework_links` Supabase migration applied with RLS policies | Migration file reviewed |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| ILO and SLO are SEPARATE node types | CLAUDE.md | Architecture Rules |
| Cross-layer relationships: MAPS_TO_COMPETENCY, AT_BLOOM, etc. | ARCHITECTURE_v10.md | SS 5.4 |
| DualWrite: Supabase first, Neo4j second, sync_status | CLAUDE.md | Architecture Rules |
| Framework node labels: BloomLevel, LCME_Element, ACGME_Domain, EPA, UME_Subcompetency | NODE_REGISTRY (seed data) | Framework hierarchy |
| Custom error classes only (no raw Error) | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Express req.params narrowing | CLAUDE.md | Monorepo Conventions |
| Named exports only | CLAUDE.md | Architecture Rules |
| API response envelope: `{ data, error, meta? }` | API_CONTRACT_v1.md | Conventions |
| Neo4j env vars optional in zod (validate at instantiation) | CLAUDE.md | Monorepo Conventions |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Neo4j | Relationship CRUD — mocked in tests | For manual testing only |
| Supabase | DualWrite tracking — mocked in tests | For manual testing only |

### Environment Variables

No new environment variables. Uses existing Neo4j and Supabase config:

**Server (`apps/server/.env`):**
- `NEO4J_URI` — already configured (optional in zod schema)
- `NEO4J_USERNAME` — already configured
- `NEO4J_PASSWORD` — already configured
- `SUPABASE_URL` — already configured
- `SUPABASE_SERVICE_ROLE_KEY` — already configured

### Database Migration

Run the `framework_links` migration (Section 4) via Supabase MCP `apply_migration` before manual testing.

### Dev Setup

```bash
pnpm install
pnpm --filter @journey-os/types build
pnpm --filter @journey-os/server test
```

## 15. Figma Make Prototype (Optional)

**Not applicable.** STORY-IA-10 is a backend-only service with no UI. The visual mapping interface (STORY-IA-31) will need a prototype, but this story does not.

---

## Implementation Notes

### FrameworkLinkingService Design

```typescript
// apps/server/src/services/objective/framework-linking.service.ts
import { SupabaseClient } from "@supabase/supabase-js";
import type { Driver } from "neo4j-driver";
import type {
  FrameworkLink,
  FrameworkLinkRequest,
  FrameworkLinksResponse,
  FrameworkLinkRule,
} from "@journey-os/types";
import { InvalidLinkTypeError, DuplicateLinkError, FrameworkLinkNotFoundError } from "../../errors/framework-link.error";
import { FrameworkLinkRepository } from "../../repositories/framework-link.repository";

const FRAMEWORK_LINK_RULES: readonly FrameworkLinkRule[] = [
  { link_type: "AT_BLOOM",           allowed_source: "ILO", target_label: "BloomLevel" },
  { link_type: "MAPS_TO_COMPETENCY", allowed_source: "SLO", target_label: "ACGME_Domain" },
  { link_type: "ADDRESSES_LCME",     allowed_source: "ILO", target_label: "LCME_Element" },
  { link_type: "MAPS_TO_EPA",        allowed_source: "SLO", target_label: "EPA" },
  { link_type: "MAPS_TO_UME",        allowed_source: "SLO", target_label: "UME_Subcompetency" },
] as const;

export class FrameworkLinkingService {
  readonly #repository: FrameworkLinkRepository;

  constructor(repository: FrameworkLinkRepository) {
    this.#repository = repository;
  }

  async createLink(
    sourceId: string,
    request: Omit<FrameworkLinkRequest, "source_id">,
    userId: string,
    institutionId: string,
  ): Promise<FrameworkLink> {
    // 1. Validate link_type → source_type pairing
    const rule = FRAMEWORK_LINK_RULES.find((r) => r.link_type === request.link_type);
    if (!rule) {
      throw new InvalidLinkTypeError(`Unknown link type: ${request.link_type}`);
    }
    if (rule.allowed_source !== request.source_type) {
      throw new InvalidLinkTypeError(
        `Link type ${request.link_type} requires source_type ${rule.allowed_source}, but received ${request.source_type}`,
      );
    }

    // 2. Check source node exists
    const sourceExists = await this.#repository.nodeExists(sourceId, request.source_type);
    if (!sourceExists) {
      throw new FrameworkLinkNotFoundError(
        `Source node not found: ${request.source_type} with id ${sourceId}`,
      );
    }

    // 3. Check target node exists with correct label
    const targetExists = await this.#repository.nodeExists(request.target_id, rule.target_label);
    if (!targetExists) {
      throw new FrameworkLinkNotFoundError(
        `Target node not found: ${rule.target_label} with id ${request.target_id}`,
      );
    }

    // 4. Check for duplicate
    const isDuplicate = await this.#repository.checkDuplicate(
      sourceId,
      request.target_id,
      request.link_type,
    );
    if (isDuplicate) {
      throw new DuplicateLinkError(
        `A link of type ${request.link_type} already exists between these nodes`,
      );
    }

    // 5. DualWrite: Supabase first, Neo4j second
    return this.#repository.createLink(
      {
        source_id: sourceId,
        source_type: request.source_type,
        target_id: request.target_id,
        link_type: request.link_type,
      },
      userId,
      institutionId,
      rule.target_label,
    );
  }

  async getLinks(sourceId: string, linkType?: string): Promise<FrameworkLinksResponse> {
    const links = await this.#repository.getLinks(sourceId, linkType);
    return { links };
  }

  async deleteLink(linkId: string): Promise<void> {
    const exists = await this.#repository.linkExists(linkId);
    if (!exists) {
      throw new FrameworkLinkNotFoundError("Framework link not found");
    }
    await this.#repository.deleteLink(linkId);
  }
}
```

### Error Classes

```typescript
// apps/server/src/errors/framework-link.error.ts
import { JourneyOSError } from "./base.errors";

export class FrameworkLinkNotFoundError extends JourneyOSError {
  constructor(message: string = "Framework link not found") {
    super(message, "NOT_FOUND");
  }
}

export class DuplicateLinkError extends JourneyOSError {
  constructor(message: string = "Duplicate framework link") {
    super(message, "CONFLICT");
  }
}

export class InvalidLinkTypeError extends JourneyOSError {
  constructor(message: string = "Invalid link type for source") {
    super(message, "VALIDATION_ERROR");
  }
}
```

### Route Registration (in index.ts)

```typescript
// Add to apps/server/src/index.ts — protected routes section
import { FrameworkLinkController } from "./controllers/objective/framework-link.controller";
import { FrameworkLinkingService } from "./services/objective/framework-linking.service";
import { FrameworkLinkRepository } from "./repositories/framework-link.repository";

const frameworkLinkRepository = new FrameworkLinkRepository(
  neo4jConfig.driver,
  getSupabaseClient(),
);
const frameworkLinkingService = new FrameworkLinkingService(frameworkLinkRepository);
const frameworkLinkController = new FrameworkLinkController(frameworkLinkingService);

// Protected — requires institutional_admin or faculty
app.post(
  "/api/v1/objective/:id/framework-links",
  authMiddleware.authenticate,
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY),
  (req, res) => frameworkLinkController.handleCreateLink(req, res),
);

app.get(
  "/api/v1/objective/:id/framework-links",
  authMiddleware.authenticate,
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY),
  (req, res) => frameworkLinkController.handleGetLinks(req, res),
);

app.delete(
  "/api/v1/objective/:id/framework-links/:linkId",
  authMiddleware.authenticate,
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY),
  (req, res) => frameworkLinkController.handleDeleteLink(req, res),
);
```
