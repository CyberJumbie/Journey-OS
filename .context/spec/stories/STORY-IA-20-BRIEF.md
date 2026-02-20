# STORY-IA-20 Brief: Setup Wizard Step

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-20
old_id: S-IA-17-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 20
sprint: 3
size: S
depends_on:
  - STORY-IA-6 (institutional_admin) — Framework List Page
  - STORY-U-13 (universal, cross-lane) — Onboarding Screens
blocks: []
personas_served: [institutional_admin]
epic: E-17 (Framework Browser UI)
feature: F-08 (Framework Browser)
user_flow: UF-13 (Framework Exploration)
```

---

## 1. Summary

Build a **framework import step** for the Institutional Admin onboarding/setup wizard. This step displays a checkbox list of all 8 available educational frameworks with descriptions and pre-selected defaults (USMLE, LCME). The selected frameworks are stored in the institution settings and determine which framework cards appear in the framework browser. At least one framework must be selected (validation). A skip option is available with a warning.

Key constraints:
- **8 frameworks** displayed as a checkbox list with descriptions
- **Pre-selected defaults:** USMLE, LCME (most common for US medical schools)
- **At least one** framework must be selected (validation)
- **Skip option** with warning: "You can configure frameworks later in settings"
- **DualWrite:** Institution settings updated in Supabase first, then Neo4j
- **Integrates into onboarding flow** from STORY-U-13

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create institution settings types
- **File:** `packages/types/src/institution/institution-settings.types.ts`
- **Action:** Export `InstitutionFrameworkSettings`, `UpdateFrameworkSettingsRequest`, `AvailableFramework`

### Task 2: Update institution barrel export
- **File:** `packages/types/src/institution/index.ts`
- **Action:** Re-export from `institution-settings.types.ts`

### Task 3: Build InstitutionSettingsService
- **File:** `apps/server/src/services/institution/institution-settings.service.ts`
- **Action:** `getFrameworkSettings(institutionId)`, `updateFrameworkSettings(institutionId, frameworks)`. DualWrite to Supabase then Neo4j.

### Task 4: Build InstitutionSettingsController
- **File:** `apps/server/src/controllers/institution/institution-settings.controller.ts`
- **Action:** `handleGetFrameworkSettings(req, res)`, `handleUpdateFrameworkSettings(req, res)`. Validates at least one framework selected.

### Task 5: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add `GET /api/v1/institution/settings/frameworks` and `PUT /api/v1/institution/settings/frameworks` with InstitutionalAdmin RBAC

### Task 6: Build FrameworkSetup wizard step
- **File:** `apps/web/src/app/(protected)/onboarding/steps/framework-setup.tsx`
- **Action:** Named export component for onboarding wizard step

### Task 7: Build FrameworkChecklist component
- **File:** `apps/web/src/components/institution/framework-checklist.tsx`
- **Action:** Checkbox list of 8 frameworks with descriptions, pre-selected defaults

### Task 8: Write service tests
- **File:** `apps/server/src/services/institution/__tests__/institution-settings.service.test.ts`
- **Action:** 5 tests covering get, update, validation, DualWrite

---

## 3. Data Model

```typescript
// packages/types/src/institution/institution-settings.types.ts

/** An available educational framework */
export interface AvailableFramework {
  readonly id: string;           // e.g., "usmle", "lcme", "epa", "bloom"
  readonly name: string;         // e.g., "USMLE Content Outline"
  readonly description: string;
  readonly node_count: number;
  readonly hierarchy_depth: number;
  readonly is_default: boolean;  // true for USMLE, LCME
}

/** Institution's selected framework settings */
export interface InstitutionFrameworkSettings {
  readonly institution_id: string;
  readonly selected_frameworks: readonly string[];  // Array of framework IDs
  readonly updated_at: string;
}

/** Request to update selected frameworks */
export interface UpdateFrameworkSettingsRequest {
  readonly selected_frameworks: readonly string[];  // Min 1 required
}

