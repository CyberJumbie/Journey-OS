# STORY-IA-27 Brief: Compliance Computation Service

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-27
old_id: S-IA-30-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 27
sprint: 39
size: L
depends_on:
  - STORY-IA-10 (institutional_admin) — Framework Linking Service (ILO-to-element mapping)
  - STORY-IA-4 (institutional_admin) — ILO Management (ILOs exist)
blocks:
  - S-IA-30-2 — Compliance Dashboard
  - S-IA-30-3 — Compliance Export
  - S-IA-31-1 — Accreditation Report Generator
personas_served: [institutional_admin]
epic: E-30 (LCME Compliance Engine)
feature: F-14 (LCME Compliance & Accreditation)
user_flow: UF-23 (LCME Compliance Tracking)
```

---

## 1. Summary

Build the **LCME Compliance Computation Service** that traverses the curriculum graph in Neo4j to compute compliance evidence chains. The service determines which LCME standards/elements are fully met, partially met, or unmet by analyzing the chain: `LCME_Element <- ILO <- SLO <- Course`.

The computation calculates coverage per element (percentage of required evidence present), aggregates by standard (weighted average), builds full evidence chains showing which ILOs map to elements, which SLOs align with ILOs, and which courses deliver SLOs. Results are cached with invalidation on curriculum changes. An incremental recompute mode handles single mapping changes efficiently.

Key constraints:
- **Neo4j graph traversal** via Cypher for evidence chain computation
- **SCREAMING_SNAKE_CASE** for Neo4j labels: LCME_Element, LCME_Standard
- **12 LCME standards** with multiple elements each
- **Performance:** Full institution computation in < 5 minutes
- **Cache invalidation** on ILO/SLO/Course mapping changes
- **Audit log** for every computation run

---

## 2. Task Breakdown

Implementation order follows: **Types -> Seed -> Model -> Repository -> Service -> Controller -> Route -> Tests**

### Task 1: Create compliance types
- **File:** `packages/types/src/compliance/compliance.types.ts`
- **Action:** Export `ComplianceStatus`, `ElementCompliance`, `StandardCompliance`, `EvidenceChain`, `ComplianceResult`, `ComplianceComputeRequest`

### Task 2: Create compliance barrel export
- **File:** `packages/types/src/compliance/index.ts`
- **Action:** Export all from `compliance.types.ts`

### Task 3: Seed LCME standards data
- **File:** `apps/server/src/modules/compliance/seeds/lcme-standards.seed.ts`
- **Action:** Seed all 12 LCME standards with their elements into Neo4j. Uses BaseSeeder pattern. Labels: LCME_Standard, LCME_Element.

### Task 4: Build ComplianceResult model
- **File:** `apps/server/src/modules/compliance/models/compliance-result.model.ts`
- **Action:** Class with `#standardResults`, `#computedAt`, `#institutionId` private fields. Public getters. Method: `toJSON()`.

### Task 5: Build ComplianceRepository
- **File:** `apps/server/src/modules/compliance/repositories/compliance.repository.ts`
- **Action:** Class with `#supabase` and `#neo4jDriver` private fields. Methods: `getEvidenceChains(institutionId)`, `cacheResults(result)`, `getCachedResults(institutionId)`, `invalidateCache(institutionId)`, `logComputation(audit)`.

### Task 6: Build EvidenceChainTraversalService
- **File:** `apps/server/src/modules/compliance/services/evidence-chain-traversal.service.ts`
- **Action:** Class with `#neo4jDriver` private field. Method: `traverseChains(institutionId)` executes Cypher query to walk LCME_Element <- ILO <- SLO <- Course and returns raw chain data.

### Task 7: Build ComplianceComputationService
- **File:** `apps/server/src/modules/compliance/services/compliance-computation.service.ts`
- **Action:** Class with `#traversalService`, `#repository` private fields (constructor DI). Methods: `computeFullCompliance(institutionId)`, `computeIncrementalCompliance(institutionId, changedMappingId)`, `getComplianceStatus(institutionId)`.

### Task 8: Build ComplianceController
- **File:** `apps/server/src/modules/compliance/controllers/compliance.controller.ts`
- **Action:** Handler for GET /compliance/compute/:institutionId. Validates params (typeof string check), calls service, returns `ApiResponse<ComplianceResult>`.

### Task 9: Register compliance routes
- **File:** `apps/server/src/modules/compliance/routes/compliance.routes.ts`
- **Action:** Wire controller with RBAC middleware (institutional_admin). Register under `/api/v1/compliance`.

### Task 10: Create custom error class
- **File:** `apps/server/src/modules/compliance/errors/compliance.errors.ts`
- **Action:** Export `ComplianceComputationError` extending base app error.

