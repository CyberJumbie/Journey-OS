# Context Packet: Epic 1.4 — Workbench MVP
# Stories: P1-024 through P1-029 | Weeks 7–8
# SELF-CONTAINED: Everything needed is inlined here. No reference chasing.

---

## WHAT THIS EPIC DELIVERS

A faculty member can log in → select MEDI-531 → open the QuestWorkbench →
ask Claude to generate a question → watch it stream → approve it → see it in the question bank.

**Exit gate:** End-to-end demo: login → workbench → generate → approve → view in bank.

---

## ATOMIC DESIGN BREAKDOWN FOR THIS EPIC

These screens decompose as follows. Build bottom-up (atoms → organisms → templates → page).

```
P1-024 Auth Flow:
  Atoms:    InputField, PasswordInput, Button (primary + loading state)
  Molecules: FormField (label + input + error), LoginForm, RegisterForm
  Organism:  AuthCard (form + logo + link)
  Template:  AuthTemplate (centered card, cream background)
  Page:      app/(auth)/login/page.tsx

P1-025 Course Selection:
  Atoms:    Badge (course code), ProgressBar (concept coverage)
  Molecules: CourseMetaRow (code + term + counts), EmptyState
  Organism:  CourseCard (meta + progress + action), CourseGrid
  Template:  DashboardTemplate (Sidebar + Header + content area)
  Page:      app/(faculty)/courses/page.tsx

P1-026 + P1-027 QuestWorkbench (THE rewrite):
  Atoms:    StreamingText (character-by-character), OptionLabel (A-E), ValidationBadge
  Molecules: OptionRow (label + text + rationale), ValidationResult
  Organisms: 
    ChatPanel (CopilotChat + styling, 45% width)
    QuestionPreviewPanel (streaming vignette/stem/options, 55% width)
    StateDisplay (renders WorkbenchState progressively)
  Template:  WorkbenchTemplate (split-pane, chat left, preview right)
  Page:      app/(faculty)/workbench/page.tsx

P1-028 Approve/Reject:
  Atoms:    Button (variant=success, variant=danger)
  Molecules: ApproveRejectBar (two buttons + confirmation message)
  (adds to QuestionPreviewPanel organism, visible when pipelineStatus==='completed')

P1-029 Question Bank:
  Atoms:    TruncatedText, StatusBadge, BloomBadge
  Molecules: QuestionRow (truncated vignette + status + bloom + date)
  Organism:  QuestionTable (sortable, filterable, paginated), FilterBar
  Template:  DashboardTemplate (reused)
  Page:      app/(faculty)/items/page.tsx
```

---

## STORY ACCEPTANCE CRITERIA

### P1-024: Auth Flow
- `/login` — email + password form → `supabase.auth.signInWithPassword()`
- `/register` — email + password + name + role (faculty only in Phase 1)
- JWT custom claims: `{ role, institution_id, is_course_director }` — set via DB trigger
- Protected routes: redirect to `/login` if no session
- Backend `authMiddleware`: validates JWT, extracts `{ userId, role, institutionId, is_course_director }`
- Logout button in Header organism
- Use `@supabase/ssr` for Next.js App Router cookie-based sessions
- No social auth, no magic links
- For Phase 1: seed one institution + one faculty user manually (SQL)

### P1-025: Course Selection
- `/courses` — grid of CourseCards
- Each card shows: course code, title, SubConcept count (from Neo4j), item count (from Supabase)
- Click → navigate to `/workbench?courseId={id}`
- Data: `GET /api/v1/courses` → `{ id, code, title, term, subconcept_count, item_count }`
- Empty state: "No courses yet. Upload a syllabus to get started."
- Phase 1: only MEDI-531 exists (seeded)
- `useQuery` hook in `useCourses.ts` — no bare fetch() in CourseGrid component

### P1-026: QuestWorkbench — Chat Panel
This component is a **complete rewrite** of the prototype's form-based QuestWorkbench.

```tsx
// frontend/src/components/organisms/QuestWorkbench/QuestWorkbench.tsx
import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

// Wrap at layout level (already in providers):
// <CopilotKit runtimeUrl="/api/copilotkit">

export function QuestWorkbench({ courseId }: { courseId: string }) {
  return (
    <div className="flex h-full">
      <ChatPanel courseId={courseId} />      {/* 45% width */}
      <QuestionPreviewPanel />               {/* 55% width */}
    </div>
  );
}
```

Chat panel requirements:
- `<CopilotChat>` with custom styles (cream bg, navy text)
- Sends courseId in context via `useCopilotReadable`
- TEXT_MESSAGE events render as assistant messages
- Progress messages show: "Starting...", "Found N chunks...", "Writing vignette...", "Done!"

