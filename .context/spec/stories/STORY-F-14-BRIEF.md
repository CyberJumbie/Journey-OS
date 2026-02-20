# STORY-F-14 Brief: Template Management Page

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-14
old_id: S-F-39-2
epic: E-39 (Templates & Help)
feature: F-18 (Template Management)
sprint: 16
lane: faculty
lane_priority: 3
within_lane_order: 14
size: M
depends_on:
  - STORY-F-4 (faculty) — Template Model & CRUD ✅ DONE
blocks: []
personas_served: [faculty, faculty_course_director]
```

---

## Section 1: Summary

Faculty members need a visual management interface for their generation templates. This story delivers a **template management page** at `/faculty/templates` with a responsive card grid for browsing templates, a create/edit form (dialog or full page), a mock preview panel, search, filters, delete confirmation, and sharing toggle. The backend CRUD endpoints already exist from STORY-F-4; this story is frontend-focused with a thin controller extension for template listing with UI-specific sorting.

**User Story:** As a Faculty member, I need a template management page to list, create, edit, and preview templates so that I can organize my generation presets visually.

Key constraints:
- Card grid: 3 columns desktop, 2 tablet, 1 mobile (responsive)
- Sharing level badge icons: lock (private), group (course), building (institution), globe (public)
- Preview is mock-only (no real LLM call) -- generates a sample question outline based on template config
- Edit saves as new version (using PUT endpoint from STORY-F-4)
- Empty state with "Create your first template" CTA
- All existing CRUD endpoints from STORY-F-4 are consumed as-is

---

## Section 2: Task Breakdown

Implementation order: Types (if needed) -> Frontend Components -> Page -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Build `TemplateCard` molecule (card with name, description, type, sharing badge, actions) | `apps/web/src/components/template/TemplateCard.tsx` | 60m |
| 2 | Build `TemplateForm` organism (create/edit form with all template fields) | `apps/web/src/components/template/TemplateForm.tsx` | 90m |
| 3 | Build `TemplatePreview` molecule (mock question preview based on config) | `apps/web/src/components/template/TemplatePreview.tsx` | 45m |
| 4 | Build `TemplateFilters` molecule (sharing level, question type, course dropdowns + search) | `apps/web/src/components/template/TemplateFilters.tsx` | 30m |
| 5 | Build `TemplateGrid` organism (responsive card grid + empty state) | `apps/web/src/components/template/TemplateGrid.tsx` | 30m |
| 6 | Build `TemplateDeleteDialog` molecule (confirmation dialog) | `apps/web/src/components/template/TemplateDeleteDialog.tsx` | 15m |
| 7 | Build `SharingLevelBadge` atom (icon + label for sharing level) | `apps/web/src/components/template/SharingLevelBadge.tsx` | 15m |
| 8 | Build `DifficultyDistributionInput` molecule (3 slider/number inputs summing to 1.0) | `apps/web/src/components/template/DifficultyDistributionInput.tsx` | 30m |
| 9 | Create template management page | `apps/web/src/app/(dashboard)/faculty/templates/page.tsx` | 45m |
| 10 | Create API client functions for template CRUD | `apps/web/src/lib/api/templates.ts` | 30m |
| 11 | Write frontend component tests (8 tests) | `apps/web/src/components/template/__tests__/template-management.test.ts` | 60m |

**Total estimate:** ~7.5 hours (Size M)

---

## Section 3: Data Model (inline, complete)

All template types are already defined in STORY-F-4. Referenced here for completeness:

```typescript
// packages/types/src/template/template.types.ts (EXISTING -- from STORY-F-4)

export const TEMPLATE_SHARING_LEVELS = [
  'private',
  'shared_course',
  'shared_institution',
  'public',
] as const;
export type TemplateSharingLevel = typeof TEMPLATE_SHARING_LEVELS[number];

export const TEMPLATE_QUESTION_TYPES = [
  'single_best_answer',
  'extended_matching',
  'sequential_item_set',
] as const;
export type TemplateQuestionType = typeof TEMPLATE_QUESTION_TYPES[number];

export interface DifficultyDistribution {
  readonly easy: number;
  readonly medium: number;
  readonly hard: number;
}

