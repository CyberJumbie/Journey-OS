# STORY-F-49 Brief: Template Picker in Workbench

## 0. Lane & Priority

```yaml
story_id: STORY-F-49
old_id: S-F-39-3
lane: faculty
lane_priority: 3
within_lane_order: 49
sprint: 16
size: S
depends_on:
  - STORY-F-4 (faculty) — Template CRUD (templates must exist)
  - STORY-F-43 (faculty) — Workbench layout (SplitPane exists)
blocks: []
personas_served: [faculty]
epic: E-39 (Templates & Help)
feature: F-18 (Template Management)
```

## 1. Summary

Build a **template picker component** in the generation workbench that allows faculty to select a saved template and auto-populate all generation form fields. The picker is a shadcn/ui Combobox with search and grouping ("My Templates" / "Shared") that queries templates visible to the current user for the current course context. Selecting a template calls React Hook Form `reset()` to populate fields. A "Clear template" button resets to defaults. A modified indicator shows when form values differ from the applied template snapshot. The server-side `TemplatePickerService` provides the filtered template list endpoint.

Key constraints:
- Template picker is a shadcn/ui Combobox with search and grouped sections
- Form population uses React Hook Form `reset()` with template values
- Modified indicator compares current form state to applied template snapshot
- Named exports only, TypeScript strict, design tokens only

## 2. Task Breakdown

1. **Types** -- Create `TemplatePickerItem`, `TemplatePickerGroup` in `packages/types/src/template/`
2. **TemplatePicker component** -- `TemplatePicker.tsx` Combobox with search, grouping, and clear button
3. **Template picker service** -- `TemplatePickerService` on server to query visible templates for user + course
4. **Modified indicator** -- Compare form state to applied template snapshot, show visual diff indicator
5. **Hook** -- `useTemplatePicker` in web app for data fetching and form integration
6. **API tests** -- 5-8 tests covering template list, apply, clear, modified detection
7. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/template/picker.types.ts

/** Template item displayed in the picker */
export interface TemplatePickerItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly owner_id: string;
  readonly owner_name: string;
  readonly is_shared: boolean;
  readonly question_type: string;
  readonly created_at: string;
}

/** Grouped template list for the picker */
export interface TemplatePickerGroup {
  readonly label: string;
  readonly templates: readonly TemplatePickerItem[];
}

/** Response from template picker endpoint */
export interface TemplatePickerResponse {
  readonly groups: readonly TemplatePickerGroup[];
  readonly total: number;
}

/** Template values applied to the generation form */
export interface TemplateFormValues {
  readonly question_type: string;
  readonly difficulty: string;
  readonly bloom_level: string;
  readonly course_id: string;
  readonly slo_ids: readonly string[];
  readonly concept_ids: readonly string[];
  readonly max_vignette_length: number | null;
  readonly required_keywords: readonly string[];
  readonly excluded_topics: readonly string[];
}

/** Template application state */
export interface TemplateApplicationState {
  readonly applied_template_id: string | null;
  readonly applied_template_name: string | null;
  readonly is_modified: boolean;
  readonly snapshot: TemplateFormValues | null;
}
```

## 4. Database Schema (inline, complete)

No new tables. Uses the existing `generation_templates` table created by STORY-F-4.

```sql
-- Existing table (created by STORY-F-4):
-- generation_templates (
--   id UUID PRIMARY KEY,
--   name TEXT NOT NULL,
--   description TEXT,
--   owner_id UUID NOT NULL REFERENCES profiles(id),
--   course_id UUID REFERENCES courses(id),
--   is_shared BOOLEAN DEFAULT false,
--   config JSONB NOT NULL,
--   question_type TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- )

