# Journey OS — Folder Structure

**Core principles:**
- Every deployable unit lives in its own folder and ships independently
- Frontend is pure UI — no business logic, no direct DB calls, only API consumption
- Backend is pure API — MVC with OOP patterns throughout
- Frontend components follow **Atomic Design** — atoms → molecules → organisms → templates → pages
- No God components — every component has one responsibility
- Backend uses **OOP + design patterns** where they reduce complexity: Singleton, Factory, Strategy, Repository, Builder, Observer

---

## Top-Level

```
journey-os/
├── frontend/           → Vercel               (Next.js 15, Atomic Design)
├── backend/            → Railway              (Express MVC, OOP patterns)
├── python/             → Railway (per service) (FastAPI microservices)
│   ├── pdf-parser/
│   ├── mip-solver/
│   └── irt-service/
├── packages/           → (bundled, not deployed — shared types only)
│   └── shared-types/
├── seeder/             → CI one-shot           (Neo4j seed, TypeScript)
├── design/             → (not deployed)        (Figma exports + tokens)
├── scripts/            → (not deployed)        (validate, smoke test)
├── fixtures/           → (not deployed)        (test PDFs + JSON)
├── docs/               → (not deployed)        (stories, solutions, spikes)
├── .claude/                                     (project constitution + commands)
├── .context/                                    (slim context stubs)
├── .github/                                     (CI/CD workflows)
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## frontend/ — Next.js 15 (Atomic Design)

**Only responsibility:** Render UI. Fetch data from `backend/` API. No business logic here.
**Pattern:** Atomic Design — atoms are deployed everywhere, organisms own layout, pages own routing.
**Rule:** If a component does more than one thing, split it.

```
frontend/
├── src/
│   │
│   ├── app/                            ← Next.js 15 App Router (routing only)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx            ← Renders <LoginTemplate /> with no logic
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (faculty)/
│   │   │   ├── dashboard/page.tsx      ← Renders <FacultyDashboardTemplate />
│   │   │   ├── courses/page.tsx
│   │   │   ├── courses/[id]/page.tsx
│   │   │   └── workbench/page.tsx      ← Renders <WorkbenchTemplate />
│   │   ├── (admin)/
│   │   │   └── ...
│   │   ├── (student)/
│   │   │   └── ...
│   │   └── layout.tsx                  ← Providers only (Query, Auth, CopilotKit)
│   │
│   ├── components/                     ← ATOMIC DESIGN — build bottom-up
│   │   │
│   │   ├── atoms/                      ← Smallest indivisible UI units
│   │   │   │                             Pure presentational. No data fetching. No state.
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx          ← variant: primary | secondary | ghost | danger
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Badge/                  ← StatusBadge, BloomBadge, RoleBadge
│   │   │   ├── Icon/                   ← Lucide wrapper with consistent sizing
│   │   │   ├── Avatar/                 ← initials fallback, image support
│   │   │   ├── Spinner/                ← loading indicator
│   │   │   ├── Divider/
│   │   │   ├── Label/                  ← DM Mono uppercase label
│   │   │   ├── Heading/                ← Lora heading with level prop (h1-h4)
│   │   │   ├── Text/                   ← Source Sans 3 body text with size/weight props
│   │   │   └── ProgressBar/            ← numeric 0-100 prop
│   │   │
│   │   ├── molecules/                  ← Atoms combined into a functional unit
│   │   │   │                             May have local state. No API calls.
│   │   │   ├── FormField/              ← Label + Input + ErrorMessage atom
│   │   │   ├── SearchBar/              ← Input + Button + optional clear
│   │   │   ├── StatusIndicator/        ← Icon + Badge + Label for processing status
│   │   │   ├── CourseMetaRow/          ← code + term + student_count atoms
│   │   │   ├── BloomTag/               ← Badge + Tooltip showing Bloom level description
│   │   │   ├── QuestionOption/         ← label(A-E) + text + optional rationale reveal
│   │   │   ├── ConceptChip/            ← SubConcept name + confidence score
│   │   │   ├── UploadDropzone/         ← drag-drop zone atom + file name atom + progress atom
│   │   │   ├── ActionMenu/             ← Button + dropdown (approve/reject/edit)
│   │   │   └── NotificationToast/      ← Icon + Text + dismiss Button
│   │   │
│   │   ├── organisms/                  ← Complex sections. May fetch data via hooks.
│   │   │   │                             Own significant layout. No page-level concerns.
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx         ← collapsible 72px ↔ 240px, role-aware nav items
│   │   │   │   ├── SidebarNavItem/     ← molecule (icon + label + active state)
│   │   │   │   └── index.ts
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx          ← breadcrumb + avatar + notification bell
│   │   │   │   └── index.ts
│   │   │   ├── CourseCard/             ← course meta + progress bar + action menu
│   │   │   ├── CourseGrid/             ← grid of CourseCards + empty state
│   │   │   ├── QuestionPreviewCard/    ← vignette + stem + options + bloom + status
│   │   │   ├── ConceptReviewList/      ← list of ConceptChips with verify/reject controls
│   │   │   ├── UploadPanel/            ← UploadDropzone + file type validation + submit
│   │   │   ├── ProcessingStatusPanel/  ← polling status steps (P1-010/011/012/013)
│   │   │   ├── QuestWorkbench/         ← CopilotKit conversational UI (THE rewrite)
│   │   │   │   ├── QuestWorkbench.tsx  ← CopilotKitProvider + useCoAgent + CopilotChat
│   │   │   │   ├── StateDisplay.tsx    ← renders WorkbenchState (vignette/stem/options)
│   │   │   │   └── index.ts
│   │   │   ├── QuestionBank/           ← filterable table of assessment items
│   │   │   ├── BlueprintHeatmap/       ← USMLE system coverage grid (Phase 3)
│   │   │   └── ReviewQueue/            ← sortable list of pending review items
│   │   │
│   │   ├── templates/                  ← Page layout shells — no data, no logic
│   │   │   │                             Compose organisms into a full-screen layout.
│   │   │   │                             Accept all content as props or children.
│   │   │   ├── AuthTemplate/           ← centered card layout for login/register
│   │   │   ├── DashboardTemplate/      ← Sidebar + Header + main content area
│   │   │   ├── CourseDetailTemplate/   ← DashboardTemplate + course-specific header
│   │   │   ├── WorkbenchTemplate/      ← split-pane: chat left, preview right
│   │   │   └── FullPageTemplate/       ← no sidebar (onboarding, error pages)
│   │   │
│   │   └── ui/                         ← shadcn/ui primitives (auto-generated, never edit)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   │
│   ├── hooks/                          ← Data fetching + local state — the bridge to backend
│   │   │                                 TanStack Query wraps every API call. No bare fetch() in components.
│   │   ├── useAuth.ts                  ← current user, login, logout
│   │   ├── useCourses.ts               ← GET /courses, GET /courses/:id
│   │   ├── useUpload.ts                ← POST /uploads, GET /uploads/:id/status
│   │   ├── useConceptReview.ts         ← GET/PATCH subconcepts
│   │   ├── useAssessmentItems.ts       ← GET/PATCH /items
│   │   └── useWorkbench.ts             ← CopilotKit useCoAgent wrapper
│   │
│   ├── lib/                            ← Infrastructure singletons (frontend layer)
│   │   ├── supabase.ts                 ← Supabase browser client (anon key only)
│   │   ├── api-client.ts               ← Axios/fetch class with auth header injection
│   │   └── query-client.ts             ← TanStack Query client config + global error handler
│   │
│   ├── providers/                      ← React context providers (mount in layout.tsx)
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── CopilotKitProvider.tsx
│   │
│   └── styles/
│       └── globals.css                 ← Tailwind 4 @import + CSS token vars
│
├── public/
├── .env.example                        ← NEXT_PUBLIC_* vars only
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### Atomic Design Rules