export interface Template {
  readonly id: string;
  readonly institution_id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly description: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: readonly number[];
  readonly scope_config: TemplateScopeConfig;
  readonly prompt_overrides: TemplatePromptOverrides;
  readonly metadata: TemplateMetadata;
  readonly sharing_level: TemplateSharingLevel;
  readonly current_version: number;
  readonly graph_node_id: string | null;
  readonly sync_status: 'pending' | 'synced' | 'failed';
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TemplateCreateInput { /* ... see STORY-F-4 brief for full shape */ }
export interface TemplateUpdateInput { /* partial of TemplateCreateInput */ }
export interface TemplateDuplicateInput { readonly new_name?: string; }
export interface TemplateListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sharing_level?: TemplateSharingLevel;
  readonly question_type?: TemplateQuestionType;
  readonly course_id?: string;
  readonly search?: string;
  readonly owner_only?: boolean;
}
```

### New type: Mock Preview

```typescript
// apps/web/src/lib/types/template-preview.types.ts

/** Mock question outline generated from template config (no LLM call) */
export interface MockQuestionPreview {
  readonly stem_preview: string;
  readonly vignette_preview: string;
  readonly option_count: number;
  readonly bloom_level_label: string;
  readonly difficulty_label: string;
  readonly clinical_setting: string;
  readonly question_type_label: string;
}
```

---

## Section 4: Database Schema

**No new tables.** All template data is stored in the `templates` and `template_versions` tables created by STORY-F-4. The existing RLS policies and indexes support all operations needed by this page.

---

## Section 5: API Contract

All endpoints are already implemented in STORY-F-4. This story consumes them from the frontend:

| Method | Endpoint | Used For |
|--------|----------|----------|
| GET | `/api/v1/templates` | List templates with filters |
| POST | `/api/v1/templates` | Create new template |
| GET | `/api/v1/templates/:id` | Get template for edit form |
| PUT | `/api/v1/templates/:id` | Update template (creates new version) |
| DELETE | `/api/v1/templates/:id` | Delete template |
| POST | `/api/v1/templates/:id/duplicate` | Duplicate template |
| GET | `/api/v1/templates/:id/versions` | Version history (future use) |

See STORY-F-4 brief for full request/response shapes.

---

## Section 6: Frontend Spec

### Page: `/faculty/templates`

**Route:** `apps/web/src/app/(dashboard)/faculty/templates/page.tsx`

**Component hierarchy (Atomic Design):**
```
TemplatesPage (page.tsx -- default export)
  ├── PageHeader
  │     ├── Heading: "Templates" (Lora font)
  │     └── CreateButton (shadcn/ui Button) -> opens TemplateForm dialog
  ├── TemplateFilters (Molecule)
  │     ├── SharingLevelSelect (shadcn/ui Select)
  │     ├── QuestionTypeSelect (shadcn/ui Select)
  │     ├── CourseSelect (shadcn/ui Select) -- future, placeholder
  │     └── SearchInput (shadcn/ui Input, 300ms debounce)
  └── TemplateGrid (Organism)
        ├── TemplateCard[] (Molecule) -- mapped from template list
        │     ├── SharingLevelBadge (Atom)
        │     ├── Card header: name + question type label
        │     ├── Card body: description (truncated 2 lines)
        │     ├── Card footer: last modified + version
        │     └── Card actions (kebab menu):
        │           ├── Edit -> TemplateForm dialog (pre-populated)
        │           ├── Duplicate -> API call + refresh
        │           ├── Toggle sharing -> inline sharing level change
        │           ├── Preview -> TemplatePreview panel
        │           └── Delete -> TemplateDeleteDialog
        └── EmptyState (when no templates)
              ├── Illustration placeholder
              ├── "Create your first template"
              └── CTA button -> TemplateForm dialog

