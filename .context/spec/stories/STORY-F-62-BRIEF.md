# STORY-F-62 Brief: Self-Review Mode

## 0. Lane & Priority

```yaml
story_id: STORY-F-62
old_id: S-F-23-4
lane: faculty
lane_priority: 3
within_lane_order: 62
sprint: 13
size: S
depends_on:
  - STORY-F-58 (faculty) — Review Queue List Page (queue must exist)
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-23 (Faculty Review UI)
feature: F-10
user_flow: UF-14 (Faculty Review Workflow)
```

## 1. Summary

Build a **self-review mode** that activates when a faculty member reviews a question they themselves generated. Self-review is common in smaller programs where faculty numbers are limited. The mode applies appropriate restrictions: self-reviewed approvals are marked `self_approved` (distinct from `approved`), which may require secondary review based on the institution's automation level configuration. Self-reviewers cannot change critic scores (read-only). Institutions can enable or disable self-review entirely via a setting in `institution_settings`.

Key constraints:
- Detection: compare `question.generated_by` with `request.user.id`
- `self_approved` is a distinct status from `approved` (useful for audit reports)
- Critic scores read-only in self-review mode
- Institution toggle to enable/disable self-review
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `SelfReviewConfig`, `SelfReviewDetection` in `packages/types/src/review/`
2. **Service** -- `SelfReviewService` with `isSelfReview()`, `validateSelfReviewAction()`, institution toggle check
3. **Middleware integration** -- Hook into `ReviewActionService` to detect and enforce self-review constraints
4. **Institution setting** -- Add `self_review_enabled` to institution settings (default: true)
5. **View -- SelfReviewBanner** -- Visual banner component with different styling
6. **API tests** -- 7 tests covering detection, restricted actions, self_approved status, institution toggle
7. **Exports** -- Register types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/self-review.types.ts

/** Self-review configuration per institution */
export interface SelfReviewConfig {
  readonly institution_id: string;
  readonly self_review_enabled: boolean;
  readonly require_secondary_review: boolean;
  readonly updated_at: string;
}

/** Self-review detection result */
export interface SelfReviewDetection {
  readonly is_self_review: boolean;
  readonly question_id: string;
  readonly generator_id: string;
  readonly reviewer_id: string;
}

/** Self-review action constraints */
export interface SelfReviewConstraints {
  readonly can_approve: boolean;
  readonly approval_status: "self_approved";
  readonly can_modify_critic_scores: false;
  readonly can_comment: true;
  readonly require_secondary_review: boolean;
}

/** Update self-review settings request */
export interface UpdateSelfReviewConfigRequest {
  readonly self_review_enabled: boolean;
  readonly require_secondary_review?: boolean;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: add_self_review_settings

-- Add self-review columns to institution_settings
ALTER TABLE institution_settings
  ADD COLUMN IF NOT EXISTS self_review_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE institution_settings
  ADD COLUMN IF NOT EXISTS require_secondary_review_for_self BOOLEAN NOT NULL DEFAULT true;

-- Add self_approved to the questions status check constraint
-- (Assumes questions table has a status column with CHECK constraint)
-- If using a CHECK constraint, update it:
ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS questions_review_status_check;

ALTER TABLE questions
  ADD CONSTRAINT questions_review_status_check
  CHECK (review_status IN (
    'draft', 'validating', 'validated', 'in_review',
    'approved', 'self_approved', 'rejected', 'revision_requested', 'revised', 'archived'
  ));
```

## 5. API Contract (complete request/response)

### GET /api/v1/review/questions/:questionId/self-review-status (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "is_self_review": true,
    "question_id": "q-uuid-1",
    "generator_id": "faculty-uuid-1",
    "reviewer_id": "faculty-uuid-1",
    "constraints": {
      "can_approve": true,
      "approval_status": "self_approved",
      "can_modify_critic_scores": false,
      "can_comment": true,
      "require_secondary_review": true
    }
  },
  "error": null
}
```

### GET /api/v1/admin/settings/self-review (Auth: institutional_admin, superadmin)

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "self_review_enabled": true,
    "require_secondary_review": true,
    "updated_at": "2026-02-15T10:00:00Z"
  },
  "error": null
}
```

### PUT /api/v1/admin/settings/self-review (Auth: institutional_admin, superadmin)

**Request Body:**
```json
{
  "self_review_enabled": false
}
```

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "self_review_enabled": false,
    "require_secondary_review": true,
    "updated_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Self-review disabled for institution / non-admin for settings |
| 404 | `NOT_FOUND` | Question not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: SelfReviewBanner (embedded in review detail page)

**File:** `apps/web/src/components/review/SelfReviewBanner.tsx`

```
SelfReviewBanner (molecule)
  ├── AlertTriangle icon (Lucide, amber)
  ├── Title: "Self-Review Mode"
  ├── Description: "You are reviewing a question you generated. Approvals will be marked as self-approved."
  └── Constraints list:
      ├── "Critic scores are read-only"
      ├── "Approval will be marked as 'self_approved'"
      └── "Secondary review may be required" (conditional)
