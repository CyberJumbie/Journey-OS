# STORY-F-56 Brief: Review Router

## 0. Lane & Priority

```yaml
story_id: STORY-F-56
old_id: S-F-22-2
lane: faculty
lane_priority: 3
within_lane_order: 56
sprint: 13
size: M
depends_on:
  - STORY-F-53 (faculty) — Critic Agent Service exists
blocks: []
personas_served: [faculty]
epic: E-22 (Critic Agent & Review Router)
feature: F-10 (Quality Assurance Pipeline)
```

## 1. Summary

Build a **review router service** that automatically routes questions based on critic scores to one of three outcomes: `auto_approve` (composite >= 4.2), `route_to_review` (2.5-4.2), or `auto_reject` (< 2.5). Thresholds are configurable per institution and per question type. Auto-approved items get `approved` status with an audit trail. Auto-rejected items get `rejected` status with critic justification as the reason. Items routed to review are assigned to the review queue with priority based on score (lower composite = higher review priority, 1-5 scale). All routing decisions are logged with full provenance: critic scores, thresholds applied, and outcome.

Key constraints:
- Three routing outcomes with configurable thresholds
- Thresholds can be asymmetric per institution (stricter approve, lenient reject)
- Auto-approved items still appear in review history for audit
- Review queue priority 1 (highest) to 5 (lowest) from composite score buckets
- Status transitions: `validated` -> `scoring` -> `auto_approved` | `pending_review` | `auto_rejected`
- Custom error class: `RoutingError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `RoutingDecision`, `RoutingOutcome`, `RoutingThresholds`, `ReviewQueueItem` in `packages/types/src/review/`
2. **Error class** -- `RoutingError` in `apps/server/src/errors/router.errors.ts`
3. **Review queue repository** -- `ReviewQueueRepository` for queue persistence
4. **Review router service** -- `ReviewRouterService` with threshold-based routing logic
5. **API tests** -- 8-12 tests covering each outcome, threshold edge cases, config override, priority, audit
6. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/router.types.ts

import { CriticResult } from "./critic.types";

/** Routing outcome */
export type RoutingOutcome = "auto_approve" | "route_to_review" | "auto_reject";

/** Question status after routing */
export type RoutedQuestionStatus = "auto_approved" | "pending_review" | "auto_rejected";

/** Routing thresholds configuration */
export interface RoutingThresholds {
  readonly auto_approve_min: number;    // composite >= this -> auto_approve (default 4.2)
  readonly auto_reject_max: number;     // composite < this -> auto_reject (default 2.5)
  // Between auto_reject_max and auto_approve_min -> route_to_review
}

/** Routing thresholds per question type */
export interface RoutingConfig {
  readonly institution_id: string;
  readonly default_thresholds: RoutingThresholds;
  readonly type_overrides: Record<string, RoutingThresholds>; // keyed by question_type
}

/** Review priority (1 = highest, 5 = lowest) */
export type ReviewPriority = 1 | 2 | 3 | 4 | 5;

/** Complete routing decision with audit trail */
export interface RoutingDecision {
  readonly question_id: string;
  readonly outcome: RoutingOutcome;
  readonly status: RoutedQuestionStatus;
  readonly composite_score: number;
  readonly thresholds_applied: RoutingThresholds;
  readonly critic_result_id: string;
  readonly review_priority: ReviewPriority | null;
  readonly rejection_reason: string | null;
  readonly routed_at: string;
}

/** Item in the review queue */
export interface ReviewQueueItem {
  readonly id: string;
  readonly question_id: string;
  readonly institution_id: string;
  readonly priority: ReviewPriority;
  readonly composite_score: number;
  readonly critic_result_id: string;
  readonly assigned_to: string | null;
  readonly status: "pending" | "in_review" | "completed";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Audit trail entry for routing */
export interface RoutingAuditEntry {
  readonly id: string;
  readonly question_id: string;
  readonly outcome: RoutingOutcome;
  readonly composite_score: number;
  readonly thresholds: RoutingThresholds;
  readonly critic_scores: Record<string, number>;
  readonly routed_by: "system";
  readonly routed_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_review_queue_and_routing_audit_tables

CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  institution_id UUID NOT NULL,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  composite_score NUMERIC(3,2) NOT NULL,
  critic_result_id UUID NOT NULL REFERENCES critic_results(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routing_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('auto_approve', 'route_to_review', 'auto_reject')),
  composite_score NUMERIC(3,2) NOT NULL,
  thresholds JSONB NOT NULL,
  critic_scores JSONB NOT NULL,
  routed_by TEXT NOT NULL DEFAULT 'system',
  routed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_review_queue_institution_priority ON review_queue(institution_id, priority) WHERE status = 'pending';
CREATE INDEX idx_review_queue_assigned_to ON review_queue(assigned_to) WHERE status = 'in_review';
CREATE INDEX idx_review_queue_question_id ON review_queue(question_id);
CREATE INDEX idx_routing_audit_question_id ON routing_audit(question_id);
CREATE INDEX idx_routing_audit_outcome ON routing_audit(outcome);

-- RLS
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view review queue for their institution"
  ON review_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.institution_id = review_queue.institution_id
    )
  );

CREATE POLICY "Faculty can view routing audit for their questions"
  ON routing_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = routing_audit.question_id
      AND q.created_by = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/questions/:questionId/route (Auth: faculty)

Triggers routing for a scored question.

**Success Response (200):**
```json
{
  "data": {
    "question_id": "question-uuid-1",
    "outcome": "route_to_review",
    "status": "pending_review",
    "composite_score": 3.85,
    "thresholds_applied": {
      "auto_approve_min": 4.2,
      "auto_reject_max": 2.5
    },
    "critic_result_id": "critic-uuid-1",
    "review_priority": 2,
    "rejection_reason": null,
    "routed_at": "2026-02-19T14:35:00Z"
  },
  "error": null
}
```

**Auto-approve response (200):**
```json
{
  "data": {
    "question_id": "question-uuid-2",
    "outcome": "auto_approve",
    "status": "auto_approved",
    "composite_score": 4.5,
    "thresholds_applied": { "auto_approve_min": 4.2, "auto_reject_max": 2.5 },
    "critic_result_id": "critic-uuid-2",
    "review_priority": null,
    "rejection_reason": null,
    "routed_at": "2026-02-19T14:35:00Z"
  },
  "error": null
}
```

**Auto-reject response (200):**
```json
{
  "data": {
    "question_id": "question-uuid-3",
    "outcome": "auto_reject",
    "status": "auto_rejected",
    "composite_score": 2.1,
    "thresholds_applied": { "auto_approve_min": 4.2, "auto_reject_max": 2.5 },
    "critic_result_id": "critic-uuid-3",
    "review_priority": null,
    "rejection_reason": "Low clinical accuracy (1/5) and poor distractor quality (2/5). Significant item-writing flaws detected.",
    "routed_at": "2026-02-19T14:35:00Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Question or critic result not found |
| 500 | `ROUTING_ERROR` | Unexpected routing failure |

## 6. Frontend Spec

No frontend components in this story. Routing decisions are displayed in the review queue UI in later stories.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/router.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Edit (add router exports) |
| 3 | `apps/server/src/errors/router.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 5 | Supabase migration: `review_queue` and `routing_audit` tables | Database | Apply via MCP |
| 6 | `apps/server/src/repositories/review-queue.repository.ts` | Repository | Create |
| 7 | `apps/server/src/services/review/review-router.service.ts` | Service | Create |
| 8 | `apps/server/src/__tests__/review/review-router.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-53 | faculty | Pending | Critic agent must exist (router uses critic scores) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- No new packages required.

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/server/src/services/review/critic-agent.service.ts` -- Critic results (from STORY-F-53)

## 9. Test Fixtures (inline)

```typescript
import type { RoutingDecision, RoutingThresholds, RoutingConfig, ReviewQueueItem } from "@journey-os/types";
import type { CriticResult } from "@journey-os/types";

// Default thresholds
export const DEFAULT_THRESHOLDS: RoutingThresholds = {
  auto_approve_min: 4.2,
  auto_reject_max: 2.5,
};

// Strict institution thresholds
export const STRICT_THRESHOLDS: RoutingThresholds = {
  auto_approve_min: 4.5,
  auto_reject_max: 3.0,
};

// Routing config with type overrides
export const CUSTOM_ROUTING_CONFIG: RoutingConfig = {
  institution_id: "inst-uuid-1",
  default_thresholds: DEFAULT_THRESHOLDS,
  type_overrides: {
    "extended_matching": { auto_approve_min: 4.5, auto_reject_max: 3.0 },
  },
};

// High-scoring critic result (auto-approve)
export const HIGH_SCORE_CRITIC: Partial<CriticResult> = {
  question_id: "question-uuid-1",
  composite_score: 4.5,
  composite_justification: "Excellent question across all metrics.",
};

// Mid-scoring critic result (route to review)
export const MID_SCORE_CRITIC: Partial<CriticResult> = {
  question_id: "question-uuid-2",
  composite_score: 3.85,
  composite_justification: "Good question, distractor quality could improve.",
};

// Low-scoring critic result (auto-reject)
export const LOW_SCORE_CRITIC: Partial<CriticResult> = {
  question_id: "question-uuid-3",
  composite_score: 2.1,
  composite_justification: "Significant item-writing flaws. Low clinical accuracy.",
};

// Edge case: exactly at auto_approve threshold
export const THRESHOLD_EXACT_APPROVE: Partial<CriticResult> = {
  question_id: "question-uuid-4",
  composite_score: 4.2,
};

// Edge case: exactly at auto_reject threshold
export const THRESHOLD_EXACT_REJECT: Partial<CriticResult> = {
  question_id: "question-uuid-5",
  composite_score: 2.5,
};

// Mock routing decisions
export const AUTO_APPROVE_DECISION: RoutingDecision = {
  question_id: "question-uuid-1",
  outcome: "auto_approve",
  status: "auto_approved",
  composite_score: 4.5,
  thresholds_applied: DEFAULT_THRESHOLDS,
  critic_result_id: "critic-uuid-1",
  review_priority: null,
  rejection_reason: null,
  routed_at: "2026-02-19T14:35:00Z",
};

export const ROUTE_TO_REVIEW_DECISION: RoutingDecision = {
  question_id: "question-uuid-2",
  outcome: "route_to_review",
  status: "pending_review",
  composite_score: 3.85,
  thresholds_applied: DEFAULT_THRESHOLDS,
  critic_result_id: "critic-uuid-2",
  review_priority: 2,
  rejection_reason: null,
  routed_at: "2026-02-19T14:35:00Z",
};

export const AUTO_REJECT_DECISION: RoutingDecision = {
  question_id: "question-uuid-3",
  outcome: "auto_reject",
  status: "auto_rejected",
  composite_score: 2.1,
  thresholds_applied: DEFAULT_THRESHOLDS,
  critic_result_id: "critic-uuid-3",
  review_priority: null,
  rejection_reason: "Low clinical accuracy and poor distractor quality.",
  routed_at: "2026-02-19T14:35:00Z",
};

// Mock review queue item
export const REVIEW_QUEUE_ITEM: ReviewQueueItem = {
  id: "rq-uuid-1",
  question_id: "question-uuid-2",
  institution_id: "inst-uuid-1",
  priority: 2,
  composite_score: 3.85,
  critic_result_id: "critic-uuid-2",
  assigned_to: null,
  status: "pending",
  created_at: "2026-02-19T14:35:00Z",
  updated_at: "2026-02-19T14:35:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/review-router.test.ts`

```
describe("ReviewRouterService")
  describe("route")
    > auto-approves question with composite >= 4.2
    > routes to review queue with composite between 2.5 and 4.2
    > auto-rejects question with composite < 2.5
    > includes rejection reason from critic justification for auto-reject
    > creates routing audit entry for every decision

  describe("threshold edge cases")
    > auto-approves at exact threshold (composite = 4.2)
    > routes to review at exact reject threshold (composite = 2.5)

  describe("configuration")
    > uses default thresholds when no institution config
    > applies institution-specific thresholds
    > applies question-type-specific threshold overrides

  describe("review priority")
    > assigns priority 1 for scores 2.5-3.0
    > assigns priority 2 for scores 3.0-3.5
    > assigns priority 3 for scores 3.5-3.8
    > assigns priority 4 for scores 3.8-4.0
    > assigns priority 5 for scores 4.0-4.2

  describe("audit trail")
    > logs full provenance (critic scores, thresholds, outcome)
    > auto-approved items appear in audit trail
```

**Total: ~17 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The review router is a server-side service. E2E coverage will be added with the review queue UI.

## 12. Acceptance Criteria

1. Router auto-approves questions with composite >= 4.2
2. Router routes questions with composite 2.5-4.2 to review queue
3. Router auto-rejects questions with composite < 2.5
4. Thresholds configurable per institution and per question type
5. Auto-approve writes `auto_approved` status with audit trail
6. Auto-reject writes `auto_rejected` status with critic justification as reason
7. Route-to-review assigns to queue with priority based on score (lower = higher priority)
8. Priority: 1-5 scale derived from composite score buckets
9. Every routing decision logged in `routing_audit` table with full provenance
10. `RoutingError` extends `JourneyOSError`
11. All 17 API tests pass
12. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| Three routing outcomes | S-F-22-2 Acceptance Criteria |
| Thresholds: 4.2 auto-approve, 2.5 auto-reject | S-F-22-2 Acceptance Criteria |
| Configurable per institution and question type | S-F-22-2 Acceptance Criteria |
| Priority 1-5 from score buckets | S-F-22-2 Notes: "priority: 1 (highest) to 5 (lowest)" |
| Auto-approved in review history | S-F-22-2 Notes: "still appear in review history for audit" |
| Status transitions | S-F-22-2 Notes: "validated -> scoring -> auto_approved | pending_review | auto_rejected" |
| Asymmetric thresholds | S-F-22-2 Notes: "institutions may want asymmetric thresholds" |
| Blocks S-F-23-1 | S-F-22-2 Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `critic_results` table exists (from STORY-F-53)
- **Express:** Server running on port 3001
- **No Neo4j needed** for this story
- **No new NPM packages required**

## 15. Implementation Notes

- **ReviewRouterService:** OOP class with `#supabaseClient`, `#reviewQueueRepo`, `#criticAgent` injected via constructor DI. `route(questionId, criticResultId)` method: (1) fetch CriticResult, (2) load institution thresholds, (3) apply question-type override if exists, (4) compare composite score to thresholds, (5) determine outcome, (6) compute review priority if routed, (7) execute action (update status, add to queue, log audit).
- **Priority calculation:** `getPriority(score: number): ReviewPriority`. Buckets: 2.5-3.0 -> 1, 3.0-3.5 -> 2, 3.5-3.8 -> 3, 3.8-4.0 -> 4, 4.0-4.2 -> 5. Use `Math.ceil()` or bucket lookup.
- **ReviewQueueRepository:** OOP class wrapping Supabase queries for `review_queue` table. Methods: `add(item)`, `getByInstitution(institutionId, status?, page?)`, `assignTo(queueId, userId)`, `updateStatus(queueId, status)`.
- **Audit logging:** Every routing decision creates a row in `routing_audit` with the critic scores object, thresholds used, and outcome. Auto-approved items are logged the same as routed items.
- **Threshold loading:** Check `institution_settings` JSONB for `routing_thresholds`. If not found, use defaults. Check for `type_overrides[question.type]`.
- **vi.hoisted() for mocks:** Supabase client mock must use `vi.hoisted()`.
- **No default exports:** All services, repositories, types, and error classes use named exports only.