TemplateForm (Dialog/Organism -- shared for create and edit)
  ├── NameInput (required)
  ├── DescriptionTextarea
  ├── QuestionTypeSelect
  ├── DifficultyDistributionInput (Molecule)
  │     ├── EasySlider (0.0-1.0)
  │     ├── MediumSlider (0.0-1.0)
  │     └── HardSlider (0.0-1.0)
  │     └── Sum validation indicator
  ├── BloomLevelCheckboxGroup (checkboxes for levels 1-6)
  ├── SharingLevelSelect
  ├── ScopeConfigSection (collapsible)
  │     ├── CourseSelect
  │     └── USMLE System multi-select
  ├── PromptOverridesSection (collapsible)
  │     ├── VignetteInstructionsTextarea
  │     ├── StemInstructionsTextarea
  │     └── ClinicalSettingInput
  ├── MetadataSection (collapsible)
  │     ├── CategoryInput
  │     └── TagsInput (comma-separated)
  └── FormActions
        ├── Cancel button
        └── Save button (with loading state)

TemplatePreview (SlideOver/Molecule)
  ├── Preview heading
  ├── Mock question outline
  │     ├── "[Bloom Level] [Difficulty] question about [topics]"
  │     ├── "Clinical setting: [setting]"
  │     ├── "Type: [question_type]"
  │     └── "Options: A-E with [difficulty distribution] spread"
  └── Note: "This is a preview outline. Actual generation uses the AI pipeline."

TemplateDeleteDialog (Dialog/Molecule)
  ├── "Delete template?" heading
  ├── "This will permanently delete [name] and all its versions."
  ├── Cancel button
  └── Delete button (destructive variant, with loading state)
```

### States

1. **Loading** -- Skeleton card grid with 6 placeholder cards
2. **Empty** -- Empty state CTA (no templates created yet)
3. **Populated** -- Card grid with template cards
4. **Filtered** -- Grid with active filter badges, "Clear all" option
5. **No results** -- "No templates match your filters" with clear filters button
6. **Creating** -- TemplateForm dialog in create mode
7. **Editing** -- TemplateForm dialog in edit mode (pre-populated)
8. **Previewing** -- TemplatePreview slide-over panel
9. **Deleting** -- TemplateDeleteDialog with confirm/cancel

### Card Grid Layout

```css
/* Responsive grid using design tokens */
.template-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(1, 1fr);  /* mobile */
}

@media (min-width: 768px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);  /* tablet */
  }
}

@media (min-width: 1024px) {
  .template-grid {
    grid-template-columns: repeat(3, 1fr);  /* desktop */
  }
}
```

### Sharing Level Badge Mapping

| Level | Icon | Label | Color Token |
|-------|------|-------|-------------|
| `private` | Lock | Private | `--color-neutral-500` |
| `shared_course` | Users | Course | `--color-blue-500` |
| `shared_institution` | Building | Institution | `--color-purple-500` |
| `public` | Globe | Public | `--color-green-500` |

### Question Type Labels

| Type | Label |
|------|-------|
| `single_best_answer` | Single Best Answer |
| `extended_matching` | Extended Matching |
| `sequential_item_set` | Sequential Item Set |

### DifficultyDistributionInput Behavior

- Three number inputs (or sliders) for easy, medium, hard
- Each range: 0.0 to 1.0
- Sum indicator shows current total
- Validation: sum must equal 1.0 (tolerance 0.001)
- Error state: red border and message if sum !== 1.0
- Auto-adjust option: when one value changes, proportionally adjust others to maintain sum of 1.0

### Design Tokens

- Surface: White sheet for page background
- Card surface: Parchment for card backgrounds
- Card border: `--border-default` with `--radius-lg` for rounded corners
- Card shadow: `--shadow-sm` default, `--shadow-md` on hover
- Primary action: Navy Deep for create/save buttons
- Destructive: `--color-red-600` for delete button
- Typography: Lora for page heading, Source Sans 3 for card text
- Spacing: `--space-4` card gap, `--space-6` page padding

---

## Section 7: Files to Create

```
# 1. Frontend components (apps/web)
apps/web/src/components/template/SharingLevelBadge.tsx
apps/web/src/components/template/DifficultyDistributionInput.tsx
apps/web/src/components/template/TemplateCard.tsx
apps/web/src/components/template/TemplateFilters.tsx
apps/web/src/components/template/TemplateForm.tsx
apps/web/src/components/template/TemplatePreview.tsx
apps/web/src/components/template/TemplateGrid.tsx
apps/web/src/components/template/TemplateDeleteDialog.tsx

