# STORY-IA-12 Brief: KaizenML Lint Rule Engine

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-12
old_id: S-IA-37-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 12
sprint: 15
size: L
depends_on:
  - STORY-IA-5 (institutional_admin) — Admin Dashboard Page
blocks:
  - STORY-IA-35 — Lint Alert Integration
  - STORY-IA-36 — Golden Dataset Service
  - STORY-IA-37 — Lint Results UI
personas_served: [institutional_admin]
epic: E-37 (KaizenML Linting & Golden Dataset)
feature: F-17 (Admin Dashboard)
user_flow: UF-27 (Admin Dashboard & Data Integrity)
```

---

## 1. Summary

Build the **KaizenML lint rule engine** -- a data quality linting system that detects issues in the knowledge graph and item bank. The engine runs 9 built-in rules that check for orphaned concepts, dangling SLOs, embedding drift, stale items, tag inconsistencies, duplicate mappings, missing provenance, score distribution skew, and low-confidence tags. Rules run on a nightly Inngest schedule or can be triggered manually by InstitutionalAdmin.

Each rule returns findings with severity (critical/warning/info), affected node IDs, and a suggested fix. The engine supports **delta mode** (only checks nodes modified since last run) and **full scan mode**. Results are stored in a `lint_reports` table with aggregated counts. Rule behavior is configurable per institution via `lint_rule_configs`.

Key constraints:
- **InstitutionalAdmin only** -- RBAC enforced with `rbac.require(AuthRole.INSTITUTIONAL_ADMIN)`
- Institution scoping: all queries filter by institution_id
- Rules are pluggable via a registry pattern (constructor DI)
- Nightly schedule via Inngest (cron trigger, out of scope for wiring -- just expose the engine method)
- Full scan is the default mode; delta mode requires a `since` timestamp
- Each rule is an independent class implementing the `LintRule` interface

---

## 2. Task Breakdown

Implementation order follows: **Types -> Migration -> Errors -> Model -> Repository -> Rules -> Engine -> Registry -> Controller -> Routes -> Tests**

### Task 1: Create KaizenML lint types
- **File:** `packages/types/src/kaizen/lint.types.ts`
- **Action:** Export `LintSeverity`, `LintFinding`, `LintReport`, `LintRuleConfig`, `LintRule`, `LintContext`

### Task 2: Create kaizen barrel export
- **File:** `packages/types/src/kaizen/index.ts`
- **Action:** Create barrel file re-exporting from `lint.types.ts`

### Task 3: Export kaizen from main barrel
- **File:** `packages/types/src/index.ts`
- **Action:** Edit to add `export * from "./kaizen";`

### Task 4: Apply database migration
- **Action:** Create `lint_reports` and `lint_rule_configs` tables via Supabase MCP

### Task 5: Create KaizenML error classes
- **File:** `apps/server/src/errors/kaizen.error.ts`
- **Action:** Create `KaizenError`, `LintRuleNotFoundError`, `LintReportNotFoundError`, `LintEngineError` extending `JourneyOSError`

### Task 6: Build LintReport model
- **File:** `apps/server/src/models/lint-report.model.ts`
- **Action:** OOP model with private fields, getters, `toJSON()`. Maps DB row to domain object.

### Task 7: Build LintReportRepository
- **File:** `apps/server/src/repositories/lint-report.repository.ts`
- **Action:** `create(report)`, `findById(id)`, `listByInstitution(institutionId, limit)`, `getConfigs(institutionId)`, `upsertConfig(institutionId, ruleId, config)`

### Task 8: Build OrphanConceptsRule
- **File:** `apps/server/src/services/kaizen/rules/orphan-concepts.rule.ts`
- **Action:** Find SubConcept nodes with no TEACHES edges. Queries Neo4j. Severity: warning.

### Task 9: Build DanglingSloRule
- **File:** `apps/server/src/services/kaizen/rules/dangling-slo.rule.ts`
- **Action:** Find SLOs with broken course references in Supabase. Severity: critical.

### Task 10: Build EmbeddingDriftRule
- **File:** `apps/server/src/services/kaizen/rules/embedding-drift.rule.ts`
- **Action:** Find embeddings that diverged from baseline (cosine distance > threshold). Default threshold: 0.15. Severity: warning.

### Task 11: Build StaleItemsRule
- **File:** `apps/server/src/services/kaizen/rules/stale-items.rule.ts`
- **Action:** Find assessment items not updated in >90 days. Supabase query. Severity: info.

### Task 12: Build TagInconsistencyRule
- **File:** `apps/server/src/services/kaizen/rules/tag-inconsistency.rule.ts`
- **Action:** Find items with conflicting tags (e.g., tagged both "easy" and "hard"). Severity: warning.

### Task 13: Build DuplicateMappingsRule
- **File:** `apps/server/src/services/kaizen/rules/duplicate-mappings.rule.ts`
- **Action:** Find same ILO/SLO mapped to same framework node more than once. Severity: warning.

### Task 14: Build MissingProvenanceRule
- **File:** `apps/server/src/services/kaizen/rules/missing-provenance.rule.ts`
- **Action:** Find items without `generation_session_id`. Severity: info.

### Task 15: Build ScoreSkewRule
- **File:** `apps/server/src/services/kaizen/rules/score-skew.rule.ts`
- **Action:** Check quality score distribution for skew using simplified Shapiro-Wilk approximation. Severity: warning.

### Task 16: Build LowConfidenceTagsRule
- **File:** `apps/server/src/services/kaizen/rules/low-confidence-tags.rule.ts`
- **Action:** Find tags with confidence < 0.5. Severity: info.

### Task 17: Build LintRuleRegistryService
- **File:** `apps/server/src/services/kaizen/lint-rule-registry.service.ts`
- **Action:** Registry that holds all 9 rules. `register(rule)`, `getRule(id)`, `getAllRules()`, `getEnabledRules(configs)`.

### Task 18: Build LintEngineService
- **File:** `apps/server/src/services/kaizen/lint-engine.service.ts`
- **Action:** `runScan(institutionId, mode, since?)` method. Loads enabled rules from config, executes each, aggregates findings, saves report, returns report. Handles individual rule errors gracefully (logs and continues).

### Task 19: Build LintController
- **File:** `apps/server/src/controllers/kaizen/lint.controller.ts`
- **Action:** `handleListReports`, `handleGetReport`, `handleRunScan`, `handleGetConfig`, `handleUpdateConfig`

### Task 20: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add 5 protected routes under `/api/v1/institution/lint/`

### Task 21: Write engine tests
- **File:** `apps/server/src/services/kaizen/__tests__/lint-engine.service.test.ts`
- **Action:** 10 tests covering scan execution, delta mode, error handling, report creation

### Task 22: Write individual rule tests
- **File:** `apps/server/src/services/kaizen/rules/__tests__/*.test.ts`
- **Action:** 2-3 tests per rule covering finding detection and empty results

### Task 23: Write controller tests
- **File:** `apps/server/src/controllers/kaizen/__tests__/lint.controller.test.ts`
- **Action:** 5 tests covering RBAC, validation, success responses

---

## 3. Data Model

```typescript
// packages/types/src/kaizen/lint.types.ts

/** Severity levels for lint findings */
export type LintSeverity = "critical" | "warning" | "info";

