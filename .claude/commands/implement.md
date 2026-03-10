# /implement — Implement the current story

Implement the story that was loaded via /story and planned via /plan.

## Pre-implementation checklist (run before writing a single line)

```bash
# 1. Confirm context packet is loaded
# If not: run /story P1-NNN first

# 2. Check current state
cat SESSION_STATE.md

# 3. Verify dependencies exist
cat SESSION_STATE.md | grep "DONE"
```

## Determine implementation path

### Frontend story?
Check: does the story create React components?
→ Use @frontend-specialist agent for component work
→ Follow Atomic Design: atoms → molecules → organisms → templates → page
→ Each component in its own folder with index.ts export

### Backend story?
Check: does the story create routes/controllers/services/repositories?
→ Use @backend-specialist agent for MVC layers
→ Always implement in order: repository → service → controller → route
→ Never skip layers

### Full-stack story?
→ Backend first (API contract defines frontend shape)
→ Then frontend hooks (useQuery/useMutation)
→ Then frontend components

### Pipeline story (P1-016 through P1-023)?
→ Use @pipeline-specialist agent
→ One node file per story
→ Load prompts from filesystem, never inline

### Ingestion story (P1-009 through P1-015)?
→ Use @ingestion-specialist agent
→ Markdown-first, classifier before extractor

---

## Atomic Design Implementation (frontend)

Before creating any component, answer:
1. What atomic level? (atom / molecule / organism / template / page)
2. Does it have ONE responsibility?
3. Will it be under 150 lines?

### File structure per component:
```
frontend/src/components/{level}/ComponentName/
  ComponentName.tsx     ← implementation
  ComponentName.test.tsx ← smoke test
  index.ts              ← export default ComponentName
```

### Atom template:
```tsx
// No state, no hooks, no fetch. HTML + Tailwind only.
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({ variant, children, onClick, disabled, loading }: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--navy)] text-white hover:bg-[var(--blue)]',
    secondary: 'border border-[var(--navy)] text-[var(--navy)]',
    ghost: 'text-[var(--gray-600)] hover:bg-[var(--cream)]',
    danger: 'bg-[var(--red)] text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-md px-4 py-2 font-sans text-sm transition-colors ${variants[variant]}`}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
```

### Hook template (organism data):
```typescript
// frontend/src/hooks/use{Resource}.ts
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: (): Promise<Course[]> => apiClient.get('/courses'),
  });
}
```

---

## Backend Implementation (MVC)

### Always implement in this order:
1. **Repository** — add the DB query method
2. **Service** — add the business logic method
3. **Controller** — add the request handler
4. **Route** — add the path + middleware
5. **Zod schema** — define the input validation

### New service method template:
```typescript
// In a Service class — NO DB queries here
async updateStatus(id: string, status: ItemStatus, user: AuthUser): Promise<AssessmentItemRow> {
  const item = await this.itemRepo.findById(id);
  if (!item) throw new NotFoundError('Assessment item not found');
  if (item.institution_id !== user.institutionId) throw new ForbiddenError();
  return this.dualWriteService.dualWrite(
    () => this.itemRepo.updateStatus(id, status),
    (updated) => this.graphRepo.setItemStatus(updated.neo4j_node_id, status)
  );
}
```

---

## During Implementation

### Check these as you go:
- [ ] TypeScript strict — no `any`
- [ ] Singletons from lib/ — never instantiate DB clients inline
- [ ] DualWrite for ALL cross-DB writes
- [ ] MERGE not CREATE in all Neo4j writes
- [ ] Prompts in .txt files (pipeline stories)
- [ ] File under 150 lines (frontend components)

### After every file:
```bash
npx tsc --noEmit 2>&1 | tail -5
```

---

## Post-implementation

```bash
# Lint
pnpm lint

# Type check
pnpm run typecheck

# Smoke test (from context packet)
# Run the specific smoke test for this story

# If all pass → proceed to /verify
```