| Level | Knows about | Can contain | Can fetch data? |
|-------|-------------|-------------|-----------------|
| **Atom** | Nothing | HTML + Tailwind only | ❌ Never |
| **Molecule** | Atoms | 2–5 atoms | ❌ Never |
| **Organism** | Molecules + Atoms | Domain logic, local state | ✅ Via hooks only |
| **Template** | Organisms | Layout composition | ❌ Never |
| **Page** (`app/`) | Templates | Route params → template props | ✅ Via hooks only |

**God Component rule:** If a component file is over 150 lines, it is doing too much. Split it.

---

## backend/ — Express MVC (OOP + Design Patterns)

**Only responsibility:** Business logic, data access, AI pipeline.
**Pattern:** MVC with strict layer separation. OOP classes throughout.
**Rule:** No logic in routes. No HTTP concepts in services. No business logic in repositories.

```
backend/
├── src/
│   ├── index.ts                        ← Bootstrap: wires app, registers routes, starts server
│   ├── app.ts                          ← Express app factory (exported for testing)
│   │
│   ├── config/
│   │   └── config.ts                   ← Zod-validated env. Singleton. Fails fast at startup.
│   │
│   ├── routes/                         ← Path mapping + middleware only. Zero logic.
│   │   ├── health.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── course.routes.ts
│   │   ├── upload.routes.ts
│   │   └── item.routes.ts
│   │
│   ├── controllers/                    ← HTTP layer: parse → validate (Zod) → call service → respond
│   │   │                                 No business logic. No DB calls. Thin.
│   │   ├── auth.controller.ts
│   │   ├── course.controller.ts
│   │   ├── upload.controller.ts
│   │   └── item.controller.ts
│   │
│   ├── services/                       ← Business logic + orchestration (OOP classes)
│   │   │                                 No HTTP concepts. No raw DB queries.
│   │   ├── auth.service.ts             ← AuthService class
│   │   ├── course.service.ts           ← CourseService class
│   │   ├── upload.service.ts           ← UploadService class
│   │   ├── item.service.ts             ← AssessmentItemService class
│   │   └── dual-write.service.ts       ← DualWriteService class (ONLY cross-DB write path)
│   │
│   ├── repositories/                   ← Data access only (OOP classes, one per entity)
│   │   │                                 Returns typed domain objects. No business logic.
│   │   ├── course.repository.ts        ← CourseRepository class
│   │   ├── upload.repository.ts
│   │   ├── item.repository.ts
│   │   ├── chunk.repository.ts
│   │   └── graph.repository.ts         ← All Neo4j queries
│   │
│   ├── pipeline/                       ← LangGraph.js generation pipeline
│   │   ├── graph.ts                    ← StateGraph wiring (node → node → node)
│   │   ├── nodes/                      ← One class per node, implements PipelineNode interface
│   │   │   ├── PipelineNode.interface.ts  ← interface PipelineNode { execute(state): Promise<WorkbenchState> }
│   │   │   ├── InitNode.ts
│   │   │   ├── ContextCompilerNode.ts
│   │   │   ├── VignetteBuilderNode.ts
│   │   │   ├── StemWriterNode.ts
│   │   │   ├── DistractorGeneratorNode.ts
│   │   │   ├── ValidatorNode.ts
│   │   │   └── GraphWriterNode.ts
│   │   ├── prompts/                    ← Claude prompt .txt files (never inline)
│   │   │   ├── vignette-builder-system.txt
│   │   │   ├── stem-writer-system.txt
│   │   │   ├── distractor-generator-system.txt
│   │   │   ├── concept-extractor-system.txt
│   │   │   └── classifier-system.txt
│   │   └── validators/                 ← NBME rule functions (pure functions, no class needed)
│   │       ├── nbme-rules.ts
│   │       └── nbme-rules.test.ts
│   │
│   ├── ingestion/                      ← Syllabus processing pipeline
│   │   ├── PdfParserFactory.ts         ← Factory: returns LlamaParseParser | PdfplumberParser | PdfParseParser
│   │   ├── parsers/
│   │   │   ├── IPdfParser.interface.ts ← interface IPdfParser { parse(path): Promise<ParsedDocument> }
│   │   │   ├── LlamaParseParser.ts     ← implements IPdfParser (preferred, cloud)
│   │   │   ├── PdfplumberParser.ts     ← implements IPdfParser (Python service call)
│   │   │   └── PdfParseParser.ts       ← implements IPdfParser (fallback, raw text)
│   │   ├── ClassifierNode.ts           ← Haiku noise filter (SOL-007)
│   │   ├── ChunkerService.ts           ← Markdown-aware 800-token chunker (SOL-006)
│   │   └── EmbedderService.ts          ← Voyage AI with retry (SOL-004)
│   │
│   ├── copilotkit/
│   │   └── runtime.ts                  ← CopilotKit Runtime — POST /api/copilotkit
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts          ← JWT verify → attach req.user
│   │   ├── error.middleware.ts         ← Global error handler → standard error shape
│   │   └── validate.middleware.ts      ← Zod schema middleware factory
│   │
│   └── lib/                            ← Infrastructure singletons (backend layer)
│       ├── Neo4jClient.ts              ← Singleton: Neo4j driver instance
│       ├── SupabaseClient.ts           ← Singleton: Supabase service-role client
│       └── AnthropicClient.ts          ← Singleton: Anthropic SDK client
│
├── supabase/
│   └── migrations/                     ← SQL migrations (YYYYMMDDHHMMSS_name.sql)
├── .env.example
├── Dockerfile
├── railway.toml
└── package.json
```