### P1-027: Question Preview Panel
```tsx
import { useCoAgent } from '@copilotkit/react-core';

function QuestionPreviewPanel() {
  const { state } = useCoAgent<WorkbenchState>({ name: 'journey_generation' });

  if (!state?.vignette) return <EmptyPreview />;

  return (
    <div>
      <StreamingVignette text={state.vignette} />
      {state.stem && <QuestionStem text={state.stem} />}
      {state.options?.map(o => <OptionRow key={o.label} option={o} />)}
      {state.validationResults?.length > 0 && <ValidationSummary results={state.validationResults} />}
      {state.pipelineStatus === 'completed' && <ApproveRejectBar itemId={state.itemId} />}
    </div>
  );
}
```

Typography:
- Vignette: `font-serif` (Lora), comfortable reading size
- Stem: `font-sans` bold
- Options: `font-sans` regular

### P1-028: Approve/Reject
- Only visible when `pipelineStatus === 'completed'`
- Approve: `PATCH /api/v1/items/:id` → `{ status: 'approved' }` via DualWriteService
- Reject: `PATCH /api/v1/items/:id` → `{ status: 'rejected' }` via DualWriteService
- After action: show "✓ Approved" or "✗ Rejected" confirmation → clear preview after 2s
- Uses `useMutation` from TanStack Query (invalidates `assessment-items` query)

### P1-029: Question Bank View
- `/items` page — table of `assessment_items`
- Columns: vignette (first 100 chars), stem (first 80 chars), Bloom level, USMLE system, status badge, date
- Filters: course dropdown, status dropdown (all / draft / approved / rejected)
- Sort: date desc (default), status
- Click row → expand to see full question + all 5 options
- Count in sidebar: "Items (N)"
- Pagination: 20 per page

Endpoint: `GET /api/v1/items?courseId=&status=&page=&limit=20`
Response shape (backend MUST return this):
```typescript
interface ItemListResponse {
  items: Array<{
    id: string;
    vignette: string;       // full text
    stem: string;           // full text
    bloom_level: number;
    usmle_system: string;
    status: ItemStatus;
    created_at: string;
    options: Array<{
      id: string;
      label: string;
      option_text: string;
      is_correct: boolean;
      distractor_rationale: string;
    }>;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

---

## FILE MAP

```
frontend/src/app/(auth)/login/page.tsx                      ← P1-024
frontend/src/app/(auth)/register/page.tsx                   ← P1-024
frontend/src/app/(faculty)/courses/page.tsx                 ← P1-025
frontend/src/app/(faculty)/workbench/page.tsx               ← P1-026+027
frontend/src/app/(faculty)/items/page.tsx                   ← P1-029

frontend/src/components/atoms/Badge/
frontend/src/components/atoms/Button/
frontend/src/components/atoms/InputField/
frontend/src/components/atoms/ProgressBar/
frontend/src/components/atoms/StreamingText/                ← P1-027
frontend/src/components/atoms/ValidationBadge/             ← P1-027

frontend/src/components/molecules/FormField/               ← P1-024
frontend/src/components/molecules/LoginForm/               ← P1-024
frontend/src/components/molecules/CourseMetaRow/           ← P1-025
frontend/src/components/molecules/OptionRow/               ← P1-027
frontend/src/components/molecules/ApproveRejectBar/        ← P1-028
frontend/src/components/molecules/QuestionRow/             ← P1-029

frontend/src/components/organisms/AuthCard/                ← P1-024
frontend/src/components/organisms/Sidebar/                 ← P1-025
frontend/src/components/organisms/Header/                  ← P1-024+025
frontend/src/components/organisms/CourseCard/              ← P1-025
frontend/src/components/organisms/CourseGrid/              ← P1-025
frontend/src/components/organisms/QuestWorkbench/          ← P1-026+027
frontend/src/components/organisms/QuestionTable/           ← P1-029

frontend/src/components/templates/AuthTemplate/            ← P1-024
frontend/src/components/templates/DashboardTemplate/       ← P1-025+029
frontend/src/components/templates/WorkbenchTemplate/       ← P1-026

frontend/src/hooks/useAuth.ts                              ← P1-024
frontend/src/hooks/useCourses.ts                           ← P1-025
frontend/src/hooks/useAssessmentItems.ts                   ← P1-028+029

backend/src/routes/auth.routes.ts                          ← P1-024
backend/src/routes/course.routes.ts                        ← P1-025
backend/src/routes/item.routes.ts                          ← P1-028+029
backend/src/controllers/auth.controller.ts
backend/src/controllers/course.controller.ts
backend/src/controllers/item.controller.ts
backend/src/services/auth.service.ts
backend/src/services/course.service.ts
backend/src/services/item.service.ts
backend/src/repositories/course.repository.ts
backend/src/repositories/item.repository.ts
backend/src/middleware/auth.middleware.ts                  ← P1-024
```

---

## HOOKS (TanStack Query — no bare fetch() in components)

```typescript
// frontend/src/hooks/useCourses.ts
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.get('/courses')
  });
}

