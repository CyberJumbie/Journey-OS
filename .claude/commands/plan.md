# /plan — Generate an implementation plan for the current story

Create a concrete file-by-file implementation plan before writing any code.

## Step 1: Orient
```bash
cat SESSION_STATE.md
cat docs/stories/$ARGUMENTS.md 2>/dev/null || echo "Run /story P1-NNN first"
```

## Step 2: Check existing code
```bash
# What already exists in this area?
ls backend/src/routes/ 2>/dev/null
ls backend/src/services/ 2>/dev/null
ls backend/src/repositories/ 2>/dev/null
ls backend/src/pipeline/nodes/ 2>/dev/null
ls backend/supabase/migrations/ 2>/dev/null
ls frontend/src/components/atoms/ 2>/dev/null
ls frontend/src/components/molecules/ 2>/dev/null
ls frontend/src/components/organisms/ 2>/dev/null
ls frontend/src/hooks/ 2>/dev/null
```

## Step 3: Identify story type

**Backend MVC story** — produces route + controller + service + repository:
```
New file plan:
backend/src/repositories/X.repository.ts    ← TypeClass: XRepository
  → method: findByY(y: string): Promise<XRow[]>
  → method: create(data: CreateXInput): Promise<XRow>

backend/src/services/X.service.ts           ← TypeClass: XService
  → method: doThing(id: string, user: AuthUser): Promise<XRow>
  → uses: XRepository, DualWriteService

backend/src/controllers/X.controller.ts
  → handler: getAll, create, update
  → Zod schema: CreateXSchema, UpdateXSchema

backend/src/routes/X.routes.ts
  → GET /api/v1/X → authMiddleware, controller.getAll
  → POST /api/v1/X → authMiddleware, validateMiddleware(schema), controller.create
```

**Frontend Atomic Design story** — produces components + hook:
```
Atoms first:
  frontend/src/components/atoms/ComponentName/
    ComponentName.tsx     ← MUST be under 150 lines, no fetch, no state
    index.ts

Molecules from atoms:
  frontend/src/components/molecules/ComponentName/
    ComponentName.tsx     ← MUST be under 150 lines, no fetch, local state ok
    index.ts

Organism (uses molecules, has data):
  frontend/src/components/organisms/ComponentName/
    ComponentName.tsx     ← uses hooks for data, domain logic ok
    index.ts

Hook (organism data):
  frontend/src/hooks/use{Resource}.ts   ← useQuery or useMutation ONLY

Template:
  frontend/src/components/templates/TemplateName/
    TemplateName.tsx     ← layout only, no data, no logic

Page:
  frontend/src/app/(group)/path/page.tsx  ← renders template, reads route params
```

**Pipeline node story** — single class file:
```
backend/src/pipeline/nodes/NodeNameNode.ts
  → implements PipelineNode interface
  → execute(state: WorkbenchState): Promise<Partial<WorkbenchState>>
  → loads prompt from pipeline/prompts/name.txt
  → emits TEXT_MESSAGE at start
  → streams STATE_DELTA for generation content
  → model: [haiku | sonnet] based on rule 6
```

## Step 4: Spell out the plan

For each file:
- Full path
- Class/function names
- Methods and their signatures
- Which singletons/services it depends on
- Layer compliance statement

## Step 5: Identify risks

From the context packet, list the failure modes relevant to this story.
State how you'll avoid each one.

## Step 6: Confirm before proceeding

Output a clear checklist:
```
Files to CREATE:
[ ] backend/src/...
[ ] frontend/src/...

Files to MODIFY:
[ ] backend/src/... (add method X to class Y)

Pattern checklist:
[ ] No layer violations
[ ] Correct atomic levels
[ ] DualWrite for cross-DB writes
[ ] MERGE not CREATE (if Neo4j)
[ ] No inline prompts (if pipeline)
[ ] No God components (if frontend)
```

Type CONFIRM to proceed to /implement.