### OOP + Design Pattern Map

| Pattern | Where | Why |
|---------|-------|-----|
| **Singleton** | `lib/Neo4jClient.ts`, `lib/SupabaseClient.ts`, `lib/AnthropicClient.ts` | One connection pool per process. Never instantiate drivers inline. |
| **Factory** | `ingestion/PdfParserFactory.ts` | Chooses the correct PDF parser at runtime based on config/file type. Callers never care which parser runs. |
| **Strategy** | `ingestion/parsers/` (3 parsers, 1 interface) | All parsers are interchangeable via `IPdfParser`. Swap LlamaParse → pdfplumber with zero callers changing. |
| **Repository** | `repositories/*.repository.ts` | Isolates all DB query code. Services never write SQL/Cypher directly. |
| **Service Layer** | `services/*.service.ts` | Orchestrates repositories + business rules. Controllers only call services. |
| **Interface / Contract** | `PipelineNode.interface.ts`, `IPdfParser.interface.ts` | All nodes + parsers implement a common interface. Graph wiring just calls `.execute(state)`. |
| **Builder** | `WorkbenchStateBuilder` (inside `InitNode.ts`) | Constructs complex `WorkbenchState` object step-by-step instead of giant object literals. |
| **Observer / Event** | `pipeline/graph.ts` STATE_DELTA emissions | LangGraph state transitions emit STATE_DELTA events to CopilotKit listeners. |
| **Middleware Chain** | `routes/` + `middleware/` | Express middleware is a pipeline — validate → auth → controller. No logic leaks between layers. |

