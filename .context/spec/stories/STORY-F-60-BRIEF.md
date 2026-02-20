# STORY-F-60 Brief: Automation Level Configuration

## 0. Lane & Priority

```yaml
story_id: STORY-F-60
old_id: S-F-22-3
lane: faculty
lane_priority: 3
within_lane_order: 60
sprint: 13
size: S
depends_on:
  - STORY-F-56 (faculty) — Review Router (must exist to respect automation level)
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-22 (Critic Agent & Review Router)
feature: F-10
user_flow: UF-14 (Faculty Review Workflow)
```

## 1. Summary

Build an **automation level configuration** that allows institutional admins to choose between three review automation modes: `full_auto`, `checkpoints`, and `manual`. The setting is stored per institution in the Supabase `institution_settings` table. The review router reads this configuration before applying routing logic. The UI is a settings page under the institutional admin dashboard with clear explanations of each level and its expected review volume impact. Only `institutional_admin` and `superadmin` roles can change this setting.

Key constraints:
- Three levels: `full_auto` (critic scores drive auto-approve/reject), `checkpoints` (auto-reject works, approvals require human), `manual` (all items routed to human)
- Default for new institutions: `checkpoints` (safe middle ground)
- Changing level does NOT retroactively affect items already in the queue
- Audit log entry when level is changed
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `AutomationLevel`, `AutomationConfig`, `AutomationLevelChangeRequest` in `packages/types/src/review/`
2. **Repository** -- Extend `InstitutionSettingsRepository` with automation level getter/setter
3. **Service** -- `AutomationConfigService` with `getLevel()`, `setLevel()`, audit logging
4. **Controller** -- `AutomationConfigController` with GET and PUT endpoints
5. **Routes** -- Register under `/api/v1/admin/settings/automation`
6. **View -- Page** -- Settings page with radio buttons and descriptions for each level
7. **API tests** -- 7 tests covering each level behavior, default fallback, persistence, audit
8. **Exports** -- Register types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/automation.types.ts

/** Automation level options */
export type AutomationLevel = "full_auto" | "checkpoints" | "manual";

/** Automation configuration for an institution */
export interface AutomationConfig {
  readonly institution_id: string;
  readonly level: AutomationLevel;
  readonly updated_at: string;
  readonly updated_by: string;
}

/** Request to change automation level */
export interface AutomationLevelChangeRequest {
  readonly level: AutomationLevel;
}

/** Response after changing level */
export interface AutomationLevelChangeResponse {
  readonly institution_id: string;
  readonly level: AutomationLevel;
  readonly previous_level: AutomationLevel;
  readonly updated_at: string;
  readonly updated_by: string;
}

/** Automation level metadata for UI display */
export interface AutomationLevelOption {
  readonly value: AutomationLevel;
  readonly label: string;
  readonly description: string;
  readonly review_volume_impact: string;
}

/** Audit log entry for automation level change */
export interface AutomationAuditEntry {
  readonly id: string;
  readonly institution_id: string;
  readonly actor_id: string;
  readonly previous_level: AutomationLevel;
  readonly new_level: AutomationLevel;
  readonly created_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: add_automation_level_to_institution_settings

-- Add automation_level column to institution_settings (or create the row pattern)
-- Using a key-value pattern in institution_settings table

-- If institution_settings uses a key-value pattern:
-- No DDL change needed, just insert/update rows with key='automation_level'

-- If institution_settings is a wide table, add column:
ALTER TABLE institution_settings
  ADD COLUMN IF NOT EXISTS automation_level TEXT NOT NULL DEFAULT 'checkpoints'
  CHECK (automation_level IN ('full_auto', 'checkpoints', 'manual'));

-- Audit log for automation level changes
CREATE TABLE IF NOT EXISTS automation_level_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  previous_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_audit_institution
  ON automation_level_audit(institution_id, created_at DESC);

-- RLS
ALTER TABLE automation_level_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log for their institution"
  ON automation_level_audit FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM profiles WHERE id = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### GET /api/v1/admin/settings/automation (Auth: institutional_admin, superadmin)

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "level": "checkpoints",
    "updated_at": "2026-02-15T10:00:00Z",
    "updated_by": "admin-uuid-1"
  },
  "error": null
}
```

### PUT /api/v1/admin/settings/automation (Auth: institutional_admin, superadmin)

**Request Body:**
```json
{
  "level": "full_auto"
}
```

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "level": "full_auto",
    "previous_level": "checkpoints",
    "updated_at": "2026-02-19T14:30:00Z",
    "updated_by": "admin-uuid-1"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 400 | `VALIDATION_ERROR` | Invalid automation level value |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-admin role |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/admin/settings/automation`