# 2. API client
apps/web/src/lib/api/templates.ts

# 3. Local types
apps/web/src/lib/types/template-preview.types.ts

# 4. Page
apps/web/src/app/(dashboard)/faculty/templates/page.tsx

# 5. Tests
apps/web/src/components/template/__tests__/template-management.test.ts
```

**Total files:** 12 new

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-4 | faculty | **DONE** | Template CRUD endpoints, types, database tables |

### NPM Packages (already in monorepo)
- `react` / `next` -- Framework
- `@tanstack/react-query` or fetch wrapper -- API data fetching
- `lucide-react` -- Icons (Lock, Users, Building, Globe, MoreVertical, Plus, Trash, Edit, Copy, Eye)
- `zod` -- Client-side form validation
- `vitest` / `@testing-library/react` -- Component testing

### shadcn/ui Components Used
- `Card` -- Template card container
- `Dialog` -- Create/edit form modal
- `Form` / `Input` / `Textarea` / `Select` -- Form fields
- `Button` -- Actions
- `DropdownMenu` -- Card kebab menu
- `Badge` -- Sharing level and question type labels
- `Slider` -- Difficulty distribution (alternative to number inputs)
- `Checkbox` -- Bloom level selection
- `Sheet` -- Preview slide-over panel
- `Skeleton` -- Loading state

### Existing Files Needed
- `packages/types/src/template/template.types.ts` -- All template types (from STORY-F-4)
- `apps/web/src/lib/supabase/client.ts` -- Supabase client for auth headers
- Dashboard layout at `apps/web/src/app/(dashboard)/layout.tsx` -- Page wrapping

---

## Section 9: Test Fixtures (inline)

```typescript
import type { Template, TemplateSharingLevel } from '@journey-os/types';

export const TEMPLATE_FIXTURES: readonly Template[] = [
  {
    id: "tmpl-0001",
    institution_id: "inst-0001",
    owner_id: "user-0001",
    name: "Board Prep - Cardiovascular",
    description: "High-difficulty cardiovascular questions for Step 1 preparation",
    question_type: "single_best_answer",
    difficulty_distribution: { easy: 0.1, medium: 0.3, hard: 0.6 },
    bloom_levels: [4, 5, 6],
    scope_config: { course_id: "course-001", usmle_systems: ["Cardiovascular"] },
    prompt_overrides: { clinical_setting: "Emergency department" },
    metadata: { category: "board_prep", tags: ["cardiovascular", "step1"] },
    sharing_level: "shared_institution",
    current_version: 3,
    graph_node_id: "neo4j-tmpl-001",
    sync_status: "synced",
    created_at: "2026-01-15T08:00:00Z",
    updated_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "tmpl-0002",
    institution_id: "inst-0001",
    owner_id: "user-0001",
    name: "Formative Quiz - General",
    description: "Balanced difficulty for in-class formative assessment",
    question_type: "single_best_answer",
    difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
    bloom_levels: [2, 3, 4],
    scope_config: {},
    prompt_overrides: {},
    metadata: { category: "formative" },
    sharing_level: "private",
    current_version: 1,
    graph_node_id: "neo4j-tmpl-002",
    sync_status: "synced",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "tmpl-0003",
    institution_id: "inst-0001",
    owner_id: "user-0002",
    name: "Anatomy Review",
    description: "Standard anatomy question template shared across the institution",
    question_type: "extended_matching",
    difficulty_distribution: { easy: 0.4, medium: 0.4, hard: 0.2 },
    bloom_levels: [2, 3],
    scope_config: { usmle_systems: ["Musculoskeletal"] },
    prompt_overrides: {},
    metadata: { category: "review" },
    sharing_level: "public",
    current_version: 2,
    graph_node_id: "neo4j-tmpl-003",
    sync_status: "synced",
    created_at: "2026-02-05T09:00:00Z",
    updated_at: "2026-02-12T11:00:00Z",
  },
] as const;