### Layer Rules (strictly enforced)

```
Routes      → path + middleware wiring only. ZERO logic.
Controllers → HTTP parsing + Zod validation + call ONE service method + format response.
Services    → business logic + orchestration. Call repositories. No HTTP. No raw queries.
Repositories → DB queries only. Return typed domain objects. No business logic.
lib/        → Singletons. Instantiated once at startup. Never new'd elsewhere.
```

---

## python/ — Independently Deployable FastAPI Services

All three follow the same internal layout. Each is a standalone Python project.
**Not in pnpm workspace.** Each has its own virtualenv.

```
python/
├── pdf-parser/                     ← Markdown PDF extraction (Phase 1 optional)
│   ├── app/
│   │   ├── main.py                 ← FastAPI app: POST /parse → ParseResponse
│   │   ├── parser.py               ← pdfplumber extraction logic
│   │   └── models.py               ← Pydantic request/response types
│   ├── tests/
│   ├── requirements.txt            ← pdfplumber, fastapi, uvicorn, python-multipart
│   ├── Dockerfile
│   ├── railway.toml
│   └── .env.example                ← PORT=8003 only
│
├── mip-solver/                     ← Exam assembly constraint solver (Phase 4)
│   ├── app/
│   │   ├── main.py                 ← FastAPI app: POST /solve → ExamBlueprint
│   │   ├── solver.py               ← PuLP MIP logic (class-based: MIPSolver)
│   │   └── models.py
│   ├── tests/
│   ├── requirements.txt            ← fastapi, uvicorn, pulp
│   ├── Dockerfile
│   ├── railway.toml
│   └── .env.example                ← PORT=8001
│
└── irt-service/                    ← IRT calibration + adaptive item selection (Phase 5)
    ├── app/
    │   ├── main.py                 ← POST /calibrate, GET /select
    │   ├── calibration.py          ← IRTCalibrator class (2PL estimation)
    │   ├── selection.py            ← ItemSelector class (Fisher Information)
    │   └── models.py
    ├── tests/
    ├── requirements.txt            ← fastapi, uvicorn, numpy, scipy
    ├── Dockerfile
    ├── railway.toml
    └── .env.example                ← PORT=8002
```