/** All 8 available frameworks (static list) */
export const AVAILABLE_FRAMEWORKS: readonly AvailableFramework[] = [
  { id: "usmle", name: "USMLE Content Outline", description: "United States Medical Licensing Examination content categories: 16 organ systems x 7 disciplines", node_count: 227, hierarchy_depth: 4, is_default: true },
  { id: "lcme", name: "LCME Standards", description: "Liaison Committee on Medical Education accreditation standards", node_count: 12, hierarchy_depth: 2, is_default: true },
  { id: "epa", name: "Core EPAs", description: "Entrustable Professional Activities for entering residency (AAMC)", node_count: 13, hierarchy_depth: 2, is_default: false },
  { id: "acgme", name: "ACGME Competencies", description: "Accreditation Council for Graduate Medical Education core competencies", node_count: 6, hierarchy_depth: 2, is_default: false },
  { id: "milestones", name: "Milestones", description: "ACGME developmental milestones for competency assessment", node_count: 24, hierarchy_depth: 3, is_default: false },
  { id: "bloom", name: "Bloom's Taxonomy", description: "Cognitive learning objective levels (Remember through Create)", node_count: 6, hierarchy_depth: 1, is_default: false },
  { id: "miller", name: "Miller's Pyramid", description: "Clinical competence levels (Knows, Knows How, Shows How, Does)", node_count: 4, hierarchy_depth: 1, is_default: false },
  { id: "clo", name: "CLO Framework", description: "Curriculum Learning Outcomes alignment framework", node_count: 18, hierarchy_depth: 2, is_default: false },
] as const;
```

---

## 4. Database Schema

```sql
-- Migration: add_institution_framework_settings
-- Add selected_frameworks column to institution_settings table

-- If institution_settings table exists (from SA-5 or similar):
ALTER TABLE institution_settings
ADD COLUMN IF NOT EXISTS selected_frameworks JSONB DEFAULT '["usmle", "lcme"]'::jsonb;

-- If institution_settings table does NOT exist, create it:
CREATE TABLE IF NOT EXISTS institution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL UNIQUE REFERENCES institutions(id),
  selected_frameworks JSONB NOT NULL DEFAULT '["usmle", "lcme"]'::jsonb,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institution_settings_institution
  ON institution_settings(institution_id);

-- RLS
ALTER TABLE institution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY institution_settings_scope ON institution_settings
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Neo4j update:**
```cypher
// Update institution node with selected frameworks
MATCH (inst:Institution {id: $institutionId})
SET inst.selected_frameworks = $selectedFrameworks,
    inst.updated_at = datetime()
```

---

## 5. API Contract

### GET /api/v1/institution/settings/frameworks (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "selected_frameworks": ["usmle", "lcme"],
    "available_frameworks": [
      {
        "id": "usmle",
        "name": "USMLE Content Outline",
        "description": "United States Medical Licensing Examination...",
        "node_count": 227,
        "hierarchy_depth": 4,
        "is_default": true,
        "is_selected": true
      },
      {
        "id": "bloom",
        "name": "Bloom's Taxonomy",
        "description": "Cognitive learning objective levels...",
        "node_count": 6,
        "hierarchy_depth": 1,
        "is_default": false,
        "is_selected": false
      }
    ],
    "updated_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### PUT /api/v1/institution/settings/frameworks (Auth: InstitutionalAdmin)

**Request Body:**
```json
{
  "selected_frameworks": ["usmle", "lcme", "epa", "bloom"]
}
```

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "selected_frameworks": ["usmle", "lcme", "epa", "bloom"],
    "updated_at": "2026-02-19T10:05:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin |
| 400 | `VALIDATION_ERROR` | Empty array or invalid framework IDs |

---

## 6. Frontend Spec

### Component: FrameworkSetup (Onboarding Wizard Step)

**File:** `apps/web/src/app/(protected)/onboarding/steps/framework-setup.tsx`