export const CREATE_TEMPLATE_INPUT = {
  name: "New Template",
  description: "A fresh template for testing",
  question_type: "single_best_answer" as const,
  difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  bloom_levels: [3, 4, 5],
  sharing_level: "private" as const,
};

export const EMPTY_TEMPLATE_LIST: readonly Template[] = [];
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/web/src/components/template/__tests__/template-management.test.ts`
**Total tests:** 10

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() for mocks referenced by vi.mock() closures
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

describe('Template Management Page', () => {
  describe('TemplateGrid', () => {
    it('renders template cards in a grid layout', () => {
      // Render TemplateGrid with TEMPLATE_FIXTURES
      // Assert: 3 cards rendered
      // Assert: each card shows name, description, sharing badge
    });

    it('shows empty state when no templates exist', () => {
      // Render TemplateGrid with EMPTY_TEMPLATE_LIST
      // Assert: "Create your first template" CTA visible
      // Assert: no cards rendered
    });

    it('shows "no results" state when filters return empty', () => {
      // Render TemplateGrid with empty list and active filters
      // Assert: "No templates match your filters" message
      // Assert: "Clear filters" button visible
    });
  });

  describe('TemplateCard', () => {
    it('displays sharing level badge with correct icon', () => {
      // Render TemplateCard with shared_institution template
      // Assert: Building icon visible
      // Assert: "Institution" label
    });

    it('shows kebab menu with Edit, Duplicate, Preview, Delete actions', () => {
      // Render TemplateCard, click kebab menu
      // Assert: 4 menu items visible
    });
  });

  describe('TemplateForm', () => {
    it('validates difficulty distribution sums to 1.0', () => {
      // Render TemplateForm, set easy=0.5, medium=0.5, hard=0.5
      // Assert: validation error shown
      // Assert: save button disabled
    });

    it('submits create form with valid data', async () => {
      // Render TemplateForm in create mode
      // Fill all required fields with CREATE_TEMPLATE_INPUT
      // Submit form
      // Assert: POST /api/v1/templates called with correct body
    });

    it('pre-populates form fields in edit mode', () => {
      // Render TemplateForm in edit mode with TEMPLATE_FIXTURES[0]
      // Assert: name field = "Board Prep - Cardiovascular"
      // Assert: difficulty sliders match { easy: 0.1, medium: 0.3, hard: 0.6 }
      // Assert: bloom levels 4, 5, 6 checked
    });
  });

  describe('TemplateFilters', () => {
    it('filters templates by sharing level', () => {
      // Select "Private" sharing level filter
      // Assert: filter callback called with { sharing_level: 'private' }
    });

    it('debounces search input (300ms)', async () => {
      // Type "cardio" in search input
      // Assert: callback not called immediately
      // Wait 300ms
      // Assert: callback called with { search: 'cardio' }
    });
  });
});
```

---

## Section 11: E2E Test Spec (Playwright)

Not required for this story. Template management is not one of the 5 critical user journeys. E2E coverage will be added when the Generation Workbench flow (E-20) is complete.

---

## Section 12: Acceptance Criteria