**Local start:** `cd python/<service> && uvicorn app.main:app --reload --port <port>`
**Deploy:** `cd python/<service> && railway up`

---

## packages/shared-types/ — TypeScript Contracts

Consumed by `frontend/` and `backend/`. Not deployed — bundled into each consumer.

```
packages/shared-types/
└── src/
    ├── graph.ts            ← Neo4j node/relationship TypeScript types
    ├── database.ts         ← Supabase Row/Insert types (match actual schema exactly)
    ├── api.ts              ← API request/response contracts (match 06_SCREEN_BACKEND_MAP.md)
    ├── pipeline.ts         ← WorkbenchState, GenerationMode, ParsedDocument, PipelineNode enum
    └── index.ts            ← Barrel export
```

Import: `import { WorkbenchState, Course } from '@journey-os/shared-types'`

---

## seeder/ — Neo4j Seeder (one-shot, not a live service)

```
seeder/
├── src/
│   ├── seed-layer1.ts      ← Institutional hierarchy (~65–70 nodes)
│   └── seed-layer2.ts      ← Framework nodes (~492 nodes)
├── data/
│   ├── msm-catalog.json
│   ├── lcme_standards.json
│   ├── epa-ume-competencies.json
│   └── usmle-blueprint.json
├── .env.example            ← NEO4J_* vars
└── package.json
```

---

## design/ — Figma Exports + Tokens (not deployed)

```
design/
├── figma-exports/
│   ├── screens/            ← One subfolder per screen (login/, workbench/, etc.)
│   └── README.md           ← Figma → Atomic Design mapping guide
└── tokens/
    └── tokens.json         ← Design token values synced from Figma Variables
```

**Figma → Atomic Design mapping:**
Figma components → atoms or molecules.
Figma sections → organisms.
Figma frames → templates.
Figma pages → Next.js pages in `app/`.

---

## Deployment Map

| Folder | Platform | Trigger | Port |
|--------|----------|---------|------|
| `frontend/` | Vercel | Auto on `main` (prod) / `dev` (preview) | 443 |
| `backend/` | Railway | Auto on `main` / `dev` | 3001 |
| `python/pdf-parser/` | Railway | Manual (Phase 1 optional) | 8003 |
| `python/mip-solver/` | Railway | Auto when Phase 4 begins | 8001 |
| `python/irt-service/` | Railway | Auto when Phase 5 begins | 8002 |
| `seeder/` | GitHub Actions (workflow_dispatch) | Manual or CI | N/A |

---

## pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'frontend'
  - 'backend'
  - 'packages/*'
  - 'seeder'
  # python/* excluded — standalone venvs
```

## Turbo Pipeline (frontend + backend + packages only)

```json
{
  "pipeline": {
    "build":      { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "type-check": { "dependsOn": ["^build"] },
    "lint":       {},
    "dev":        { "cache": false, "persistent": true }
  }
}
```
