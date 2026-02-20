# Plan: STORY-F-20 — Course Creation Wizard

## Critical Deviations from Brief

The brief assumes several files don't exist yet. Codebase exploration reveals:

| Brief Says | Reality | Action |
|------------|---------|--------|
| Create `course.error.ts` | **Already exists** with `DuplicateCourseCodeError`, `CourseNotFoundError`, etc. | ADD `CourseValidationError` + `DirectorNotFoundError` to existing file |
| Create `CourseController` | **Already exists** at `controllers/course/course.controller.ts` with `handleCreate`, `handleList`, etc. | ADD `handleCreateWizard()` + `handleCheckCode()` methods to existing controller |
| Create `course.routes.ts` | Routes are **inline in `index.ts`** (no separate route files in codebase) | ADD new routes inline in `index.ts`, following existing pattern |
| `packages/ui/src/components/atoms/` | Actual path is `packages/ui/src/atoms/` | Use correct path |
| Section input uses `name` field | `HierarchyService.createSection()` expects `title` (not `name`) | Map `name` -> `title` in controller orchestration, OR define wizard types with `title` |
| `existsByCode(code)` scoped per institution | `CourseRepository.existsByCode()` takes only `code` (no `institution_id`) | Add `existsByCodeAndInstitution(code, institutionId)` to repository |
| RBAC: `AuthRole.FACULTY` | Existing course routes use `rbac.requireCourseDirector()` | Wizard should use `rbac.require(AuthRole.FACULTY)` since any faculty can create courses |

## Tasks (refined from brief)

### Phase 1: Types (packages/types)
| # | Task | File | Action |
|---|------|------|--------|
| 1 | Define `CourseCreateInput`, `WizardStepDefinition`, `CourseWizardDraft`, etc. | `packages/types/src/course/course-create.types.ts` | CREATE |
| 2 | Add barrel export | `packages/types/src/course/index.ts` | UPDATE (add `export * from "./course-create.types"`) |
| 3 | Rebuild types package | `packages/types/tsconfig.json` | RUN `tsc -b packages/types/tsconfig.json` |

### Phase 2: Errors (apps/server)
| # | Task | File | Action |
|---|------|------|--------|
| 4 | Add `CourseValidationError` + `DirectorNotFoundError` | `apps/server/src/errors/course.error.ts` | UPDATE (append classes) |
| 5 | Verify barrel exports new errors | `apps/server/src/errors/index.ts` | UPDATE if needed |

### Phase 3: Validation Middleware (apps/server)
| # | Task | File | Action |
|---|------|------|--------|
| 6 | Create Zod validation for `CourseCreateInput` | `apps/server/src/middleware/course.validation.ts` | CREATE |

### Phase 4: Repository (apps/server)
| # | Task | File | Action |
|---|------|------|--------|
| 7 | Add `existsByCodeAndInstitution(code, institutionId)` method | `apps/server/src/repositories/course.repository.ts` | UPDATE |

### Phase 5: Controller (apps/server)
| # | Task | File | Action |
|---|------|------|--------|
| 8 | Add `handleCreateWizard()` method — orchestrates course + sections + sessions + CD | `apps/server/src/controllers/course/course.controller.ts` | UPDATE |
| 9 | Add `handleCheckCode()` method | `apps/server/src/controllers/course/course.controller.ts` | UPDATE |
| 10 | Update `#handleError()` to handle new error types | `apps/server/src/controllers/course/course.controller.ts` | UPDATE |

### Phase 6: Routes (apps/server)
| # | Task | File | Action |
|---|------|------|--------|
| 11 | Register `POST /api/v1/courses/wizard` + `GET /api/v1/courses/check-code` | `apps/server/src/index.ts` | UPDATE |

### Phase 7: StepIndicator Atom (packages/ui)
| # | Task | File | Action |
|---|------|------|--------|
| 12 | Build `StepIndicator` component | `packages/ui/src/atoms/step-indicator.tsx` | CREATE |
| 13 | Export from barrel | `packages/ui/src/index.ts` | UPDATE |

