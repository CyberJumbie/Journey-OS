---
name: multi-step-wizard-pattern
tags: [wizard, multi-step, form, react, parent-owns-state, draft-persistence]
story: STORY-F-20
date: 2026-02-20
---
# Multi-Step Wizard Pattern

## Problem
Complex entity creation requires collecting data across multiple steps with validation,
navigation, draft persistence, and a review-before-submit flow.

## Solution

### Architecture
- **Parent organism** owns ALL form state as individual `useState` hooks
- **Step molecules** receive state + callbacks as props (controlled components)
- **StepIndicator atom** shows progress with completed/active/upcoming states
- **Draft persistence** via `localStorage` keyed by `${prefix}-${userId}`

### Parent Organism Structure
```tsx
export function EntityWizard({ userId }: Props) {
  const router = useRouter();
  const draftKey = `wizard-draft-${userId}`;

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1 state...
  // Step 2 state...

  // Draft load on mount
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    const draft = JSON.parse(raw) as DraftType;
    // Hydrate all state from draft
  }, [draftKey]);

  // Step validation functions
  function isStep1Valid(): boolean { /* ... */ }

  // Navigation
  function goNext() {
    if (!canProceed()) return;
    setCompletedSteps(prev => prev.includes(currentStep) ? prev : [...prev, currentStep]);
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
    saveDraft();
  }

  // Submit
  async function handleSubmit() {
    const res = await createEntity({ /* assembled payload */ });
    if (res.error) { setError(res.error.message); return; }
    localStorage.removeItem(draftKey);
    router.push(`/entity/${res.data!.id}`);
  }

  return (
    <>
      <StepIndicator steps={STEPS} currentStep={currentStep} completedSteps={completedSteps} />
      {currentStep === 1 && <Step1 {...step1Props} />}
      {currentStep === 2 && <Step2 {...step2Props} />}
      {/* ... */}
      <NavigationButtons />
    </>
  );
}
```

### Backend Controller (Separate from CRUD Controller)
```typescript
// Wizard controller orchestrates: validate → create parent → create children
export class EntityWizardController {
  async handleCreate(req: Request, res: Response): Promise<void> {
    const input = req.body as EntityCreateInput;

    // 1. Validate references (FK lookups)
    if (input.referenceId) {
      await this.#refRepo.findById(input.referenceId); // throws if missing
    }

    // 2. Create parent entity
    const parent = await this.#parentService.create({ ...flattenedFields, status: "draft" });

    // 3. Create children sequentially (each depends on parent ID)
    for (const child of input.children) {
      const created = await this.#childService.create(parent.id, child);
      // Create grandchildren...
    }

    // 4. Return summary response
    res.status(201).json({ data: { id: parent.id, child_count: n } });
  }
}
```

### Validation Middleware (Zod)
```typescript
const EntityCreateSchema = z.object({
  basic_info: z.object({ /* ... */ }),
  configuration: z.object({ /* ... */ }),
  structure: z.object({
    children: z.array(ChildSchema).min(1),
  }),
});

export function validateEntityCreate(req: Request, res: Response, next: NextFunction): void {
  const result = EntityCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ data: null, error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message } });
    return;
  }
  req.body = result.data;
  next();
}
```

### Async Code Uniqueness Check (Debounced)
```tsx
useEffect(() => {
  if (code.length < 3) { setAvailable(null); return; }
  setLoading(true);
  const timeout = setTimeout(async () => {
    const res = await checkCodeAvailability(code);
    if (res.data) setAvailable(res.data.available);
    setLoading(false);
  }, 500);
  return () => { clearTimeout(timeout); setLoading(false); };
}, [code]);
```

## When to Use
- Entity creation with 3+ logical groupings of fields
- Need for draft save/resume capability
- Review-before-submit requirement
- Children/grandchildren created alongside parent

## When NOT to Use
- Simple single-form creation (1-2 field groups)
- Inline editing of existing entities
- Bulk import flows (use batch-upload pattern instead)

## Key Decisions
- **Parent-owns-state** over form library: Simpler for multi-step, avoids form state fragmentation
- **Separate wizard controller**: Different payload shape and RBAC from CRUD controller
- **Sequential child creation** (not RPC transaction): Acceptable for wizard (small N, draft status)
- **ZodError uses `.issues`** not `.errors`: Common mistake, always use `.issues[0]?.message`