### Task 11: Write traversal service tests
- **File:** `apps/server/src/modules/compliance/__tests__/evidence-chain-traversal.test.ts`
- **Action:** 4-5 tests for chain traversal with various graph topologies.

### Task 12: Write computation service tests
- **File:** `apps/server/src/modules/compliance/__tests__/compliance-computation.service.test.ts`
- **Action:** 6-8 tests for compliance calculation, caching, incremental recompute.

### Task 13: Write repository tests
- **File:** `apps/server/src/modules/compliance/__tests__/compliance.repository.test.ts`
- **Action:** 4-5 tests for caching, invalidation, audit logging.

### Task 14: Write controller tests
- **File:** `apps/server/src/modules/compliance/__tests__/compliance.controller.test.ts`
- **Action:** 4-5 tests for endpoint access, validation, error handling.

---

## 3. Data Model

```typescript
// packages/types/src/compliance/compliance.types.ts

export type ComplianceStatus = 'met' | 'partial' | 'unmet';

/** Evidence chain for a single LCME element */
export interface EvidenceChain {
  readonly element_id: string;
  readonly element_code: string;        // e.g., "7.1"
  readonly element_name: string;
  readonly ilos: readonly {
    readonly ilo_id: string;
    readonly ilo_code: string;
    readonly ilo_title: string;
    readonly slos: readonly {
      readonly slo_id: string;
      readonly slo_code: string;
      readonly slo_title: string;
      readonly course_id: string;
      readonly course_name: string;
    }[];
  }[];
}

/** Compliance result for a single LCME element */
export interface ElementCompliance {
  readonly element_id: string;
  readonly element_code: string;
  readonly element_name: string;
  readonly status: ComplianceStatus;
  readonly coverage_percentage: number;   // 0-100
  readonly evidence_count: number;        // number of ILOs mapping to this element
  readonly required_evidence: number;     // expected ILO count
  readonly evidence_chain: EvidenceChain;
}

/** Compliance result for a full LCME standard */
export interface StandardCompliance {
  readonly standard_id: string;
  readonly standard_number: number;       // 1-12
  readonly standard_name: string;
  readonly status: ComplianceStatus;
  readonly compliance_percentage: number; // weighted average of elements
  readonly elements: readonly ElementCompliance[];
}

/** Full compliance computation result */
export interface ComplianceResult {
  readonly institution_id: string;
  readonly computed_at: string;           // ISO timestamp
  readonly computed_by: string;           // user_id who triggered
  readonly results_hash: string;          // SHA256 of results for audit
  readonly overall_compliance: number;    // 0-100
  readonly standards: readonly StandardCompliance[];
  readonly summary: {
    readonly met_count: number;
    readonly partial_count: number;
    readonly unmet_count: number;
    readonly total_elements: number;
  };
}

/** Request params for compliance computation */
export interface ComplianceComputeRequest {
  readonly institution_id: string;
  readonly force_recompute?: boolean;
}
```

---

## 4. Database Schema

### Neo4j Nodes (seeded)

```cypher
// LCME Standards (12 nodes)
CREATE (s:LCME_Standard {
  id: "lcme-std-1",
  number: 1,
  name: "Mission, Planning, Organization, and Integrity",
  institution_id: $institutionId
})

// LCME Elements (multiple per standard)
CREATE (e:LCME_Element {
  id: "lcme-elem-1-1",
  code: "1.1",
  name: "Strategic Planning and Continuous Quality Improvement",
  standard_id: "lcme-std-1",
  institution_id: $institutionId
})

// Relationships
(e:LCME_Element)-[:PART_OF]->(s:LCME_Standard)
(ilo:ILO)-[:MAPS_TO]->(e:LCME_Element)
(slo:SLO)-[:ALIGNS_WITH]->(ilo:ILO)
(c:Course)-[:OFFERS]->(slo:SLO)
```

### Supabase Tables