### Phase 8: Frontend Components (apps/web)
| # | Task | File | Action |
|---|------|------|--------|
| 14 | Build `CourseWizardStep1` (Basic Info) | `apps/web/src/components/molecules/CourseWizardStep1.tsx` | CREATE |
| 15 | Build `CourseWizardStep2` (Configuration) | `apps/web/src/components/molecules/CourseWizardStep2.tsx` | CREATE |
| 16 | Build `CourseWizardStep3` (Sections & Sessions) | `apps/web/src/components/molecules/CourseWizardStep3.tsx` | CREATE |
| 17 | Build `CourseWizardStep4` (CD Assignment) | `apps/web/src/components/molecules/CourseWizardStep4.tsx` | CREATE |
| 18 | Build `CourseWizardStep5` (Review & Confirm) | `apps/web/src/components/molecules/CourseWizardStep5.tsx` | CREATE |
| 19 | Build `CourseWizard` organism | `apps/web/src/components/organisms/CourseWizard/CourseWizard.tsx` | CREATE |
| 20 | Build API client functions | `apps/web/src/lib/api/courses.ts` | CREATE |
| 21 | Create course creation page | `apps/web/src/app/(dashboard)/faculty/courses/new/page.tsx` | CREATE |

### Phase 9: Tests
| # | Task | File | Action |
|---|------|------|--------|
| 22 | Write 14 controller tests | `apps/server/src/tests/course.controller.test.ts` | CREATE |
| 23 | Write 1 E2E test | `apps/web/e2e/course-creation.spec.ts` | CREATE |

## Implementation Order

Types -> Rebuild types -> Errors -> Validation middleware -> Repository -> Controller -> Routes -> StepIndicator atom -> Step molecules -> Wizard organism -> API client -> Page -> API tests -> E2E

## Patterns to Follow

| Pattern | Doc | Usage |
|---------|-----|-------|
| Registration Wizard | `docs/solutions/registration-wizard-pattern.md` | Parent-owns-state wizard, step components as stateless renderers |
| React Hook Form + Zod | `docs/solutions/react-hook-form-zod-pattern.md` | Per-step form validation with `zodResolver`; NO `.optional().default("")` |
| Supabase Transactional RPC | `docs/solutions/supabase-transactional-rpc-pattern.md` | **Decision needed**: wizard creates course + N sections + N sessions = multi-table. Consider RPC for atomicity. However, brief shows sequential inserts with service calls — acceptable if rollback-on-failure is handled. |
| Supabase Mock Factory | `docs/solutions/supabase-mock-factory.md` | Test mock patterns for controller tests |
| Repository Pattern | `docs/solutions/repository-pattern.md` | `.select().single()` on all write operations |

## Key Architecture Decisions

### 1. Wizard Endpoint: New `POST /courses/wizard` vs Reuse `POST /courses`

**Recommendation: New `POST /api/v1/courses/wizard`**
- The existing `handleCreate` accepts a flat `CreateCourseRequest` (just course fields)
- The wizard sends a nested `CourseCreateInput` with `basic_info`, `configuration`, `structure`, `director`
- Different payload shapes → different endpoint avoids breaking existing consumers
- Different RBAC: existing uses `requireCourseDirector()`, wizard needs `require(AuthRole.FACULTY)`

### 2. Atomicity: Sequential Service Calls vs RPC

**Recommendation: Sequential with error handling (as brief specifies)**
- Course creation is a new flow — partial state (course created but no sections) can be cleaned up
- RPC would require a large Postgres function accepting JSONB arrays of sections/sessions
- The brief explicitly shows sequential `courseService.create()` → loop `hierarchyService.createSection()` → loop `hierarchyService.createSession()`
- Acceptable trade-off for this story; can upgrade to RPC later if needed

### 3. Field Name Mapping: `name` vs `title`

- Brief types use `name` for sections/sessions
- `HierarchyService.createSection()` expects `title` (from `CreateSectionRequest`)
- **Map in controller**: `{ title: section.name, position: section.position }` when calling `hierarchyService.createSection()`

### 4. Controller Injection

- Existing `CourseController` takes only `CourseService`
- Wizard needs `CourseService` + `HierarchyService` + profile lookup
- **Options**: (a) Inject `HierarchyService` into existing controller, (b) Create separate `CourseWizardController`
- **Recommendation: (b) Create `CourseWizardController`** — keeps existing controller unchanged, single responsibility

## Testing Strategy