**File:** `apps/web/src/app/(dashboard)/admin/settings/automation/page.tsx`

```
AutomationSettingsPage
  ├── PageHeader ("Review Automation Settings")
  ├── CurrentLevelCard (molecule)
  │   └── Shows current level with last updated info
  ├── AutomationLevelSelector (organism)
  │   ├── RadioCard: "Full Automation" (molecule)
  │   │   ├── Label: "Full Automation"
  │   │   ├── Description: "Critic scores drive auto-approve and auto-reject. Minimal human touch."
  │   │   └── Impact: "Low review volume — only edge cases reach human review"
  │   ├── RadioCard: "Checkpoints" (molecule) — default, highlighted
  │   │   ├── Label: "Checkpoints (Recommended)"
  │   │   ├── Description: "Auto-reject works, but all approvals require human confirmation."
  │   │   └── Impact: "Medium review volume — rejections automated, approvals verified"
  │   └── RadioCard: "Manual Review" (molecule)
  │       ├── Label: "Manual Review"
  │       ├── Description: "All items route to human review regardless of critic scores."
  │       └── Impact: "High review volume — every question requires faculty review"
  ├── SaveButton (atom) — "Save Changes" (disabled until level changes)
  └── AuditNote (molecule) — "Note: Changing this setting will not affect items already in the review queue."
```