```sql
-- Cache table for compliance results
CREATE TABLE compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  results JSONB NOT NULL,
  results_hash TEXT NOT NULL,
  computed_by UUID NOT NULL REFERENCES auth.users(id),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_results_institution
  ON compliance_results(institution_id, computed_at DESC);

-- Audit log for compliance computations
CREATE TABLE compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  computed_by UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'full_compute', 'incremental_compute'
  results_hash TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  element_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own institution compliance"
  ON compliance_results FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);

CREATE POLICY "Admins view own institution audit"
  ON compliance_audit_log FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

---

## 5. API Contract

### GET /api/v1/compliance/compute/:institutionId (Auth: InstitutionalAdmin)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `institutionId` | UUID | Institution to compute compliance for |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `force` | boolean | false | Force recompute even if cached |

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "computed_at": "2026-02-19T12:00:00Z",
    "computed_by": "ia-uuid-1",
    "results_hash": "sha256:abc123...",
    "overall_compliance": 72.5,
    "standards": [
      {
        "standard_id": "lcme-std-7",
        "standard_number": 7,
        "standard_name": "Curricular Content",
        "status": "partial",
        "compliance_percentage": 68.0,
        "elements": [
          {
            "element_id": "lcme-elem-7-1",
            "element_code": "7.1",
            "element_name": "Biomedical, Behavioral, Social Sciences",
            "status": "met",
            "coverage_percentage": 100,
            "evidence_count": 5,
            "required_evidence": 5,
            "evidence_chain": {
              "element_id": "lcme-elem-7-1",
              "element_code": "7.1",
              "element_name": "Biomedical, Behavioral, Social Sciences",
              "ilos": [
                {
                  "ilo_id": "ilo-uuid-1",
                  "ilo_code": "ILO-1",
                  "ilo_title": "Apply biomedical sciences",
                  "slos": [
                    {
                      "slo_id": "slo-uuid-1",
                      "slo_code": "SLO-101",
                      "slo_title": "Describe cardiac physiology",
                      "course_id": "course-uuid-1",
                      "course_name": "Anatomy I"
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    ],
    "summary": {
      "met_count": 45,
      "partial_count": 18,
      "unmet_count": 7,
      "total_elements": 70
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin or wrong institution |
| 400 | `VALIDATION_ERROR` | Invalid UUID format |
| 500 | `COMPUTATION_ERROR` | Neo4j query failure or timeout |

---

## 6. Frontend Spec

No frontend components in this story. This is a backend-only service. Frontend (compliance dashboard) is handled by S-IA-30-2 which depends on this story.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/compliance.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Create |
| 3 | `apps/server/src/modules/compliance/seeds/lcme-standards.seed.ts` | Seed | Create |
| 4 | `apps/server/src/modules/compliance/models/compliance-result.model.ts` | Model | Create |
| 5 | `apps/server/src/modules/compliance/repositories/compliance.repository.ts` | Repository | Create |
| 6 | `apps/server/src/modules/compliance/services/evidence-chain-traversal.service.ts` | Service | Create |
| 7 | `apps/server/src/modules/compliance/services/compliance-computation.service.ts` | Service | Create |
| 8 | `apps/server/src/modules/compliance/controllers/compliance.controller.ts` | Controller | Create |
| 9 | `apps/server/src/modules/compliance/routes/compliance.routes.ts` | Route | Create |
| 10 | `apps/server/src/modules/compliance/errors/compliance.errors.ts` | Error | Create |
| 11 | `apps/server/src/modules/compliance/__tests__/evidence-chain-traversal.test.ts` | Tests | Create |
| 12 | `apps/server/src/modules/compliance/__tests__/compliance-computation.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/modules/compliance/__tests__/compliance.repository.test.ts` | Tests | Create |
| 14 | `apps/server/src/modules/compliance/__tests__/compliance.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-10 | institutional_admin | **PENDING** | Framework Linking Service provides ILO-to-LCME_Element mappings |
| STORY-IA-4 | institutional_admin | **PENDING** | ILO Management ensures ILOs exist in the system |

### NPM Packages
- No new packages. Uses existing Neo4j driver and Supabase client.

### Existing Files Needed
- `apps/server/src/config/neo4j-client.config.ts` -- Neo4j driver configuration
- `apps/server/src/config/supabase-client.config.ts` -- Supabase client
- `apps/server/src/seeders/base.seeder.ts` -- BaseSeeder for LCME seed
- `apps/server/src/middleware/auth.middleware.ts` -- JWT authentication
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC enforcement
- `packages/types/src/api/api-response.types.ts` -- ApiResponse wrapper

---

## 9. Test Fixtures

```typescript
// Mock LCME standards
export const MOCK_STANDARDS = [
  { id: "lcme-std-7", number: 7, name: "Curricular Content" },
  { id: "lcme-std-8", number: 8, name: "Curricular Management, Evaluation, and Enhancement" },
];

export const MOCK_ELEMENTS = [
  { id: "lcme-elem-7-1", code: "7.1", name: "Biomedical, Behavioral, Social Sciences", standard_id: "lcme-std-7" },
  { id: "lcme-elem-7-2", code: "7.2", name: "Organ Systems/Life Cycle", standard_id: "lcme-std-7" },
  { id: "lcme-elem-8-1", code: "8.1", name: "Curricular Management", standard_id: "lcme-std-8" },
];

// Mock evidence chains from Neo4j
export const MOCK_CHAINS = [
  {
    element: { id: "lcme-elem-7-1", code: "7.1", name: "Biomedical, Behavioral, Social Sciences" },
    ilo: { id: "ilo-uuid-1", code: "ILO-1", title: "Apply biomedical sciences" },
    slo: { id: "slo-uuid-1", code: "SLO-101", title: "Describe cardiac physiology" },
    course: { id: "course-uuid-1", name: "Anatomy I" },
  },
  {
    element: { id: "lcme-elem-7-1", code: "7.1", name: "Biomedical, Behavioral, Social Sciences" },
    ilo: { id: "ilo-uuid-2", code: "ILO-2", title: "Apply behavioral sciences" },
    slo: { id: "slo-uuid-2", code: "SLO-201", title: "Explain health behaviors" },
    course: { id: "course-uuid-2", name: "Behavioral Medicine" },
  },
];

// Mock compliance result
export const MOCK_COMPLIANCE_RESULT: ComplianceResult = {
  institution_id: "inst-uuid-1",
  computed_at: "2026-02-19T12:00:00Z",
  computed_by: "ia-uuid-1",
  results_hash: "sha256:abc123def456",
  overall_compliance: 72.5,
  standards: [],
  summary: {
    met_count: 45,
    partial_count: 18,
    unmet_count: 7,
    total_elements: 70,
  },
};

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/modules/compliance/__tests__/evidence-chain-traversal.test.ts`