// frontend/src/hooks/useAssessmentItems.ts
export function useAssessmentItems(filters: ItemFilters) {
  return useQuery({
    queryKey: ['assessment-items', filters],
    queryFn: () => apiClient.get('/items', { params: filters })
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ItemStatus }) =>
      apiClient.patch(`/items/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessment-items'] })
  });
}
```

---

## BACKEND LAYER PATTERN (one example — replicate for all resources)

```
Route (path + auth only)
  → Controller (Zod parse + call service + 200/400/500)
    → Service (business logic: check ownership, orchestrate)
      → Repository (SQL query, return typed rows)
        → Supabase client (from lib/SupabaseClient.ts singleton)
```

```typescript
// item.routes.ts
router.patch('/:id', authMiddleware, itemController.updateStatus);

// item.controller.ts
async updateStatus(req, res) {
  const { id } = req.params;
  const body = UpdateItemStatusSchema.parse(req.body);  // Zod
  const item = await itemService.updateStatus(id, body.status, req.user);
  res.json(item);
}

// item.service.ts
async updateStatus(id: string, status: ItemStatus, user: AuthUser) {
  const item = await itemRepo.findById(id);
  if (item.institution_id !== user.institutionId) throw new ForbiddenError();
  return dualWriteService.dualWrite(
    () => itemRepo.updateStatus(id, status),
    (updated) => graphRepo.setItemStatus(updated.neo4j_node_id, status)
  );
}

// item.repository.ts
async updateStatus(id: string, status: ItemStatus) {
  const { data, error } = await supabase
    .from('assessment_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

---

## DESIGN SYSTEM IN COMPONENTS

```tsx
// Correct — use CSS token vars mapped to Tailwind
<button className="bg-[var(--navy)] text-white hover:bg-[var(--blue)] rounded-md px-4 py-2">

// Correct — Lora for vignette text
<p className="font-serif text-base leading-relaxed text-[var(--gray-600)]">

// Sidebar: 72px collapsed, 240px expanded
<nav className={`transition-all ${collapsed ? 'w-18' : 'w-60'}`}>
```

God Component rule: **No component file over 150 lines**. If QuestWorkbench grows, split into:
- `QuestWorkbench.tsx` (wires ChatPanel + QuestionPreviewPanel, ~30 lines)
- `ChatPanel.tsx` (CopilotChat wrapper, ~50 lines)
- `QuestionPreviewPanel.tsx` (state rendering, ~80 lines)
- `ApproveRejectBar.tsx` (molecule, ~40 lines)

---

## FAILURE MODES

1. **CopilotKitProvider missing** — if `<CopilotKit runtimeUrl="/api/copilotkit">` is not in layout.tsx, `useCoAgent` returns undefined. Wrap at root layout.
2. **useCoAgent vs useCoAgentState** — use `useCoAgent` to get both `state` and `run`. `useCoAgentState` is read-only.
3. **God component QuestWorkbench** — the prototype QuestWorkbench is likely a 400-line God component. MUST split per Atomic Design breakdown above.
4. **Bare fetch in CourseGrid** — courses data must come from `useCourses()` hook, not `fetch()` in a useEffect.
5. **RLS blocks item reads** — `assessment_items` has institution_id RLS. JWT must have valid institution_id claim or all reads return [].
6. **Approve does not update Neo4j** — status update must go through DualWriteService, not just a direct Supabase update.
7. **Course count requires Neo4j query** — `subconcept_count` on CourseCard comes from Neo4j graph traversal, not Supabase. Backend must query both.
8. **StreamingText atom flicker** — if you re-render the entire vignette string on each STATE_DELTA, the component flickers. Append-only rendering pattern needed.

---

## SMOKE TEST
```bash
# 1. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@msm.edu","password":"test123"}'
# → { token, user: { role: 'faculty', institution_id: '...' } }

# 2. Get courses
curl http://localhost:3001/api/v1/courses \
  -H "Authorization: Bearer $TOKEN"
# → [{ id: 'medi-531', code: 'MEDI-531', subconcept_count: 20, item_count: 0 }]

# 3. Generate via browser (CopilotKit)
# Navigate to /workbench?courseId=medi-531
# Type: "Generate a clinical question about atherosclerosis"
# See question stream and complete

# 4. Approve
curl -X PATCH http://localhost:3001/api/v1/items/$ITEM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 5. View in bank
curl "http://localhost:3001/api/v1/items?status=approved" \
  -H "Authorization: Bearer $TOKEN"
# → { items: [{ id, vignette, stem, status: 'approved', ... }], total: 1 }
```