### API Tests (14 tests in `apps/server/src/tests/course.controller.test.ts`)
- `POST /api/v1/courses/wizard`:
  - Creates course with sections, sessions, CD (201)
  - Creates course without CD (201)
  - Rejects missing name (400)
  - Rejects duplicate code (409)
  - Rejects no sections (400)
  - Rejects invalid session time range (400)
  - Rejects invalid session_type (400)
  - Rejects invalid term (400)
  - Rejects non-existent CD (404)
  - Returns 401 unauthenticated
  - Returns 403 below faculty
  - Sets status to draft
- `GET /api/v1/courses/check-code`:
  - Returns available: true (200)
  - Returns available: false (200)

### E2E (1 test — `apps/web/e2e/course-creation.spec.ts`)
- Faculty completes full 5-step wizard and creates a course

## Figma Make

- [ ] Prototype first
- [x] Code directly (wizard is form-heavy, standard shadcn/ui components)

## Risks / Edge Cases

1. **STORY-F-11 dependency** — Must verify `sections`/`sessions` tables and `HierarchyService` are complete and working. If not, this story is blocked.
2. **`courses` table schema** — Brief assumes columns like `credit_hours`, `max_enrollment`, `is_required`, `prerequisites`, `learning_objectives`, `tags` exist. Need to verify via `list_tables` before writing migration/DDL. May need a migration to add missing columns.
3. **Section `name` vs `title`** — Type mismatch between wizard input types and existing `CreateSectionRequest`. Must map at controller boundary.
4. **Session `name` vs `title`** — Same mapping issue for sessions.
5. **`existsByCode` lacks institution scoping** — Current repo method is global. Need to add institution-scoped variant.
6. **localStorage draft + auth** — Draft key uses `userId`. Need to ensure `userId` is available on wizard mount (from auth context). Handle case where user is not yet authenticated (redirect to login).
7. **Course code regex** — Brief enforces `^[A-Z0-9-]+$` (uppercase only). Step 1 form should auto-uppercase input or clearly indicate format.
8. **Large payload** — Wizard submits potentially many sections/sessions. No explicit payload size limit defined. Express default is 100kb; may need to increase for courses with many sessions.
9. **Barrel file stripping** — PostToolUse eslint hook may strip exports from `index.ts` barrels. Must re-read and verify after every barrel edit (per CLAUDE.md rule).

## Acceptance Criteria (verbatim from brief)

- [ ] Multi-step wizard at `/faculty/courses/new` with 5 steps: Basic Info, Configuration, Structure, CD Assignment, Review
- [ ] Step indicator shows progress (upcoming, active, completed states)
- [ ] Step 1: Course name, code (with async uniqueness check), description, year, term, program
- [ ] Step 1: Code uniqueness check debounced 500ms, shows availability badge
- [ ] Step 2: Credit hours, max enrollment, is_required, prerequisites, learning objectives, tags
- [ ] Step 3: Section builder with add/remove/reorder; session builder within each section
- [ ] Step 4: Course Director search-and-select from institution users (optional)
- [ ] Step 5: Full summary of all steps with "Edit" links to jump back
- [ ] Draft persistence: wizard state saved to localStorage, resume prompt on return
- [ ] Form validation at each step prevents proceeding with invalid data
- [ ] POST `/api/v1/courses` creates course with sections, sessions, and CD in one request
- [ ] Course code uniqueness enforced (409 DUPLICATE_COURSE_CODE)
- [ ] Course created with status "draft"
- [ ] Success redirects to course detail page
- [ ] 14 API tests pass
- [ ] 1 E2E test passes (full wizard completion)
- [ ] TypeScript strict, named exports only (except page.tsx default export)
- [ ] Design tokens only, no hardcoded styling values
- [ ] Atomic Design: StepIndicator atom, Step molecules, CourseWizard organism
- [ ] Custom error classes: `CourseValidationError`, `DuplicateCourseCodeError`

## Pre-Implementation Checklist

- [ ] Verify `sections` and `sessions` tables exist via Supabase MCP `list_tables`
- [ ] Verify `courses` table columns include `credit_hours`, `max_enrollment`, `is_required`, `prerequisites`, `learning_objectives`, `tags`, `course_director_id` (or plan migration)
- [ ] Verify unique index on `courses(code, institution_id)` exists (or `courses(code)`)
- [ ] Verify `HierarchyService.createSection()` and `createSession()` signatures match expected input
- [ ] Verify shadcn/ui components installed: Input, Textarea, Select, Checkbox, Button, Card, Badge, Skeleton