**Component hierarchy:**
```
FrameworkSetupStep (named export)
  ├── StepHeader ("Select Educational Frameworks")
  ├── StepDescription ("Choose which frameworks your institution uses...")
  ├── FrameworkChecklist
  │     └── FrameworkCheckboxItem[] (for each of 8 frameworks)
  │           ├── Checkbox (checked/unchecked)
  │           ├── FrameworkName (bold)
  │           ├── FrameworkDescription (muted text)
  │           ├── NodeCountBadge ("227 nodes")
  │           └── DefaultBadge ("Recommended" for USMLE, LCME)
  ├── ValidationMessage ("At least one framework must be selected")
  ├── SkipLink ("Skip for now — configure later in settings")
  │     └── WarningTooltip ("You can configure frameworks later...")
  ├── ConfirmationSummary (shown before completing step)
  │     └── SelectedList (names of selected frameworks)
  └── ContinueButton (disabled if none selected)
```

**States:**
1. **Initial** -- Defaults pre-selected (USMLE, LCME checked)
2. **Selecting** -- User checking/unchecking frameworks
3. **Validation Error** -- Red message if all unchecked and Continue clicked
4. **Confirming** -- Summary shown before save
5. **Saving** -- Continue button disabled with spinner
6. **Complete** -- Step marked complete, proceed to next

**Design tokens:**
- Checkbox: shadcn/ui `Checkbox` with `--color-primary` Navy Deep
- Default badge: `--badge-variant-secondary`, text "Recommended"
- Node count badge: `--badge-variant-outline`, `--font-size-xs`
- Description: `--color-text-muted`, `--font-size-sm`
- Validation error: `--color-destructive` red text
- Skip link: `--color-text-muted`, underlined, with warning icon

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/institution/institution-settings.types.ts` | Types | Create |
| 2 | `packages/types/src/institution/index.ts` | Types | Edit (add settings export) |
| 3 | Supabase migration via MCP (institution_settings table/column) | Database | Apply |
| 4 | `apps/server/src/services/institution/institution-settings.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/institution/institution-settings.controller.ts` | Controller | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add settings routes) |
| 7 | `apps/web/src/app/(protected)/onboarding/steps/framework-setup.tsx` | View | Create |
| 8 | `apps/web/src/components/institution/framework-checklist.tsx` | Component | Create |
| 9 | `apps/server/src/services/institution/__tests__/institution-settings.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-6 | institutional_admin | **PENDING** | Framework list page (browser filters by selected frameworks) |
| STORY-U-13 | universal | **PENDING** | Onboarding flow (this step integrates into it) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing
- `zod` -- Request validation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`

---

## 9. Test Fixtures

```typescript
import { InstitutionFrameworkSettings, UpdateFrameworkSettingsRequest, AVAILABLE_FRAMEWORKS } from "@journey-os/types";

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Default framework settings (USMLE + LCME pre-selected)
export const DEFAULT_SETTINGS: InstitutionFrameworkSettings = {
  institution_id: "inst-uuid-1",
  selected_frameworks: ["usmle", "lcme"],
  updated_at: "2026-02-19T10:00:00Z",
};

// Updated settings with additional frameworks
export const UPDATED_SETTINGS: InstitutionFrameworkSettings = {
  institution_id: "inst-uuid-1",
  selected_frameworks: ["usmle", "lcme", "epa", "bloom"],
  updated_at: "2026-02-19T10:05:00Z",
};

// Valid update request
export const VALID_UPDATE_REQUEST: UpdateFrameworkSettingsRequest = {
  selected_frameworks: ["usmle", "lcme", "epa", "bloom"],
};

// Invalid: empty array
export const EMPTY_FRAMEWORKS_REQUEST: UpdateFrameworkSettingsRequest = {
  selected_frameworks: [],
};

// Invalid: unknown framework ID
export const INVALID_FRAMEWORK_REQUEST = {
  selected_frameworks: ["usmle", "nonexistent_framework"],
};