- [ ] Template management page accessible at `/faculty/templates`
- [ ] Card grid shows templates with name, description, question type, sharing badge, last modified
- [ ] Responsive grid: 3 columns desktop, 2 tablet, 1 mobile
- [ ] Sharing level badge: lock (private), group (course), building (institution), globe (public)
- [ ] Create template via dialog form with all configurable fields
- [ ] Edit template opens pre-populated form, saves as new version (PUT endpoint)
- [ ] Delete with confirmation dialog, calls DELETE endpoint
- [ ] Duplicate template creates a copy owned by the current user
- [ ] Preview panel shows mock question outline (no real LLM call)
- [ ] Filter by sharing level, question type, course
- [ ] Search by template name (300ms debounce)
- [ ] Empty state with "Create your first template" CTA
- [ ] Sharing toggle: change sharing level directly from card
- [ ] Difficulty distribution input validates sum equals 1.0
- [ ] All 10 component tests pass
- [ ] TypeScript strict, named exports only (except page.tsx default export)
- [ ] Design tokens only, no hardcoded styling values

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-39-2.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/spec/stories/STORY-F-4-BRIEF.md` | Template types, API endpoints, database schema, sharing level matrix |
| `.context/source/04-process/CODE_STANDARDS.md` | Atomic Design hierarchy, OOP standards, testing standards |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Three Sheet Hierarchy design tokens, monorepo structure |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** `templates` and `template_versions` tables migrated (from STORY-F-4)
- **Express:** Server running on port 3001 with template CRUD endpoints registered
- **Next.js:** Web app running on port 3000
- **Neo4j:** Required for dual-write sync (backend handles this; frontend just reads sync_status)

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Pre-implementation Checks
1. Verify STORY-F-4 is complete: template CRUD endpoints return correct responses
2. Verify shadcn/ui components installed: Card, Dialog, Form, Select, Slider, Badge, Sheet, Skeleton, DropdownMenu
3. Verify dashboard layout exists at `apps/web/src/app/(dashboard)/layout.tsx`
4. Verify `lucide-react` is installed for icons

---

## Section 15: Implementation Notes

- **API client pattern:** Create thin wrapper functions in `apps/web/src/lib/api/templates.ts` that call the existing STORY-F-4 endpoints. Each function handles auth headers (JWT from Supabase session) and returns typed responses.

```typescript
// apps/web/src/lib/api/templates.ts
import type { Template, TemplateCreateInput, TemplateUpdateInput, TemplateListQuery } from '@journey-os/types';

export async function listTemplates(
  query: TemplateListQuery,
  accessToken: string,
): Promise<{ data: Template[]; meta: { page: number; limit: number; total: number; total_pages: number } }> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.sharing_level) params.set('sharing_level', query.sharing_level);
  if (query.question_type) params.set('question_type', query.question_type);
  if (query.search) params.set('search', query.search);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/templates?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function createTemplate(input: TemplateCreateInput, accessToken: string): Promise<{ data: Template }> { /* ... */ }
export async function updateTemplate(id: string, input: TemplateUpdateInput, accessToken: string): Promise<{ data: Template }> { /* ... */ }
export async function deleteTemplate(id: string, accessToken: string): Promise<void> { /* ... */ }
export async function duplicateTemplate(id: string, newName: string | undefined, accessToken: string): Promise<{ data: Template }> { /* ... */ }
```

- **Mock preview generation:** The `TemplatePreview` component generates a descriptive outline from the template config without calling the LLM. Example logic:

```typescript
function generateMockPreview(template: Template): MockQuestionPreview {
  const diffLabel = template.difficulty_distribution.hard > 0.5 ? 'High difficulty' :
    template.difficulty_distribution.easy > 0.5 ? 'Low difficulty' : 'Moderate difficulty';
  const bloomLabel = `Bloom levels ${template.bloom_levels.join(', ')}`;
  const setting = template.prompt_overrides.clinical_setting ?? 'General clinical';

  return {
    stem_preview: `A ${diffLabel.toLowerCase()} ${template.question_type.replace(/_/g, ' ')} question targeting ${bloomLabel}`,
    vignette_preview: template.prompt_overrides.vignette_instructions ?? 'Standard clinical vignette',
    option_count: template.question_type === 'single_best_answer' ? 5 : 8,
    bloom_level_label: bloomLabel,
    difficulty_label: diffLabel,
    clinical_setting: setting,
    question_type_label: template.question_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  };
}
```

- **Sharing toggle:** Clicking the sharing badge on a card opens a small popover with the 4 sharing level options. Selecting one calls `PUT /api/v1/templates/:id` with `{ sharing_level: newLevel }`. This creates a new version (expected behavior from STORY-F-4).

- **Form validation:** Use Zod schemas on the client side matching the server-side schemas from STORY-F-4 (Appendix B). Key validations:
  - `name`: required, min 1, max 200
  - `difficulty_distribution`: easy + medium + hard must sum to 1.0 (tolerance 0.001)
  - `bloom_levels`: at least one selected, values 1-6
  - `question_type`: required, must be one of the three types

- **Path alias:** Import from `@web/components/...`, `@web/lib/...` in the web app. Import types from `@journey-os/types`.

- **No default exports:** All components use named exports. Exception: `page.tsx` uses `export default` as required by Next.js App Router.
