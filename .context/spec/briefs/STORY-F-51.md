# STORY-F-51: Generation Spec Wizard

**Epic:** E-19 (Workbench UI)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 7
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-19-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a generation specification wizard so that I can configure question parameters (type, difficulty, scope, constraints) before launching generation, ensuring the pipeline produces items that match my exact requirements.

## Acceptance Criteria
- [ ] Multi-step wizard form: Step 1 (Question Type), Step 2 (Difficulty & Bloom's), Step 3 (Scope), Step 4 (Constraints & Review)
- [ ] Question Type selector: Single Best Answer, Extended Matching, Sequential Set (USMLE Step formats)
- [ ] Difficulty selector: Easy / Medium / Hard with description tooltips
- [ ] Bloom's Level selector: Remember, Understand, Apply, Analyze, Evaluate, Create
- [ ] Scope selector: Course dropdown, SLO multi-select, Concept tag multi-select
- [ ] Constraints: max vignette length, required keywords, excluded topics
- [ ] Review step: summary of all selections before launching generation
- [ ] Form validation with inline errors (react-hook-form + zod, per-step)
- [ ] Wizard state preserved if user switches mode and comes back
- [ ] "Quick Generate" shortcut: pre-fills defaults and skips to review step
- [ ] 8-12 API tests: form validation, step navigation, state persistence, quick generate, submission
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/generation/GenerationSpecificationWizard.tsx` | `apps/web/src/app/(protected)/workbench/spec/page.tsx` | Replace inline styles with Tailwind design tokens; convert `export default` to named export (except page.tsx which requires default); replace hardcoded hex colors (`bg-blue-600`, `bg-green-600`, `bg-gray-200`) with design token classes; extract step components into atomic organisms; replace raw `useState` wizard state with `useWizardState` hook + `react-hook-form`; replace static mock gap analysis with API-driven data; convert `useNavigate` from react-router to Next.js `useRouter` |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/spec.types.ts` |
| Atoms | packages/ui | `src/atoms/step-indicator.tsx` |
| Molecules | packages/ui | `src/molecules/wizard-step.tsx`, `src/molecules/multi-select-tags.tsx` |
| Organisms | apps/web | `src/components/workbench/generation-wizard.tsx`, `src/components/workbench/wizard-steps/question-type-step.tsx`, `src/components/workbench/wizard-steps/difficulty-step.tsx`, `src/components/workbench/wizard-steps/scope-step.tsx`, `src/components/workbench/wizard-steps/review-step.tsx` |
| Hooks | apps/web | `src/hooks/use-wizard-state.ts` |
| Validation | apps/web | `src/lib/schemas/generation-spec.schema.ts` |
| Page | apps/web | `src/app/(protected)/workbench/spec/page.tsx` |
| Tests | apps/web | `src/__tests__/workbench/generation-wizard.test.tsx` |

## Database Schema
No new tables. Reads from existing tables for scope selectors:
- `courses` (id, name) -- course dropdown
- `slos` (id, title, course_id) -- SLO multi-select
- Neo4j `SubConcept`, `Concept` nodes -- concept tag multi-select

## API Endpoints
Wizard is frontend-only. Outputs a `GenerationSpec` to the existing SSE generation endpoint:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/generate` | Faculty+ | Submit GenerationSpec to SSE generation endpoint (exists) |
| GET | `/api/v1/courses` | Faculty+ | Course list for dropdown (exists) |
| GET | `/api/v1/courses/:courseId/slos` | Faculty+ | SLOs for multi-select (exists) |
| GET | `/api/v1/concepts?slo_id={sloId}` | Faculty+ | Concepts for multi-select (exists) |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-43 (Workbench SplitPane layout)
- **Cross-epic:** STORY-IA-14 (SLOs for scope selection), STORY-F-26 (concepts for scope selection)

## Testing Requirements
### API Tests (8-12)
1. Renders step 1 (Question Type) by default
2. Navigates to step 2 on Next when step 1 is valid
3. Prevents navigation to step 2 when step 1 is invalid
4. Navigates back from step 2 to step 1
5. Validates question type is selected in step 1
6. Validates difficulty and bloom level in step 2
7. Validates course is selected in step 3
8. Shows inline error messages for invalid fields
9. Quick Generate pre-fills defaults and skips to review step
10. Submits GenerationSpec on Generate button click in review step
11. Review step shows summary of all selections
12. Preserves wizard state when user switches mode and returns

## Implementation Notes
- Wizard uses `react-hook-form` with Zod schema validation per step. Single `useForm<GenerationSpec>()` instance; `trigger()` on Next validates current step fields only.
- Step navigation: linear with back/next, individually validated per step.
- Quick Generate: reads last-used config from localStorage, falls back to defaults (SBA, Medium, Apply, current course). Sets step to review.
- Wizard output is a `GenerationSpec` object sent to the SSE generation endpoint.
- Scope selectors fetch data from API: courses from CourseService, SLOs from SLOService, concepts from ConceptService.
- The wizard renders inside the chat panel area when in Generate mode, replacing the chat until config is complete.
- `StepIndicator` atom: horizontal 4-dot indicator. Active = Navy Deep, Completed = Green with checkmark, Pending = empty circle with border.
- `MultiSelectTags` molecule: wraps shadcn/ui `Command` + `Badge` for tag-style multi-select with search.
- Store wizard state in sessionStorage via `useWizardState` hook for persistence across mode switches.
- Before writing any migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