// Mock Supabase row for institution_settings
export const MOCK_SETTINGS_ROW = {
  id: "settings-uuid-1",
  institution_id: "inst-uuid-1",
  selected_frameworks: ["usmle", "lcme"],
  setup_completed: false,
  created_at: "2026-02-19T09:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/institution/__tests__/institution-settings.service.test.ts`

```
describe("InstitutionSettingsService")
  describe("getFrameworkSettings")
    it("returns current selected frameworks for the institution")
    it("returns default frameworks (usmle, lcme) when no settings exist")
  describe("updateFrameworkSettings")
    it("updates selected_frameworks in Supabase")
    it("updates Neo4j Institution node selected_frameworks via DualWrite")
    it("throws ValidationError when selected_frameworks is empty array")
    it("throws ValidationError when framework ID is not in AVAILABLE_FRAMEWORKS")
    it("creates settings record if none exists (upsert)")
```

**Total: ~7 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/framework-setup.spec.ts`

```
describe("Framework Setup Wizard Step")
  it("New InstitutionalAdmin can select frameworks during onboarding")
    1. Login as new InstitutionalAdmin (first time)
    2. Navigate through onboarding to framework step
    3. Verify USMLE and LCME are pre-selected
    4. Check EPA and Bloom's Taxonomy
    5. Click Continue
    6. Verify confirmation summary shows 4 selected frameworks
    7. Confirm and proceed to next step
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Framework selection step appears in Institutional Admin onboarding flow
2. Checkbox list shows all 8 available frameworks with descriptions
3. USMLE and LCME are pre-selected as defaults
4. Selected frameworks stored in institution settings (Supabase + Neo4j)
5. At least one framework must be selected (validation)
6. Selected frameworks determine which cards appear in framework browser
7. Skip option available with warning message
8. Confirmation summary shown before completing the step
9. All 7 API tests pass
10. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| 8 available frameworks | S-IA-17-4 Acceptance Criteria |
| Pre-selected defaults: USMLE, LCME | S-IA-17-4 Acceptance Criteria |
| At least one required | S-IA-17-4 Acceptance Criteria |
| Skip option with warning | S-IA-17-4 Acceptance Criteria |
| JSON array storage | S-IA-17-4 Notes |
| DualWrite for settings | S-IA-17-4 Notes |
| Framework browser filtering | S-IA-17-4 Notes |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists
- **Neo4j:** Instance running with Institution nodes
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-IA-6 must be complete** -- framework list page exists to filter by selected frameworks
- **STORY-U-13 should be complete** -- onboarding flow exists to integrate this step

---

## 15. Implementation Notes

- **Static framework list:** The 8 available frameworks are defined as a constant (`AVAILABLE_FRAMEWORKS`) in the types package. They are NOT queried from the database. The list changes only when the codebase adds a new framework.
- **Upsert pattern:** Use `ON CONFLICT (institution_id) DO UPDATE SET selected_frameworks = $frameworks` to handle both first-time setup and later changes from settings page.
- **Framework browser integration:** The framework list page (STORY-IA-6) should query the institution's selected frameworks and filter the card grid accordingly. This filtering logic is added to IA-6's FrameworkService when this story is complete.
- **Onboarding integration:** This component is a step in the onboarding wizard. It receives `onComplete()` and `onSkip()` callbacks from the wizard container. It does NOT own the wizard navigation.
- **Default creation:** When an institution is first created (SA-5), automatically create an `institution_settings` record with defaults. If the record does not exist when queried, return the defaults.
- **DualWrite for settings:** Update `institution_settings` table in Supabase first, then update the Neo4j Institution node's `selected_frameworks` property.
- **Private fields pattern:** `InstitutionSettingsService` uses `readonly #supabaseClient`, `readonly #neo4jClient` with constructor DI.
- **Validation:** Framework IDs in the request must exist in `AVAILABLE_FRAMEWORKS.map(f => f.id)`. Reject unknown IDs.