/** A single finding produced by a lint rule */
export interface LintFinding {
  readonly rule_id: string;
  readonly severity: LintSeverity;
  readonly affected_nodes: readonly string[];
  readonly message: string;
  readonly suggested_fix: string;
}

/** A complete lint report from one scan */
export interface LintReport {
  readonly id: string;
  readonly institution_id: string;
  readonly findings: readonly LintFinding[];
  readonly total_findings: number;
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly mode: "delta" | "full";
  readonly duration_ms: number;
  readonly created_at: string;
}

/** Per-institution configuration for a lint rule */
export interface LintRuleConfig {
  readonly rule_id: string;
  readonly enabled: boolean;
  readonly severity_override?: LintSeverity;
  readonly threshold?: number;
}

/** Interface that all lint rules must implement */
export interface LintRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default_severity: LintSeverity;
  execute(context: LintContext): Promise<readonly LintFinding[]>;
}

/** Context passed to each lint rule during execution */
export interface LintContext {
  readonly institution_id: string;
  readonly mode: "delta" | "full";
  readonly since?: string; // ISO date for delta mode
}
```

---

## 4. Database Schema

```sql
-- Migration: create_lint_tables

-- Lint scan reports
CREATE TABLE lint_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    findings JSONB NOT NULL DEFAULT '[]',
    total_findings INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    info_count INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL CHECK (mode IN ('delta', 'full')),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lint_reports_institution ON lint_reports(institution_id);
