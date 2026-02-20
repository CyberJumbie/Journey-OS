# Plan: STORY-F-14 — Template Management Page

## Summary

Frontend-only story: build the template management page at `/faculty/templates` with card grid, create/edit form dialog, mock preview, filters, search, and delete confirmation. All backend CRUD endpoints exist from STORY-F-4.

## Critical Discovery: No shadcn/ui Installed

The brief assumes shadcn/ui (Card, Dialog, Form, Select, Slider, Badge, Sheet, Skeleton, DropdownMenu). **None are installed.** The codebase uses Tailwind CSS directly + Lucide React icons + custom components.

**Decision needed:** Install shadcn/ui components, or build with plain Tailwind (matching existing dashboard patterns)?

**Recommendation:** Install the required shadcn/ui components. The brief explicitly lists them, `@hookform/resolvers` is already installed (implies shadcn Form was intended), and these components provide accessibility (focus trapping, keyboard nav, ARIA) that would be expensive to hand-build. The existing dashboard components were built before shadcn was planned — this story is the natural point to introduce it.

**shadcn/ui components to install (10):**
- `card`, `dialog`, `form`, `input`, `textarea`, `select`, `button`, `dropdown-menu`, `badge`, `sheet`, `skeleton`, `checkbox`, `slider`, `popover`

**Note:** Also need `@tanstack/react-query` is NOT installed. Data fetching will use the existing `fetch` + `useState` + `useCallback` pattern matching `useActivityFeed` and `useDashboardKpis`.

---

## Tasks (from brief, with refinements)

| # | Task | File | Notes |
|---|------|------|-------|
| 0 | Install shadcn/ui CLI + required components | `apps/web/` | `pnpm --filter web dlx shadcn@latest init` then add 14 components |
| 1 | Create `MockQuestionPreview` local type | `apps/web/src/lib/types/template-preview.types.ts` | Small file, only UI-local type |
| 2 | Create API client functions | `apps/web/src/lib/api/templates.ts` | Thin wrappers around fetch + bearer token. Match existing hook fetch pattern. |
| 3 | Create `useTemplates` hook | `apps/web/src/hooks/use-templates.ts` | List, create, update, delete, duplicate. Uses `useState`/`useCallback` pattern like `useActivityFeed`. |
| 4 | Build `SharingLevelBadge` atom | `apps/web/src/components/template/SharingLevelBadge.tsx` | Lucide icons: Lock, Users, Building, Globe. Badge component from shadcn. |
| 5 | Build `DifficultyDistributionInput` molecule | `apps/web/src/components/template/DifficultyDistributionInput.tsx` | 3 number inputs, sum validation (tolerance 0.001), auto-adjust. Uses RHF `useFormContext`. |
| 6 | Build `TemplateCard` molecule | `apps/web/src/components/template/TemplateCard.tsx` | Card with name, description, type badge, sharing badge, kebab menu. DropdownMenu for actions. |
| 7 | Build `TemplateFilters` molecule | `apps/web/src/components/template/TemplateFilters.tsx` | Select for sharing level, question type. Search input with 300ms debounce. |
| 8 | Build `TemplateForm` organism | `apps/web/src/components/template/TemplateForm.tsx` | Dialog with RHF + Zod. Create/edit modes. All fields from brief Section 6. Collapsible sections for scope, prompt overrides, metadata. |
| 9 | Build `TemplatePreview` molecule | `apps/web/src/components/template/TemplatePreview.tsx` | Sheet (slide-over). Mock preview generation from template config. No LLM call. |
| 10 | Build `TemplateGrid` organism | `apps/web/src/components/template/TemplateGrid.tsx` | Responsive grid (1/2/3 cols). Empty state + no-results state. Skeleton loading state. |
| 11 | Build `TemplateDeleteDialog` molecule | `apps/web/src/components/template/TemplateDeleteDialog.tsx` | Confirmation dialog with destructive button. |
| 12 | Build template management page | `apps/web/src/app/(dashboard)/faculty/templates/page.tsx` | Page component orchestrating all pieces. `export default` (Next.js exception). |
| 13 | Add sidebar nav link for Templates | `apps/web/src/components/dashboard/dashboard-sidebar.tsx` | Add "Templates" link under faculty section |
| 14 | Write component tests (10 tests) | `apps/web/src/components/template/__tests__/template-management.test.ts` | vitest + @testing-library/react |

**Total files:** ~14 new + 1 edit (sidebar)

---

## Implementation Order

1. **Install shadcn/ui** (Task 0) — prerequisite for all components
2. **Types** (Task 1) — `MockQuestionPreview` local type
3. **API client** (Task 2) — fetch wrappers
4. **Hook** (Task 3) — `useTemplates` state management
5. **Atoms** (Tasks 4) — `SharingLevelBadge`
6. **Molecules** (Tasks 5, 6, 7, 9, 11) — `DifficultyDistributionInput`, `TemplateCard`, `TemplateFilters`, `TemplatePreview`, `TemplateDeleteDialog`
7. **Organisms** (Tasks 8, 10) — `TemplateForm`, `TemplateGrid`
8. **Page** (Task 12) — Orchestration
9. **Nav** (Task 13) — Sidebar link
10. **Tests** (Task 14) — Component tests

