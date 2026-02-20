# STORY-F-45: Batch Configuration Form

**Epic:** E-20 (Bulk Generation)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 14
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-20-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a batch configuration form to specify target count, scope, and difficulty distribution so that I can launch bulk generation with precise control over output parameters.

## Acceptance Criteria
- [ ] Form fields: target count (1-100), course scope, concept scope, question type, difficulty distribution
- [ ] Difficulty distribution: slider or input for % easy / % medium / % hard (must sum to 100%)
- [ ] Bloom level targeting: optional filter for specific Bloom levels
- [ ] SLO scope: select specific SLOs or "all SLOs in course"
- [ ] Template selection: optional generation template (integrates with STORY-F-49 when available)
- [ ] Validation: form-level Zod validation with clear error messages
- [ ] Preview: estimated generation time based on target count and current system load
- [ ] Submit creates batch job and navigates to progress view
- [ ] Form state managed with React Hook Form + Zod validation
- [ ] 8-12 API tests: config validation, difficulty distribution, scope combinations, edge cases
- [ ] TypeScript strict, named exports only, design tokens only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/operations/BulkOperations.tsx` | `apps/web/src/app/(protected)/workbench/batch/page.tsx` | Extract BatchConfigForm organism and DifficultyDistribution molecule; replace inline styles with Tailwind design tokens; use React Hook Form + Zod; convert to named exports; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/batch-config.types.ts` |
| Controller | apps/server | `src/controllers/generation/batch.controller.ts` |
| Route | apps/server | `src/routes/generation/batch.routes.ts` |
| View - Page | apps/web | `src/app/(protected)/workbench/batch/page.tsx` |
| View - Form | apps/web | `src/components/generation/batch-config-form.tsx` |
| View - Difficulty | apps/web | `src/components/generation/difficulty-distribution.tsx` |
| Validation | apps/server | `src/middleware/validation/batch-config.validation.ts` |
| Tests | apps/server | `src/controllers/generation/__tests__/batch.controller.test.ts` |

## Database Schema
No new tables. Submits batch job to `batch_jobs` table (STORY-F-39).

## API Endpoints
Uses `POST /api/v1/generation/batch` from STORY-F-39. This story implements the frontend form and server-side config validation.

### POST /api/v1/generation/batch (validation details)
**Validation Rules:**
```typescript
const BatchConfigSchema = z.object({
  courseId: z.string().uuid(),
  targetCount: z.number().int().min(1).max(100),
  scope: z.object({
    sloIds: z.array(z.string().uuid()).optional(),
    conceptIds: z.array(z.string().uuid()).optional(),
  }),
  questionType: z.enum(["single_best_answer", "extended_matching", "short_answer"]),
  difficultyDistribution: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }).refine(d => d.easy + d.medium + d.hard === 100, "Must sum to 100%"),
  bloomLevels: z.array(z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"])).optional(),
  templateId: z.string().uuid().optional(),
});
```

## Dependencies
- **Blocked by:** STORY-F-39 (batch pipeline exists to submit to)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: valid config accepted, target count boundaries (1 and 100), difficulty distribution sum != 100 rejected, invalid question type rejected, UUID validation on scope IDs, optional bloom levels, optional template ID, estimated time calculation
- 0 E2E tests
- Use `afterEach(() => cleanup())` in component tests.

## Implementation Notes
- Difficulty distribution component: three linked sliders/inputs that auto-adjust to maintain 100% total.
- Course and SLO selectors reuse existing select components from workbench (STORY-F-43).
- Estimated generation time: `target_count * avg_generation_time / concurrency_limit`.
- Form state managed with React Hook Form + Zod validation. Use plain `.string().max()` validators and provide defaults via RHF's `defaultValues` — avoid `.optional().default("")` pattern.
- Cast Zod schema `as any` in `zodResolver()` if `@hookform/resolvers` version mismatch with Zod v4.
- Never use inline `style={{}}` for static values.
- Next.js page requires `export default` (exception).