CREATE INDEX idx_lint_reports_created_at ON lint_reports(created_at DESC);

-- Per-institution rule configuration
CREATE TABLE lint_rule_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    rule_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    severity_override TEXT CHECK (severity_override IS NULL OR severity_override IN ('critical', 'warning', 'info')),
    threshold FLOAT,
    UNIQUE(institution_id, rule_id)
);
```

**Existing tables queried by rules:**
```
assessment_items (
  id UUID PK, course_id UUID FK, status TEXT, quality_score FLOAT,
  bloom_level TEXT, usmle_system TEXT, difficulty TEXT,
  question_type TEXT, generation_session_id UUID,
  tags JSONB, tag_confidences JSONB,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)

slos (id UUID PK, course_id UUID FK, ...)
ilos (id UUID PK, ...)
courses (id UUID PK, institution_id UUID FK, ...)
```

**Neo4j nodes queried by rules:**
```
(SubConcept {id, name, institution_id})
(SubConcept)-[:TEACHES]->(Course)
(SubConcept)-[:HAS_EMBEDDING {vector: [1024-dim]})
```

---

## 5. API Contract

### GET /api/v1/institution/lint/reports (Auth: InstitutionalAdmin only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 10 | Max reports to return (max 50) |

**Success Response (200):**
```json
{
  "data": {
    "reports": [
      {
        "id": "report-uuid-1",
        "institution_id": "inst-uuid-1",
        "total_findings": 14,
        "critical_count": 2,
        "warning_count": 8,
        "info_count": 4,
        "mode": "full",
        "duration_ms": 3420,
        "created_at": "2026-02-19T03:00:00Z"
      }
    ]
  },
  "error": null
}
```

### GET /api/v1/institution/lint/reports/:id (Auth: InstitutionalAdmin only)

**Success Response (200):**
```json
{
  "data": {
    "id": "report-uuid-1",
    "institution_id": "inst-uuid-1",
    "findings": [
      {
        "rule_id": "orphan-concepts",
        "severity": "warning",
        "affected_nodes": ["subconcept-uuid-1", "subconcept-uuid-2"],
        "message": "2 SubConcept nodes have no TEACHES edges",
        "suggested_fix": "Link these SubConcepts to a course or delete if unused"
      },
      {
        "rule_id": "dangling-slo",
        "severity": "critical",
        "affected_nodes": ["slo-uuid-1"],
        "message": "1 SLO references a non-existent course",
        "suggested_fix": "Update the SLO's course_id to a valid course or delete the SLO"
      }
    ],
    "total_findings": 14,
    "critical_count": 2,
    "warning_count": 8,
    "info_count": 4,
    "mode": "full",
    "duration_ms": 3420,
    "created_at": "2026-02-19T03:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/institution/lint/run (Auth: InstitutionalAdmin only)

**Request Body:**
```json
{
  "mode": "full"
}
```

**Success Response (201):**
```json
{
  "data": {
    "report_id": "report-uuid-new",
    "total_findings": 7,
    "critical_count": 1,
    "warning_count": 4,
    "info_count": 2,
    "duration_ms": 2890
  },
  "error": null
}
```

### GET /api/v1/institution/lint/config (Auth: InstitutionalAdmin only)

**Success Response (200):**
```json
{
  "data": {
    "rules": [
      {
        "rule_id": "orphan-concepts",
        "name": "Orphan Concepts",
        "description": "SubConcept nodes with no TEACHES edges",
        "default_severity": "warning",
        "enabled": true,
        "severity_override": null,
        "threshold": null
      },
      {
        "rule_id": "embedding-drift",
        "name": "Embedding Drift",
        "description": "Embeddings diverged from baseline",
        "default_severity": "warning",
        "enabled": true,
        "severity_override": null,
        "threshold": 0.15
      }
    ]
  },
  "error": null
}
```

### PATCH /api/v1/institution/lint/config/:ruleId (Auth: InstitutionalAdmin only)

**Request Body:**
```json
{
  "enabled": false,
  "severity_override": "critical",
  "threshold": 0.2
}
```

**Success Response (200):**
```json
{
  "data": {
    "rule_id": "embedding-drift",
    "enabled": false,
    "severity_override": "critical",
    "threshold": 0.2
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin role |
| 400 | `VALIDATION_ERROR` | Invalid mode, rule_id, or config values |
| 404 | `NOT_FOUND` | Report or rule not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

No frontend components in this story. The lint results UI is in STORY-IA-37 (which this story blocks). This story only builds the backend engine, API, and database.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/kaizen/lint.types.ts` | Types | Create |
| 2 | `packages/types/src/kaizen/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add kaizen barrel) |
| 4 | Supabase migration via MCP (lint_reports + lint_rule_configs) | Database | Apply |
| 5 | `apps/server/src/errors/kaizen.error.ts` | Errors | Create |
| 6 | `apps/server/src/models/lint-report.model.ts` | Model | Create |
| 7 | `apps/server/src/repositories/lint-report.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/kaizen/rules/orphan-concepts.rule.ts` | Service | Create |
| 9 | `apps/server/src/services/kaizen/rules/dangling-slo.rule.ts` | Service | Create |
| 10 | `apps/server/src/services/kaizen/rules/embedding-drift.rule.ts` | Service | Create |
| 11 | `apps/server/src/services/kaizen/rules/stale-items.rule.ts` | Service | Create |
| 12 | `apps/server/src/services/kaizen/rules/tag-inconsistency.rule.ts` | Service | Create |
| 13 | `apps/server/src/services/kaizen/rules/duplicate-mappings.rule.ts` | Service | Create |
| 14 | `apps/server/src/services/kaizen/rules/missing-provenance.rule.ts` | Service | Create |
| 15 | `apps/server/src/services/kaizen/rules/score-skew.rule.ts` | Service | Create |
| 16 | `apps/server/src/services/kaizen/rules/low-confidence-tags.rule.ts` | Service | Create |
| 17 | `apps/server/src/services/kaizen/lint-engine.service.ts` | Service | Create |
| 18 | `apps/server/src/services/kaizen/lint-rule-registry.service.ts` | Service | Create |
| 19 | `apps/server/src/controllers/kaizen/lint.controller.ts` | Controller | Create |
| 20 | `apps/server/src/index.ts` | Routes | Edit (add 5 lint routes) |
| 21 | `apps/server/src/services/kaizen/__tests__/lint-engine.service.test.ts` | Tests | Create |
| 22 | `apps/server/src/services/kaizen/rules/__tests__/orphan-concepts.rule.test.ts` | Tests | Create |
| 23 | `apps/server/src/services/kaizen/rules/__tests__/dangling-slo.rule.test.ts` | Tests | Create |
| 24 | `apps/server/src/services/kaizen/rules/__tests__/stale-items.rule.test.ts` | Tests | Create |
| 25 | `apps/server/src/controllers/kaizen/__tests__/lint.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-5 | institutional_admin | **PENDING** | Admin Dashboard Page (provides the UI shell for lint access) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `zod` -- Request body/query validation
- `neo4j-driver` -- Neo4j queries for graph-based rules

### NPM Packages (may need install)
- None. All dependencies are already in the server workspace.

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for graph queries
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`, `rbac.require()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock Faculty user (should be denied)
export const FACULTY_USER = {
  ...INST_ADMIN_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
};

// Mock lint context for full scan
export const MOCK_LINT_CONTEXT_FULL = {
  institution_id: "inst-uuid-1",
  mode: "full" as const,
};

// Mock lint context for delta scan
export const MOCK_LINT_CONTEXT_DELTA = {
  institution_id: "inst-uuid-1",
  mode: "delta" as const,
  since: "2026-02-18T00:00:00Z",
};

// Mock findings
export const MOCK_FINDINGS = [
  {
    rule_id: "orphan-concepts",
    severity: "warning" as const,
    affected_nodes: ["subconcept-uuid-1", "subconcept-uuid-2"],
    message: "2 SubConcept nodes have no TEACHES edges",
    suggested_fix: "Link these SubConcepts to a course or delete if unused",
  },
  {
    rule_id: "dangling-slo",
    severity: "critical" as const,
    affected_nodes: ["slo-uuid-1"],
    message: "1 SLO references a non-existent course",
    suggested_fix: "Update the SLO's course_id to a valid course or delete the SLO",
  },
  {
    rule_id: "stale-items",
    severity: "info" as const,
    affected_nodes: ["item-uuid-1", "item-uuid-2", "item-uuid-3"],
    message: "3 assessment items have not been updated in over 90 days",
    suggested_fix: "Review and update stale items or mark them as archived",
  },
];

// Mock lint report
export const MOCK_LINT_REPORT = {
  id: "report-uuid-1",
  institution_id: "inst-uuid-1",
  findings: MOCK_FINDINGS,
  total_findings: 3,
  critical_count: 1,
  warning_count: 1,
  info_count: 1,
  mode: "full" as const,
  duration_ms: 3420,
  created_at: "2026-02-19T03:00:00Z",
};

// Mock rule configs
export const MOCK_RULE_CONFIGS = [
  { rule_id: "orphan-concepts", enabled: true, severity_override: undefined, threshold: undefined },
  { rule_id: "dangling-slo", enabled: true, severity_override: undefined, threshold: undefined },
  { rule_id: "embedding-drift", enabled: true, severity_override: undefined, threshold: 0.15 },
  { rule_id: "stale-items", enabled: true, severity_override: undefined, threshold: 90 },
  { rule_id: "tag-inconsistency", enabled: true, severity_override: undefined, threshold: undefined },
  { rule_id: "duplicate-mappings", enabled: true, severity_override: undefined, threshold: undefined },
  { rule_id: "missing-provenance", enabled: false, severity_override: undefined, threshold: undefined },
  { rule_id: "score-skew", enabled: true, severity_override: undefined, threshold: 0.05 },
  { rule_id: "low-confidence-tags", enabled: true, severity_override: undefined, threshold: 0.5 },
];

// Mock empty report
export const MOCK_EMPTY_REPORT = {
  id: "report-uuid-2",
  institution_id: "inst-uuid-1",
  findings: [],
  total_findings: 0,
  critical_count: 0,
  warning_count: 0,
  info_count: 0,
  mode: "full" as const,
  duration_ms: 1200,
  created_at: "2026-02-19T03:00:00Z",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/kaizen/__tests__/lint-engine.service.test.ts`

```
describe("LintEngineService")
  describe("runScan")
    it("executes all enabled rules and returns aggregated report")
    it("skips disabled rules based on institution config")
    it("applies severity_override from config when present")
    it("passes delta mode with since timestamp to rules")
    it("passes full mode without since timestamp to rules")
    it("saves report to repository after scan completes")
    it("records duration_ms accurately")
    it("continues execution when a single rule throws an error")
    it("logs error and returns partial findings when rule fails")
    it("returns empty findings when no rules produce findings")
```

**File:** `apps/server/src/services/kaizen/rules/__tests__/orphan-concepts.rule.test.ts`

```
describe("OrphanConceptsRule")
  it("returns findings for SubConcepts with no TEACHES edges")
  it("returns empty findings when all SubConcepts have TEACHES edges")
  it("respects institution_id scope")
```

**File:** `apps/server/src/services/kaizen/rules/__tests__/dangling-slo.rule.test.ts`

```
describe("DanglingSloRule")
  it("returns critical finding for SLOs with invalid course_id")
  it("returns empty findings when all SLOs have valid course references")
```

**File:** `apps/server/src/services/kaizen/rules/__tests__/stale-items.rule.test.ts`

```
describe("StaleItemsRule")
  it("returns findings for items not updated in over 90 days")
  it("returns empty findings when all items are recent")
  it("respects custom threshold from config")
```

**File:** `apps/server/src/controllers/kaizen/__tests__/lint.controller.test.ts`

```
describe("LintController")
  describe("handleListReports")
    it("returns 200 with paginated report list for InstitutionalAdmin")
    it("returns 403 for non-InstitutionalAdmin roles")
  describe("handleRunScan")
    it("returns 201 with scan summary after successful full scan")
    it("returns 400 when mode is invalid")
  describe("handleUpdateConfig")
    it("returns 200 with updated config for valid rule_id")
```

**Total: ~23 tests** (10 engine + 8 rule + 5 controller)

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The lint engine is backend-only. E2E tests will be added in STORY-IA-37 (Lint Results UI) which depends on this story.

---

## 12. Acceptance Criteria

1. InstitutionalAdmin can trigger a manual full scan via `POST /api/v1/institution/lint/run`
2. Non-InstitutionalAdmin roles receive 403 Forbidden on all lint endpoints
3. All 9 rules execute during a full scan without errors
4. Delta mode only checks nodes modified since the `since` timestamp
5. Each finding includes rule_id, severity, affected_nodes, message, and suggested_fix
6. Report is saved to `lint_reports` table with correct aggregated counts
7. Duration is measured and stored in milliseconds
8. Individual rule errors do not crash the entire scan -- engine logs error and continues
9. Disabled rules (via `lint_rule_configs`) are skipped during scan
10. Severity can be overridden per rule per institution
11. Threshold can be configured for rules that support it (embedding-drift, stale-items, score-skew, low-confidence-tags)
12. `GET /api/v1/institution/lint/reports` returns reports sorted by created_at descending
13. `GET /api/v1/institution/lint/reports/:id` returns full findings detail
14. `GET /api/v1/institution/lint/config` returns all 9 rules with current config
15. `PATCH /api/v1/institution/lint/config/:ruleId` updates rule config
16. All ~23 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| KaizenML lint concept | ARCHITECTURE_v10 5.3: KaizenML Pipeline |
| 9 lint rules | S-IA-37-1 Acceptance Criteria |
| Orphan concept detection | E-37 KaizenML Linting epic description |
| Embedding drift threshold | ARCHITECTURE_v10 embedding specs (1024-dim, cosine distance) |
| Delta mode | S-IA-37-1 Task Breakdown |
| Nightly Inngest schedule | ARCHITECTURE_v10 5.3: background jobs |
| lint_reports schema | S-IA-37-1 Database Design |
| Rule configurability | UF-27 Admin Dashboard & Data Integrity |
| RBAC enforcement | STORY-U-6 Brief Implementation Notes |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions`, `assessment_items`, `slos`, `courses` tables exist
- **Neo4j:** Running for graph-based rules (orphan-concepts, embedding-drift)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **No frontend needed** for this story (backend-only)

---

## 15. Implementation Notes

- **Registry pattern:** `LintRuleRegistryService` holds all 9 rule instances. Rules are registered during server startup. The registry is injected into `LintEngineService` via constructor DI. This allows easy addition of new rules without modifying the engine.
- **Rule interface:** Each rule implements `LintRule` with a `execute(context: LintContext)` method. Rules are stateless -- all state comes from the context. Rules must not throw on expected empty results; they return an empty array.
- **Error isolation:** The engine wraps each `rule.execute()` in a try/catch. If a rule throws, the engine logs the error with the rule_id and continues to the next rule. The report will note which rules failed.
- **Delta mode for Supabase rules:** Filter by `updated_at >= $since`. For Neo4j rules: filter by node `updated_at` property if available, otherwise fall back to full scan.
- **Score skew detection:** Use a simplified skewness calculation (not full Shapiro-Wilk). Compute skewness = n * sum((x - mean)^3) / ((n-1)(n-2) * std^3). Flag if |skewness| > threshold (default 1.0).
- **Embedding drift:** Compare current embedding vectors against a baseline snapshot. At MVP, the baseline is the embedding value at creation time (stored in Neo4j). Cosine distance = 1 - cosine_similarity. Flag if distance > threshold (default 0.15).
- **Private fields pattern:** All service/repository classes use `readonly #supabaseClient: SupabaseClient` and `readonly #neo4jClient: Neo4jClientConfig` with constructor DI per architecture rules.
- **Findings JSONB:** The `findings` column in `lint_reports` stores the full array as JSONB. This avoids a separate findings table and simplifies queries. The trade-off is that individual findings are not queryable via SQL -- acceptable at this scale.
- **Inngest wiring:** The nightly cron trigger (`0 3 * * *`) is NOT wired in this story. The engine exposes `runScan()` which the Inngest handler will call. Inngest integration is infrastructure (universal lane) and will be wired separately.