**Design tokens:**
- Selected card border: `--color-primary-navy` (#002c76)
- Recommended badge: `--color-success` (green #69a338)
- Impact text: `--color-text-muted`
- Card background: `--color-surface-white` (#ffffff)
- Page background: `--color-bg-cream` (#f5f3ef)

**States:**
1. **Loading** -- Skeleton cards while fetching current setting
2. **Idle** -- Current level displayed, save button disabled
3. **Changed** -- User selected different level, save button enabled
4. **Saving** -- Save button shows spinner
5. **Success** -- Toast confirmation: "Automation level updated"
6. **Error** -- Error banner with retry

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/automation.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Edit (add automation export) |
| 3 | Supabase migration via MCP (automation_level column + audit table) | Database | Apply |
| 4 | `apps/server/src/repositories/institution-settings.repository.ts` | Repository | Edit (add automation methods) |
| 5 | `apps/server/src/services/review/automation-config.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/review/automation-config.controller.ts` | Controller | Create |
| 7 | `apps/server/src/routes/admin.routes.ts` | Routes | Edit (add automation settings route) |
| 8 | `apps/web/src/app/(dashboard)/admin/settings/automation/page.tsx` | Page | Create |
| 9 | `apps/server/src/__tests__/review/automation-config.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-56 | faculty | Pending | Review router must exist to respect automation level |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for admin role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing for admin layout |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/repositories/institution-settings.repository.ts` -- Extend with automation methods
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Mock automation configs
export const CHECKPOINTS_CONFIG = {
  institution_id: "inst-uuid-1",
  level: "checkpoints" as const,
  updated_at: "2026-02-15T10:00:00Z",
  updated_by: "admin-uuid-1",
};

export const FULL_AUTO_CONFIG = {
  ...CHECKPOINTS_CONFIG,
  level: "full_auto" as const,
  updated_at: "2026-02-19T14:30:00Z",
};

export const MANUAL_CONFIG = {
  ...CHECKPOINTS_CONFIG,
  level: "manual" as const,
  updated_at: "2026-02-19T14:30:00Z",
};

// Mock admin user
export const ADMIN_USER = {
  id: "admin-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock faculty user (should be forbidden)
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock audit entry
export const AUDIT_ENTRY = {
  id: "audit-uuid-1",
  institution_id: "inst-uuid-1",
  actor_id: "admin-uuid-1",
  previous_level: "checkpoints",
  new_level: "full_auto",
  created_at: "2026-02-19T14:30:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/automation-config.test.ts`

```
describe("AutomationConfigController")
  describe("GET /api/v1/admin/settings/automation")
    > returns current automation level for institution
    > returns default 'checkpoints' for institution with no explicit setting
    > returns 403 for faculty role

  describe("PUT /api/v1/admin/settings/automation")
    > updates automation level to full_auto
    > updates automation level to manual
    > creates audit log entry on level change
    > returns 400 for invalid automation level value
    > returns 403 for faculty role
    > returns previous_level in response
```

**Total: ~9 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Settings pages are low-risk CRUD and tested via API tests.

## 12. Acceptance Criteria

1. Three automation levels available: `full_auto`, `checkpoints`, `manual`
2. `full_auto`: critic scores drive auto-approve/reject, minimal human touch
3. `checkpoints`: auto-reject works, but all approvals require human confirmation
4. `manual`: all items route to human review regardless of critic scores
5. Setting stored per institution in `institution_settings` table
6. Settings page UI displays clear explanations of each level with volume impact
7. Only `institutional_admin` and `superadmin` can change the setting
8. Changing level does not retroactively affect items already in queue
9. Audit log entry created when level changes
10. Default for new institutions: `checkpoints`
11. All 9 API tests pass
12. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Three automation levels | S-F-22-3 SS Acceptance Criteria: "full_auto, checkpoints, manual" |
| Default checkpoints | S-F-22-3 SS Notes: "Default automation level for new institutions: checkpoints (safe middle ground)" |
| Admin-only access | S-F-22-3 SS Notes: "Only institutional_admin and superadmin roles can change automation level" |
| No retroactive effect | S-F-22-3 SS Notes: "Changing automation level does not retroactively affect items already in the queue" |
| Audit log | S-F-22-3 SS Notes: "Consider audit log entry when automation level is changed" |
| Router reads config | S-F-22-3 SS Acceptance Criteria: "Router service reads automation level before applying routing logic" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `institution_settings` table exists, `institutions` table exists
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-56 (Review Router):** Must be complete -- reads automation level
- **STORY-U-6 (RBAC):** Complete -- provides role-based access control
- **No Neo4j needed** for this story

## 15. Figma Make Prototype

```
Frame: Automation Settings Page (1440x900)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content Area (800px centered, cream #f5f3ef)
  │   ├── Header: "Review Automation Settings" (24px, bold, navy deep)
  │   ├── Current Level Card (white, subtle border)
  │   │   └── "Current: Checkpoints — Last updated Feb 15 by Admin"
  │   ├── RadioCard Group (vertical, gap-12)
  │   │   ├── Full Automation Card (white, border)
  │   │   │   ├── Radio + "Full Automation" (bold)
  │   │   │   ├── Description text (muted)
  │   │   │   └── "Low review volume" (italic, muted)
  │   │   ├── Checkpoints Card (white, navy border = selected)
  │   │   │   ├── Radio (selected) + "Checkpoints" (bold)
  │   │   │   ├── Badge: "Recommended" (green)
  │   │   │   ├── Description text (muted)
  │   │   │   └── "Medium review volume" (italic, muted)
  │   │   └── Manual Card (white, border)
  │   │       ├── Radio + "Manual Review" (bold)
  │   │       ├── Description text (muted)
  │   │       └── "High review volume" (italic, muted)
  │   ├── Note: "Changing this will not affect items already in the queue" (muted, italic)
  │   └── SaveButton: "Save Changes" (navy deep, disabled until changed)
```