-- No new migration required.
```

## 5. API Contract (complete request/response)

### GET /api/v1/templates/picker?course_id={courseId} (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "groups": [
      {
        "label": "My Templates",
        "templates": [
          {
            "id": "tmpl-uuid-1",
            "name": "Cardiology SBA Standard",
            "description": "Standard single best answer for cardiology",
            "owner_id": "faculty-uuid-1",
            "owner_name": "Dr. Jones",
            "is_shared": false,
            "question_type": "single_best_answer",
            "created_at": "2026-02-01T10:00:00Z"
          }
        ]
      },
      {
        "label": "Shared Templates",
        "templates": [
          {
            "id": "tmpl-uuid-2",
            "name": "Pharmacology Hard EMQ",
            "description": "Extended matching for pharmacology",
            "owner_id": "faculty-uuid-2",
            "owner_name": "Dr. Smith",
            "is_shared": true,
            "question_type": "extended_matching",
            "created_at": "2026-01-15T08:00:00Z"
          }
        ]
      }
    ],
    "total": 2
  },
  "error": null
}
```

### GET /api/v1/templates/:templateId/config (Auth: faculty)

Returns full template config for form population.

**Success Response (200):**
```json
{
  "data": {
    "question_type": "single_best_answer",
    "difficulty": "medium",
    "bloom_level": "Apply",
    "course_id": "course-uuid-1",
    "slo_ids": ["slo-uuid-1", "slo-uuid-2"],
    "concept_ids": ["concept-uuid-1"],
    "max_vignette_length": 500,
    "required_keywords": ["diagnosis", "treatment"],
    "excluded_topics": []
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Template not found or not accessible |

## 6. Frontend Spec

### TemplatePicker Component

**File:** `apps/web/src/components/generation/TemplatePicker.tsx`

```
TemplatePicker (organism)
  ├── Combobox (shadcn/ui) with search input
  │   ├── Group: "My Templates" — user's own templates
  │   └── Group: "Shared Templates" — shared for current course
  ├── Active template indicator (Badge with template name)
  ├── Modified indicator (orange dot when form differs from snapshot)
  └── Clear button (X icon to reset to defaults)
```

**States:**
1. **Empty** -- No templates available ("No templates found. Create one from the generation form.")
2. **Loaded** -- Templates grouped and searchable
3. **Selected** -- Template name shown as active preset with badge
4. **Modified** -- Orange dot indicator when form values differ from applied template
5. **Loading** -- Skeleton in combobox dropdown

**Design tokens:**
- Badge background: Navy Deep `#002c76` for active template name
- Modified indicator: dot using Green `#69a338`
- Combobox background: White `#ffffff`
- Group headers: text-muted-foreground from design system
- Clear button: Ghost variant with Lucide `X` icon

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/template/picker.types.ts` | Types | Create |
| 2 | `packages/types/src/template/index.ts` | Types | Edit (add picker exports) |
| 3 | `apps/server/src/services/template/template-picker.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/template-picker.controller.ts` | Controller | Create |
| 5 | `apps/server/src/routes/template-picker.routes.ts` | Routes | Create (or edit existing template routes) |
| 6 | `apps/web/src/components/generation/TemplatePicker.tsx` | View | Create |
| 7 | `apps/web/src/hooks/use-template-picker.ts` | Hook | Create |
| 8 | `apps/server/src/__tests__/template/template-picker.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-4 | faculty | Pending | Template CRUD and `generation_templates` table must exist |
| STORY-F-43 | faculty | Pending | Workbench SplitPane layout must exist |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- No new packages required. Uses existing shadcn/ui Combobox and React Hook Form.

### Existing Files Needed
- `apps/server/src/services/template/template.service.ts` -- Template CRUD (from STORY-F-4)
- `apps/web/src/components/workbench/` -- Workbench layout (from STORY-F-43)
- `apps/server/src/middleware/auth.middleware.ts` -- Auth middleware
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC middleware

## 9. Test Fixtures (inline)

