# STORY-F-20: Course Creation Wizard

**Epic:** E-08 (Course CRUD & Hierarchy)
**Feature:** F-04
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-08-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a multi-step course creation wizard so that I can configure all course details, structure sections, and assign a Course Director in a guided flow.

## Acceptance Criteria
- [ ] Multi-step wizard form: Step 1 (basic info), Step 2 (configuration), Step 3 (sections/sessions), Step 4 (CD assignment), Step 5 (review & confirm)
- [ ] Form validation at each step with clear error messages (Zod schemas per step)
- [ ] Draft persistence: wizard state saved to localStorage so users can resume
- [ ] Course code uniqueness check (async validation against API)
- [ ] Section/session builder with add/remove/reorder capabilities
- [ ] Course Director search-and-select from institution users
- [ ] API controller: WizardController (not the CRUD controller) with Zod validation middleware
- [ ] Confirmation step shows full summary before submission
- [ ] Success redirect to course detail view
- [ ] 12-15 API tests for controller validation, creation flow, error cases
- [ ] 1 E2E test: full wizard completion from start to course creation
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/courses/CreateCourse.tsx` | `apps/web/src/app/(protected)/courses/create/page.tsx` | Convert from React Router to Next.js App Router. Extract wizard steps into separate molecules. Use react-hook-form + zod per step. Replace inline styles with design tokens. |
| `.context/source/05-reference/app/app/pages/faculty/CreateEditCourse.tsx` | (reference for form fields) | Cross-reference for expected form fields and layout. |
| `.context/source/05-reference/app/app/pages/courses/CourseReady.tsx` | `apps/web/src/components/course/course-ready.tsx` | Success/confirmation page after wizard completion. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Controller | apps/server | `src/controllers/course/course-wizard.controller.ts` |
| Route | apps/server | `src/routes/course.routes.ts` (extend) |
| Validation | apps/server | `src/middleware/course-wizard.validation.ts` |
| View | apps/web | `src/app/(protected)/courses/create/page.tsx` |
| Components | apps/web | `src/components/course/course-wizard.tsx`, `src/components/course/wizard-step-basic.tsx`, `src/components/course/wizard-step-config.tsx`, `src/components/course/wizard-step-sections.tsx`, `src/components/course/wizard-step-director.tsx`, `src/components/course/wizard-step-review.tsx`, `src/components/course/course-ready.tsx` |
| Atoms | packages/ui | `src/atoms/step-indicator.tsx` |
| Hooks | apps/web | `src/hooks/use-course-wizard.ts` |
| Tests | apps/server | `src/controllers/course/__tests__/course-wizard.controller.test.ts` |
| E2E | apps/web | `e2e/course-creation.spec.ts` |

## Database Schema
No new tables. Uses existing `courses`, `sections`, `sessions` tables from STORY-F-1 and STORY-F-11.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/courses/wizard` | Faculty+ | Submit full wizard payload (atomic creation) |
| GET | `/api/v1/courses/code-check?code=X&program_id=Y` | Faculty+ | Check course code uniqueness |
| GET | `/api/v1/users?institution_id=X&role=faculty` | Faculty+ | Search users for CD assignment |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-11 (hierarchy models for section/session builder)
- **Cross-lane:** STORY-U-3 (RBAC for endpoint protection)

## Testing Requirements
### API Tests (12-15)
1. Wizard submit with valid data creates course + sections + sessions atomically
2. Wizard submit with invalid basic info returns step-specific validation errors
3. Wizard submit with duplicate course code returns 409
4. Course code uniqueness check returns available/taken
5. Wizard submit creates DualWrite to Neo4j
6. Section builder: sections created with correct positions
7. Session builder: sessions associated with correct sections
8. CD assignment: user validated as faculty in same institution
9. Wizard submit without required fields returns 422
10. Wizard submit with invalid credit range returns 422
11. Atomic creation: failure mid-transaction rolls back all changes
12. Response includes created course ID for redirect

### E2E Tests (1)
1. Full wizard flow: fill all steps, submit, verify course created, redirect to detail

## Implementation Notes
- See `docs/solutions/multi-step-wizard-pattern.md` for the WizardController pattern.
- Use a separate WizardController (not the CRUD controller) with Zod validation middleware.
- Atomic Design: Wizard is an Organism composed of Step Molecules and Atom inputs.
- Use design tokens for all spacing, colors, typography.
- StepIndicator atom shows progress through wizard steps.
- Draft state stored in localStorage with key `course-wizard-draft-{userId}`.
- Multi-table writes that must be atomic -> use `supabase.rpc()` with a Postgres function. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Custom error classes: `CourseValidationError`, `DuplicateCourseCodeError`.
- Zod schema: use plain `.string().max()` validators, provide defaults via RHF's `defaultValues`. Do not use `.optional().default("")`.
- See existing `apps/server/src/controllers/course/course-wizard.controller.ts`.
- Every Express controller handler MUST extract `user.id` from `req` and pass it to the service layer.