```

**Design tokens:**
- Banner background: `--color-warning-bg` (light amber)
- Banner border: `--color-warning` (amber)
- Icon color: `--color-warning` (amber)
- Text: `--color-text-primary`

**Integration with ReviewActionBar:**
- When `is_self_review === true`, show `SelfReviewBanner` above the action bar
- Approve button label changes to "Self-Approve"
- CriticScoreCard components become read-only (no edit controls)

**States:**
1. **Not self-review** -- Banner hidden, normal review mode
2. **Self-review active** -- Banner visible, restricted controls
3. **Self-review disabled** -- Banner shows "Self-review is not permitted for this institution" + all actions disabled except comment

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/self-review.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Edit (add self-review export) |
| 3 | Supabase migration via MCP (self-review settings + status constraint) | Database | Apply |
| 4 | `apps/server/src/services/review/self-review.service.ts` | Service | Create |
| 5 | `apps/server/src/services/review/review-action.service.ts` | Service | Edit (integrate self-review checks) |
| 6 | `apps/server/src/controllers/review/automation-config.controller.ts` | Controller | Edit (add self-review settings endpoints) |
| 7 | `apps/server/src/routes/review.routes.ts` | Routes | Edit (add self-review status route) |
| 8 | `apps/server/src/routes/admin.routes.ts` | Routes | Edit (add self-review settings route) |
| 9 | `apps/web/src/components/review/SelfReviewBanner.tsx` | Molecule | Create |
| 10 | `apps/server/src/__tests__/review/self-review.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-58 | faculty | Pending | Review queue must exist |
| STORY-F-61 | faculty | Pending | Review actions must exist (self-review modifies action behavior) |
| STORY-F-60 | faculty | Pending | Automation config (secondary review based on automation level) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/services/review/review-action.service.ts` -- Must integrate self-review checks
- `apps/server/src/repositories/institution-settings.repository.ts` -- Read self-review config
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Faculty who is both generator and reviewer
export const SELF_REVIEW_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Question generated by the same faculty
export const SELF_GENERATED_QUESTION = {
  id: "q-uuid-1",
  generated_by_id: "faculty-uuid-1",
  assigned_reviewer_id: "faculty-uuid-1",
  status: "in_review" as const,
  course_id: "course-uuid-1",
};

// Question generated by a different faculty
export const OTHER_GENERATED_QUESTION = {
  id: "q-uuid-2",
  generated_by_id: "faculty-uuid-2",
  assigned_reviewer_id: "faculty-uuid-1",
  status: "in_review" as const,
  course_id: "course-uuid-1",
};

// Institution with self-review enabled
export const SELF_REVIEW_ENABLED_CONFIG = {
  institution_id: "inst-uuid-1",
  self_review_enabled: true,
  require_secondary_review: true,
  updated_at: "2026-02-15T10:00:00Z",
};

// Institution with self-review disabled
export const SELF_REVIEW_DISABLED_CONFIG = {
  ...SELF_REVIEW_ENABLED_CONFIG,
  self_review_enabled: false,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/self-review.test.ts`

```
describe("SelfReviewService")
  describe("isSelfReview")
    > returns true when reviewer_id matches generated_by_id
    > returns false when reviewer_id differs from generated_by_id

  describe("validateSelfReviewAction")
    > allows self-approve with self_approved status
    > prevents self-review actions when institution has self_review disabled
    > enforces read-only critic scores in self-review mode

  describe("institution settings")
    > returns self_review_enabled setting for institution
    > updates self_review_enabled setting
    > defaults to self_review_enabled=true for new institutions
```

**Total: ~8 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Self-review is a modifier on existing review actions; E2E coverage will be part of the full review workflow test.

## 12. Acceptance Criteria

1. Self-review mode activates when reviewer is same as question generator
2. Visual banner shows "Self-Review Mode" with distinct styling
3. Self-reviewed approvals marked as `self_approved` (distinct from `approved`)
4. `self_approved` items may require secondary review based on automation config
5. Critic scores are read-only in self-review mode
6. Comments still available for self-documentation
7. Institution setting to enable/disable self-review entirely
8. When disabled, self-review actions are blocked with appropriate error
9. All 8 API tests pass
10. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Self-review detection | S-F-23-4 SS Notes: "compare question.generated_by with request.user.id" |
| self_approved distinct status | S-F-23-4 SS Acceptance Criteria: "self_approved (distinct from approved)" |
| Critic scores read-only | S-F-23-4 SS Acceptance Criteria: "Self-reviewer cannot change critic scores" |
| Institution toggle | S-F-23-4 SS Acceptance Criteria: "Institution setting to enable/disable self-review entirely" |
| Small programs context | S-F-23-4 SS Notes: "Self-review is common in smaller programs where faculty numbers are limited" |
| Secondary review | S-F-23-4 SS Acceptance Criteria: "self_approved items may require secondary review based on automation level config" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `institution_settings`, `profiles` tables exist
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-58 (Review Queue):** Must be complete
- **STORY-F-61 (Review Actions):** Must be complete (self-review modifies action behavior)
- **No Neo4j needed** for this story

## 15. Figma Make Prototype

```
Frame: Self-Review Banner (1200x80, embedded in review detail page)
  ├── Warning Banner (full width, light amber background, amber left border 4px)
  │   ├── AlertTriangle icon (24px, amber)
  │   ├── Title: "Self-Review Mode" (bold, navy deep)
  │   ├── Description: "You are reviewing a question you generated."
  │   └── Constraints:
  │       ├── "Critic scores are read-only"
  │       └── "Approval will be marked as self-approved"
  └── Modified Action Bar
      └── ApproveButton label: "Self-Approve" (instead of "Approve")
```