```typescript
// Mock templates for picker
export const OWN_TEMPLATE_1: TemplatePickerItem = {
  id: "tmpl-uuid-1",
  name: "Cardiology SBA Standard",
  description: "Standard single best answer for cardiology",
  owner_id: "faculty-uuid-1",
  owner_name: "Dr. Jones",
  is_shared: false,
  question_type: "single_best_answer",
  created_at: "2026-02-01T10:00:00Z",
};

export const OWN_TEMPLATE_2: TemplatePickerItem = {
  id: "tmpl-uuid-3",
  name: "Neuro EMQ Hard",
  description: "Hard extended matching for neurology",
  owner_id: "faculty-uuid-1",
  owner_name: "Dr. Jones",
  is_shared: false,
  question_type: "extended_matching",
  created_at: "2026-02-10T10:00:00Z",
};

export const SHARED_TEMPLATE_1: TemplatePickerItem = {
  id: "tmpl-uuid-2",
  name: "Pharmacology Hard EMQ",
  description: "Extended matching for pharmacology",
  owner_id: "faculty-uuid-2",
  owner_name: "Dr. Smith",
  is_shared: true,
  question_type: "extended_matching",
  created_at: "2026-01-15T08:00:00Z",
};

export const TEMPLATE_CONFIG: TemplateFormValues = {
  question_type: "single_best_answer",
  difficulty: "medium",
  bloom_level: "Apply",
  course_id: "course-uuid-1",
  slo_ids: ["slo-uuid-1"],
  concept_ids: ["concept-uuid-1"],
  max_vignette_length: 500,
  required_keywords: ["diagnosis"],
  excluded_topics: [],
};

export const EMPTY_PICKER_RESPONSE: TemplatePickerResponse = {
  groups: [],
  total: 0,
};

export const POPULATED_PICKER_RESPONSE: TemplatePickerResponse = {
  groups: [
    { label: "My Templates", templates: [OWN_TEMPLATE_1, OWN_TEMPLATE_2] },
    { label: "Shared Templates", templates: [SHARED_TEMPLATE_1] },
  ],
  total: 3,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/template/template-picker.test.ts`

```
describe("TemplatePickerService")
  describe("getPickerTemplates")
    > returns own templates and shared templates grouped separately
    > filters templates by course_id
    > returns empty groups when no templates exist
    > excludes other users' non-shared templates

describe("TemplatePickerController")
  describe("GET /api/v1/templates/picker")
    > returns 200 with grouped templates for authenticated faculty
    > returns 401 for unauthenticated request
    > returns 403 for non-faculty role
    > filters by course_id query parameter

  describe("GET /api/v1/templates/:templateId/config")
    > returns 200 with template config for accessible template
    > returns 404 for non-existent or inaccessible template
```

**Total: ~10 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The template picker is a supporting UI component. E2E coverage for the full generation workflow will cover template selection.

## 12. Acceptance Criteria

1. Template picker dropdown/dialog renders in workbench generation form
2. Shows available templates: own + shared templates for current course
3. Selecting a template populates all generation form fields via React Hook Form `reset()`
4. "Clear template" button resets form to defaults
5. Template name displayed as active preset indicator (Badge)
6. Modified indicator shows when form values differ from applied template
7. Combobox supports search and grouping ("My Templates" / "Shared")
8. All 10 API tests pass
9. TypeScript strict, named exports only, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| Template picker in workbench | S-F-39-3 Acceptance Criteria |
| Combobox with search and grouping | S-F-39-3 Notes: "shadcn/ui Combobox with search and grouping" |
| React Hook Form reset() | S-F-39-3 Notes: "Form population uses React Hook Form reset()" |
| Modified indicator | S-F-39-3 Acceptance Criteria: "shows if form values differ from applied template" |
| Depends on S-F-39-1, S-F-19-1 | S-F-39-3 Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `generation_templates` table exists (via STORY-F-4)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No new NPM packages required**

## 15. Implementation Notes

- **Combobox pattern:** Use shadcn/ui `<Combobox>` component with `<CommandGroup>` for "My Templates" and "Shared" sections. Each item shows template name and question type badge.
- **useTemplatePicker hook:** Fetches templates on mount (and when course_id changes). Returns `{ groups, selectedTemplate, applyTemplate, clearTemplate, isModified }`. `applyTemplate(id)` fetches full config then calls `form.reset(config)`. `clearTemplate()` calls `form.reset(defaults)`.
- **Modified detection:** On `applyTemplate`, store a snapshot of the form values. Use `useWatch()` from React Hook Form to compare current values against snapshot via deep equality.
- **OOP on server:** `TemplatePickerService` with `#supabaseClient` injected via constructor DI. `getPickerTemplates(userId, courseId)` queries `generation_templates` with `owner_id = userId OR is_shared = true` filtered by `course_id`.
- **No default exports:** All components, hooks, services use named exports only.