```
describe("EvidenceChainTraversalService")
  it("traverses LCME_Element <- ILO <- SLO <- Course chain")
  it("returns empty chains for elements with no ILO mappings")
  it("handles multiple ILOs mapping to same element")
  it("handles multiple SLOs per ILO and courses per SLO")
```

**File:** `apps/server/src/modules/compliance/__tests__/compliance-computation.service.test.ts`

```
describe("ComplianceComputationService")
  describe("computeFullCompliance")
    it("computes met status for element with 100% coverage")
    it("computes partial status for element with 1-99% coverage")
    it("computes unmet status for element with 0% coverage")
    it("aggregates standard compliance as weighted average of elements")
    it("returns cached results when available and not stale")
    it("forces recompute when force flag is true")
  describe("computeIncrementalCompliance")
    it("recomputes only affected chains when single mapping changes")
    it("invalidates cache after incremental recompute")
```

**File:** `apps/server/src/modules/compliance/__tests__/compliance.repository.test.ts`

```
describe("ComplianceRepository")
  it("caches compliance results to Supabase")
  it("retrieves cached results for institution")
  it("invalidates cache by setting is_stale flag")
  it("logs computation to audit log with duration and hash")
```

**File:** `apps/server/src/modules/compliance/__tests__/compliance.controller.test.ts`

```
describe("GET /api/v1/compliance/compute/:institutionId")
  it("returns 200 with compliance result for institutional_admin")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
  it("returns 403 when institutionId does not match user institution")
  it("returns 400 for invalid UUID format")
```

**Total: ~19 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. This is a backend computation service. E2E tests will be added when the compliance dashboard UI (S-IA-30-2) is built.

---

## 12. Acceptance Criteria

1. Graph traversal computes LCME_Element <- ILO <- SLO <- Course chains via Neo4j Cypher
2. Compliance status computed per element: met (100%), partial (1-99%), unmet (0%)
3. Coverage metric is percentage of required evidence present for each element
4. Results aggregated by standard: 12 LCME standards, each with weighted average of element compliance
5. Evidence chain includes: which ILOs map to element, which SLOs map to ILO, which courses deliver SLO
6. Full institution computation completes in < 5 minutes
7. Results cached in Supabase with invalidation on curriculum changes
8. Incremental recompute handles single mapping changes efficiently
9. Audit log records: when, by whom, results hash, duration
10. API endpoint GET /api/v1/compliance/compute/:institutionId returns ComplianceResult
11. LCME seed data covers all 12 standards with their elements
12. Custom `ComplianceComputationError` class for error handling
13. All ~19 API tests pass
14. Named exports only, TypeScript strict

---

## 13. Source References

| Claim | Source |
|-------|--------|
| LCME compliance computation | S-IA-30-1 User Story |
| Evidence chain traversal pattern | S-IA-30-1 Notes (Cypher query) |
| SCREAMING_SNAKE_CASE for LCME labels | S-IA-30-1 Notes + CLAUDE.md Architecture Rules |
| 12 LCME standards | S-IA-30-1 Notes |
| 5-minute performance target | S-IA-30-1 Acceptance Criteria |
| Cache invalidation on mapping changes | S-IA-30-1 Notes |
| Blocked by framework linking and ILOs | S-IA-30-1 Dependencies |

---

## 14. Environment Prerequisites

- **Express:** Server running with module routes registered
- **Supabase:** compliance_results and compliance_audit_log tables created
- **Neo4j:** Running with GDS plugin. LCME_Standard and LCME_Element nodes seeded.
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **Prerequisite data:** ILOs, SLOs, Courses, and framework links must exist (from STORY-IA-4, IA-10)

---

## 15. Figma Make Prototype

No Figma prototype for this story. Backend service only.