---

## Patterns to Follow

- `docs/solutions/react-hook-form-zod-pattern.md` — Zod schema with plain `.string()` validators, defaults via RHF `defaultValues`, NO `.optional().default("")`
- Existing hook pattern from `useActivityFeed` / `useDashboardKpis` — `useState` + `useCallback` + `fetch` with bearer token from `createBrowserClient().auth.getSession()`
- `@web/*` path alias (NOT `@/*`)
- Named exports only (except `page.tsx`)
- Design tokens via Tailwind classes, no hardcoded hex/font/spacing
- JS `#private` fields if any class-based components (unlikely — all React FC)
- `fetch().json()` returns `unknown` — cast with `as` per CLAUDE.md rule

---

## Form Validation Schema

```typescript
// apps/web/src/lib/validations/template.validation.ts
import { z } from "zod";

export const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000),
  question_type: z.enum(["single_best_answer", "extended_matching", "sequential_item_set"]),
  difficulty_distribution: z.object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
  }).refine(d => Math.abs(d.easy + d.medium + d.hard - 1.0) < 0.001, {
    message: "Difficulty distribution must sum to 1.0",
  }),
  bloom_levels: z.array(z.number().min(1).max(6)).min(1, "Select at least one Bloom level"),
  sharing_level: z.enum(["private", "shared_course", "shared_institution", "public"]),
  scope_config: z.object({
    course_id: z.string().optional(),
    usmle_systems: z.array(z.string()).optional(),
  }),
  prompt_overrides: z.object({
    vignette_instructions: z.string().optional(),
    stem_instructions: z.string().optional(),
    clinical_setting: z.string().optional(),
  }),
  metadata: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;
```

---

## Testing Strategy

### Component Tests (10 tests in vitest + @testing-library/react)

1. `TemplateGrid` — renders template cards in grid layout (3 fixtures → 3 cards)
2. `TemplateGrid` — shows empty state CTA when no templates
3. `TemplateGrid` — shows "no results" when filters return empty
4. `TemplateCard` — displays correct sharing level badge icon
5. `TemplateCard` — shows kebab menu with 4 action items
6. `TemplateForm` — validates difficulty distribution sums to 1.0
7. `TemplateForm` — submits create form with valid data
8. `TemplateForm` — pre-populates fields in edit mode
9. `TemplateFilters` — filters by sharing level
10. `TemplateFilters` — debounces search input (300ms)

### Mock Strategy
- `vi.hoisted()` for mock fetch declarations
- Mock `createBrowserClient` to return a fake session with access token
- Mock `fetch` to intercept API calls and return fixture data

### E2E
Not required per brief — deferred to Generation Workbench (E-20).

---

## Figma Make

- [ ] Prototype first
- [x] Code directly (brief provides full component hierarchy and specs)

---

## Risks / Edge Cases

1. **shadcn/ui initialization** — First time in the monorepo. May need to configure `components.json` path aliases to use `@web/*` instead of default `@/*`. Tailwind v4 compatibility must be verified.
2. **No existing `components/ui/` dir** — shadcn init will create it. Existing dashboard components won't conflict (they're in `components/dashboard/`).
3. **Difficulty distribution auto-adjust** — Proportional adjustment when one value changes can cause floating-point drift. Use `Math.round(x * 100) / 100` for display values.
4. **Type reconciliation** — Brief shows `TemplateCreateInput` / `TemplateUpdateInput` but actual types package exports `CreateTemplateRequest` / `UpdateTemplateRequest`. Must use actual exported names.
5. **Response shape** — Backend returns `{ data: T, error: null }`. Must handle error case: `{ data: null, error: { code, message } }`.
6. **Sharing toggle creates new version** — Brief confirms PUT creates a new version. User should see version increment after sharing level change.
7. **React 19 constraints** — No `setState` inside `useEffect` (use patterns from `docs/solutions/react19-state-reset-patterns.md`). No ref access during render.

---

## Pre-Implementation Checklist

- [ ] Verify template CRUD endpoints respond correctly (STORY-F-4 complete)
- [ ] Verify `packages/types/src/template/template.types.ts` exports match what API client needs
- [ ] Initialize shadcn/ui in `apps/web/`
- [ ] Install required shadcn components
- [ ] Verify `lucide-react` is installed (confirmed: `^0.575.0`)
- [ ] Verify dashboard layout exists (confirmed: `apps/web/src/app/(dashboard)/layout.tsx`)

---

## Acceptance Criteria (verbatim from brief)

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
