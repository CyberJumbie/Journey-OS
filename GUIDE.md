# Journey OS — Complete Developer Guide
> AI-powered medical education platform for Morehouse School of Medicine  
> Phase 1 · Pre-production · Claude Code workflow

---

## Table of Contents

1. [How It Works](#1-how-it-works)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Setup](#3-environment-setup)
4. [The Daily Dev Workflow](#4-the-daily-dev-workflow)
5. [Running Full Epics with Subagents](#5-running-full-epics-with-subagents)
6. [Frontend — Atomic Design in Practice](#6-frontend--atomic-design-in-practice)
7. [Backend — OOP Patterns in Practice](#7-backend--oop-patterns-in-practice)
8. [The Generation Pipeline](#8-the-generation-pipeline)
9. [The Ingestion Pipeline](#9-the-ingestion-pipeline)
10. [Testing the UI End to End](#10-testing-the-ui-end-to-end)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick Reference](#12-quick-reference)

---

## 1. How It Works

Journey OS is a competency-based medical education platform. The core loop is:

```
Faculty uploads syllabus PDF
    ↓
AI extracts medical concepts and chunks content
    ↓
Faculty opens QuestWorkbench, types a natural language request
    ↓
7-node LangGraph pipeline generates a USMLE-style question, streaming live
    ↓
Faculty approves or rejects
    ↓
Approved questions enter the item bank
    ↓
(Phase 2+) Students practice, BKT mastery tracking kicks in
```

### The Two Databases

Journey OS uses two databases with a strict dual-write pattern:

| Database | Role | What lives here |
|----------|------|-----------------|
| **Supabase PostgreSQL** | Source of truth | All content, auth, embeddings, item text, options, logs |
| **Neo4j Aura** | Relationship graph | Concept connections, curriculum hierarchy, framework mappings, provenance |

**Rule:** Supabase is always written first. Neo4j is always second. If Neo4j fails, `sync_status` is set to `'failed'` and a reconciler retries. You never write Neo4j before Supabase — ever.

### The Graph Schema

Neo4j stores a knowledge graph of the MSM curriculum:

```
Institution → School → Program → Track → AcademicYear
    → CurricularPhase → Block → Course → Section → AcademicTerm

ContentChunk -[:TEACHES]→ SubConcept
SubConcept -[:MAPS_TO]→ USMLE_System / USMLE_Discipline
AssessmentItem -[:TARGETS]→ SubConcept
AssessmentItem -[:AT_BLOOM]→ BloomLevel
AssessmentItem -[:IN_COURSE]→ Course
AssessmentItem -[:GENERATED_FROM]→ ContentChunk
```

**Critical relationship names** (wrong names silently create orphan nodes):

| ✅ Correct | ❌ Never use |
|-----------|-------------|
| `TEACHES` | `BELONGS_TO`, `CHUNK_OF` |
| `MAPS_TO` | `GROUNDED_IN` |
| `TARGETS` | `ASSESSES` |
| `GENERATED_FROM` | `SOURCED_FROM` |
| `OFFERS_COURSE` | `CONTAINS_COURSE` |

### The Generation Pipeline

Seven nodes in strict sequence — no skipping:

```
init → context_compiler → vignette_builder → stem_writer
    → distractor_generator → validator → graph_writer
```

Every node that calls an AI model streams output via `STATE_DELTA` events. The faculty sees the question being written in real time. The frontend renders it via `useCoAgent({ name: 'journey_generation' })`.

### The Ingestion Pipeline

```
PDF → PdfParserFactory → Markdown
    → ChunkerService (header-aware, never splits tables)
    → ClassifierNode (Haiku: academic vs noise)
    → EmbedderService (Voyage AI 1024-dim + OpenAI 1536-dim, dual-provider)
    → ConceptExtractorNode (Haiku: 2–5 SubConcepts per chunk)
    → DualWriteService (Supabase + Neo4j)
    → FrameworkAligner (MAPS_TO USMLE nodes)
```

**Why Markdown-first?** MSM syllabi contain tables (learning objectives, grading). Raw text extraction collapses them into garbage. LlamaParse returns structured Markdown with `|` pipe characters preserved. The chunker then splits on `##` headers and never inside `| table rows |`.

---

## 2. Architecture Overview

### Monorepo Structure

```
journey-os/
├── frontend/           → Next.js 15, Atomic Design         → Vercel
├── backend/            → Express MVC, LangGraph.js          → Railway
├── python/
│   ├── pdf-parser/     → FastAPI + pdfplumber (port 8003)  → Railway (optional Phase 1)
│   ├── mip-solver/     → FastAPI + PuLP (port 8001)        → Railway (Phase 4)
│   └── irt-service/    → FastAPI + IRT (port 8002)         → Railway (Phase 5)
├── packages/shared-types/  → TypeScript interfaces (workspace)
├── seeder/             → Neo4j seed scripts (one-shot CI job)
├── design/             → Figma exports + design tokens
├── scripts/            → validate-graph.ts, smoke tests
├── fixtures/           → test PDFs
├── docs/
│   ├── context-packets/    → CP-EPIC-1.1.md through CP-EPIC-1.4.md
│   ├── stories/            → P1-001.md through P1-029.md
│   └── solutions/          → SOL-001 through SOL-007
└── .claude/
    ├── CLAUDE.md           → Project constitution (auto-loaded by Claude Code)
    ├── commands/           → /story, /plan, /implement, /review, /epic, etc.
    └── agents/             → 7 specialist subagents
```

Each deployable (frontend/, backend/, python/*) has its own `Dockerfile`, `.env.example`, and health endpoint. You can `cd` into any one and deploy it independently.

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript strict, Tailwind 4, shadcn/ui New York |
| State | TanStack Query v5, React Hook Form + Zod |
| AI UI | CopilotKit (`@copilotkit/react-core`, `@copilotkit/react-ui`) |
| Backend | Express.js + TypeScript, LangGraph.js, CopilotKit Runtime |
| Graph DB | Neo4j Aura (neo4j-driver) |
| Relational | Supabase PostgreSQL + pgvector — two columns: `voyage_embedding vector(1024)` + `openai_embedding vector(1536)`, two HNSW indexes |
| Embeddings | **Voyage AI** `voyage-large-2` (1024-dim) + **OpenAI** `text-embedding-3-small` (1536-dim) — both stored per chunk, config-controlled at search time |
| AI Models | Claude Haiku (cheap ops), Claude Sonnet (generation) |
| Monorepo | Turborepo + pnpm workspaces |
| CI/CD | GitHub Actions → Vercel (frontend) + Railway (backend) |

### Local Ports

| Service | Port |
|---------|------|
| Next.js (frontend) | 3000 |
| Express (backend) | 3001 |
| python/pdf-parser | 8003 |
| python/mip-solver | 8001 (Phase 4) |
| python/irt-service | 8002 (Phase 5) |

---

## 3. Environment Setup

### Step 1 — Unzip and Open

```bash
unzip journey-os-starter.zip
mv journey-os-workflow journey-os
cd journey-os
claude   # opens Claude Code — reads .claude/CLAUDE.md automatically
```

Claude Code reads `.claude/CLAUDE.md` on startup. The 10 Rules and all architectural constraints load into context. You never need to explain the architecture to Claude.

### Step 2 — Install Dependencies

```bash
pnpm install
pnpm build --dry-run   # verify turbo is wired
```

> If pnpm is not installed: `npm install -g pnpm@9`

### Step 3 — Provision External Services

#### Neo4j Aura (graph database)
1. Go to [console.neo4j.io](https://console.neo4j.io) → Create Instance → **AuraDB Free**
2. Copy: Connection URI, Username (`neo4j`), Password
3. Free tier: 200k nodes, 400k relationships — plenty for Phase 1

#### Supabase (relational + vector + auth + storage)
1. Go to [app.supabase.com](https://app.supabase.com) → New project
2. Copy: Project URL, anon key, service_role key
3. Authentication → Providers → enable **Email/Password**
4. SQL Editor → run: `CREATE EXTENSION IF NOT EXISTS vector;`

#### Anthropic API
Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key

#### Voyage AI
Go to [voyageai.com](https://www.voyageai.com) → Dashboard → API Keys → Create Key  
Model: `voyage-large-2` · 1024-dim · batch max 128 · $0.12/1M tokens

#### OpenAI Embeddings
Go to [platform.openai.com](https://platform.openai.com) → API Keys → Create Key  
Model: `text-embedding-3-small` · 1536-dim · batch max 100 · $0.02/1M tokens

> Both are needed if `EMBEDDING_PROVIDERS=voyage,openai`. Each chunk gets two vector columns populated at ingest time. Switching the active search provider is a single env var change — no re-ingest required. This is the 6-month comparison setup.

#### LlamaParse (optional, strongly recommended)
Go to [cloud.llamaindex.ai](https://cloud.llamaindex.ai) → API Keys → Create Key  
Without this, PDF table extraction degrades — pdfplumber fallback is used instead.

### Step 4 — Configure Environment Variables

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
cp seeder/.env.example seeder/.env.local
```

Fill in `backend/.env.local`:

```env
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USER=neo4j                  # CRITICAL: not NEO4J_USERNAME — breaks silently if wrong
NEO4J_PASSWORD=your-password

SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

ANTHROPIC_API_KEY=sk-ant-api03-...

# Dual embedding providers — 6-month comparison
# Both run at ingest: voyage_embedding (1024-dim) + openai_embedding (1536-dim) per chunk.
# Change EMBEDDING_SEARCH_PROVIDER to switch active provider — no re-ingest required.
EMBEDDING_PROVIDERS=voyage,openai          # ingest with both
EMBEDDING_SEARCH_PROVIDER=voyage           # voyage | openai — switch to compare
VOYAGE_API_KEY=pa-...                      # voyage-large-2, 1024-dim
OPENAI_API_KEY=sk-...                      # text-embedding-3-small, 1536-dim

LLAMAPARSE_API_KEY=llx-...        # optional but enables Markdown-quality extraction

PORT=3001
NODE_ENV=development
```

Fill in `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> ⚠️ **Critical gotcha:** The env var is `NEO4J_USER` — not `NEO4J_USERNAME`. The Neo4j driver fails silently with no useful error message if you use the wrong name.

### Step 5 — Verify Setup

```bash
pnpm dev
# In another terminal:
curl http://localhost:3001/health
# Expected: { "status": "ok", "neo4j": true, "supabase": true }
```

If either shows `false`, check your `.env.local` values before proceeding.

---

## 4. The Daily Dev Workflow

Every story follows the same 6-step loop. Always in this order — never skip steps.

```
/story P1-NNN  →  /plan  →  /implement  →  /verify  →  /review  →  /commit
```

### Step 1 — `/story P1-NNN`

Load the story and its epic context packet. This is the single most important step — it puts everything Claude needs into context without requiring manual reference chasing.

```
/story P1-009
```

Claude will confirm:

```
✓ Loaded: docs/stories/P1-009.md
✓ Context packet: docs/context-packets/CP-EPIC-1.2.md

Story: P1-009 — File Upload Endpoint
Epic: 1.2 — Single Course Ingestion

Files to create:
  backend/src/routes/upload.routes.ts
  backend/src/controllers/upload.controller.ts
  backend/src/services/upload.service.ts
  backend/src/repositories/upload.repository.ts

Dependencies: P1-004 (tables exist), P1-003 (DB clients)
Smoke test: POST /api/v1/uploads → { upload_id, status: 'pending' }

Ready for /plan
```

**What's in a context packet?** The epic context packet (`CP-EPIC-1.1.md` through `CP-EPIC-1.4.md`) contains verbatim story ACs, full Supabase DDL, Cypher patterns, TypeScript interfaces, file maps, OOP pattern examples, and failure modes. Claude never needs to open `GRAPH_SCHEMA.md` or `DATA_LAYER.md` separately — everything relevant is inlined.

### Step 2 — `/plan`

Generate a file-by-file implementation plan before writing any code.

```
/plan
```

For a backend story, Claude outputs:

```
## Implementation Plan: P1-009

### Files to CREATE
backend/src/repositories/upload.repository.ts
  class UploadRepository
  + findById(id): Promise<UploadRow>
  + create(data): Promise<UploadRow>
  + updateStatus(id, status): Promise<void>

backend/src/services/upload.service.ts
  class UploadService (deps: UploadRepository, SupabaseStorage)
  + createUpload(file, courseId, user): Promise<UploadRow>

backend/src/controllers/upload.controller.ts
  + createUpload(req, res): Zod parse → service → 201

backend/src/routes/upload.routes.ts
  POST /api/v1/uploads → authMiddleware → controller.createUpload

### Layer compliance
✓ Repository: DB queries only
✓ Service: business logic, no SQL
✓ Controller: Zod validate + service + respond
✓ Route: path + middleware only

### Failure modes
- multer must validate PDF mime type before Storage write
- Storage path must include upload UUID to prevent collisions

Type CONFIRM to proceed.
```

Review the plan. Correct it now if anything looks wrong. Type `CONFIRM` to proceed.

### Step 3 — `/implement`

Build the story. Claude writes each file in layer order: **repository → service → controller → route** (backend), or **atoms → molecules → organisms → template → page** (frontend).

```
/implement
```

Watch for these violations as Claude builds. Intervene immediately if you see them:

| You see this | Say this |
|---|---|
| `supabase.from()` in a service file | "Stop — that query belongs in the repository" |
| `new Neo4jDriver()` inside a service | "Stop — use `getNeo4jDriver()` from `lib/Neo4jClient.ts`" |
| `new LlamaParseParser()` directly | "Stop — use `PdfParserFactory.create(config)`" |
| `useQuery()` inside an atom component | "Stop — atoms never fetch data" |
| A component file growing past 150 lines | "Stop — split it, God Component rule" |
| Claude prompt text inside a `.ts` file | "Stop — move to `pipeline/prompts/*.txt`" |
| `CREATE (` in a Cypher query | "Stop — always `MERGE` for idempotency" |

After every file, TypeScript is checked: `npx tsc --noEmit`.

### Step 4 — `/verify`

Run the smoke test defined in the context packet.

```
/verify
```

Claude runs the exact test from the context packet. Example for P1-009:

```bash
curl -X POST http://localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer $JWT" \
  -F "file=@fixtures/test-syllabus.pdf" \
  -F "courseId=medi-531"
# Expected: { "upload_id": "abc123", "status": "pending" }
```

**Do not proceed to `/review` until the smoke test passes.**

If it fails, Claude reads the failure mode list from the context packet and diagnoses. Common ingestion failures and their fixes are in [Section 11](#11-troubleshooting).

### Step 5 — `/review`

Run the 12-check quality audit before any merge.

```
/review
```

Sample output:

```
## Review: P1-009

✅ PASSING
  Layer violations: 0
  Singleton violations: 0
  DualWrite bypass: 0
  Neo4j CREATE: 0
  TypeScript errors: 0
  Factory bypass: 0
  Inline prompts: N/A

⚠ MEDIUM (file an issue)
  No test file for upload.repository.ts

Verdict: APPROVED
```

**BLOCKING** failures (layer violations, TypeScript errors, DualWrite bypass, `CREATE` in Cypher) must be fixed before proceeding. **HIGH** failures should be fixed. **MEDIUM/LOW** go in a GitHub issue.

### Step 6 — `/commit`

Push the branch and open a PR to `dev`.

```
/commit
```

Claude writes a conventional commit message, pushes, and opens the PR. CI runs `turbo lint type-check build`. Merge to `dev` after CI passes. The CD pipeline deploys to the dev environment automatically.

---

## 5. Running Full Epics with Subagents

For building an entire epic at once, use `/epic`. This spawns specialist subagents per story to preserve focused context — no context drift across 8 stories in one conversation.

### The `/epic` Command

```
/epic 1.1   # builds P1-001 through P1-008
/epic 1.2   # builds ingestion pipeline
/epic 1.3   # builds generation pipeline
/epic 1.4   # builds workbench MVP
```

### Why Subagents Preserve Quality

Without subagents, implementing 8 stories in one session accumulates incorrect assumptions. By story 6, Claude may misremember the Neo4j schema from story 2 and start violating the layer contract. Each subagent starts clean from the context packet — the single source of truth.

The delegation chain:

```
/epic 1.2
  └── epic-orchestrator (reads CP-EPIC-1.2.md, sequences stories)
       ├── story-implementer P1-009  →  backend-specialist
       ├── story-implementer P1-014  →  backend-specialist
       ├── story-implementer P1-010  →  ingestion-specialist
       ├── story-implementer P1-011  →  ingestion-specialist
       ├── story-implementer P1-012  →  ingestion-specialist
       ├── story-implementer P1-013  →  ingestion-specialist
       └── story-implementer P1-015  →  ingestion-specialist
```

Each subagent: loads context → implements → runs smoke test → updates `SESSION_STATE.md` → terminates. The next story starts fresh.

### Epic Build Order

| Epic | Sequence | Note |
|------|----------|------|
| **1.1 Infrastructure** | P1-001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 | Sequential, each depends on prior |
| **1.2 Ingestion** | P1-009 → **014** → 010 → 011 → 012 → 013 → 015 | P1-014 (DualWrite) before parsers |
| **1.3 Generation** | P1-016 → 017 → 018 → 019 → 020 → 021 → 022 → 023 | Pipeline nodes in execution order |
| **1.4 Workbench MVP** | P1-024 → 025 → 026 → 027 → 028 → 029 | Backend auth before UI |

### Invoking Specialists Manually

```
# Atomic Design frontend work
@frontend-specialist build the CourseCard organism for P1-025

# Express MVC backend
@backend-specialist implement the upload repository and service for P1-009

# LangGraph pipeline node
@pipeline-specialist build the vignette_builder node for P1-019

# PDF ingestion
@ingestion-specialist implement PdfParserFactory for P1-010

# Code audit
@review-specialist audit branch feature/P1-019
```

### The 7 Specialist Agents

| Agent | Specialization |
|-------|---------------|
| `epic-orchestrator` | Sequences stories, spawns subagents, runs exit gates |
| `story-implementer` | Implements one story end-to-end, delegates to specialists |
| `frontend-specialist` | Atomic Design, React, CopilotKit UI, 150-line rule |
| `backend-specialist` | Express MVC, OOP patterns, Singleton/Factory/Repository |
| `pipeline-specialist` | LangGraph nodes, AG-UI streaming, STATE_DELTA |
| `ingestion-specialist` | PDF→Markdown, chunker, classifier, embeddings |
| `review-specialist` | 12-check audit, BLOCKING/HIGH/MEDIUM scoring |

---

## 6. Frontend — Atomic Design in Practice

The frontend is **pure UI only**. No business logic. No direct DB calls. Only API consumption via TanStack Query hooks.

### The Five Levels

| Level | Folder | Rule | Can fetch data? |
|-------|--------|------|-----------------|
| **Atom** | `components/atoms/` | HTML + Tailwind only. No state, no hooks. | ❌ Never |
| **Molecule** | `components/molecules/` | 2–5 atoms. Local state OK. | ❌ Never |
| **Organism** | `components/organisms/` | Domain layout + data. | ✅ Via hooks only |
| **Template** | `components/templates/` | Layout shell. No data, no logic. | ❌ Never |
| **Page** | `app/(group)/page.tsx` | One template + route params. | ✅ Via hooks only |

**The 150-line rule:** If a component file exceeds 150 lines, it is doing more than one thing. `/review` will flag it as MEDIUM. Split it before adding more code.

### Folder Structure per Component

```
frontend/src/components/
  atoms/Button/
    Button.tsx          ← implementation
    Button.test.tsx     ← render test
    index.ts            ← export default Button
  molecules/FormField/
    FormField.tsx
    index.ts
  organisms/CourseCard/
    CourseCard.tsx
    index.ts
```

### Building an Atom — Button

```tsx
// frontend/src/components/atoms/Button/Button.tsx
// ✓ Under 150 lines  ✓ No state  ✓ No fetch  ✓ CSS vars not raw hex

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({ variant, children, onClick, disabled, loading }: ButtonProps) {
  const styles = {
    primary:   'bg-[var(--navy)] text-white hover:bg-[var(--blue)]',
    secondary: 'border border-[var(--navy)] text-[var(--navy)]',
    ghost:     'text-[var(--gray-600)] hover:bg-[var(--cream)]',
    danger:    'bg-[var(--red)] text-white hover:opacity-90',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-md px-4 py-2 font-sans text-sm transition-colors ${styles[variant]}`}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
```

> ⚠️ Use `bg-[var(--navy)]` not `bg-[#002c76]`. CSS vars are defined in `globals.css` from the design system. Raw hex values bypass the design system.

### Design Tokens (always use these)

```css
/* frontend/src/styles/globals.css */
:root {
  --cream: #f5f3ef;     /* page background */
  --parchment: #faf9f6; /* card background */
  --navy: #002c76;      /* primary brand, headings */
  --blue: #2b71b9;      /* links, secondary actions */
  --green: #69a338;     /* approve, success */
  --red: #d32f2f;       /* reject, error */
  --amber: #f59e0b;     /* warnings */
  --gray-600: #4b5563;  /* body text */
  --gray-300: #d1d5db;  /* borders */
}
/* Fonts: Lora (headings/vignettes), Source Sans 3 (body), DM Mono (labels/codes) */
```

### Building a Hook — Data Fetching

All API calls go through TanStack Query hooks. Never call `fetch()` directly in a component.

```typescript
// frontend/src/hooks/useCourses.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Course } from '@journey-os/shared-types';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: (): Promise<Course[]> => apiClient.get('/courses'),
    staleTime: 5 * 60 * 1000,
  });
}

// For mutations:
export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ItemStatus }) =>
      apiClient.patch(`/items/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessment-items'] }),
  });
}
```

### The QuestWorkbench — CopilotKit Streaming UI

This is the most complex UI in Phase 1. It **must** be split into 4 files — never a God Component:

```
QuestWorkbench.tsx       (~30 lines — wires panels)
ChatPanel.tsx            (~50 lines — CopilotChat + useCopilotReadable)
QuestionPreviewPanel.tsx (~80 lines — reads WorkbenchState via useCoAgent)
ApproveRejectBar.tsx     (~40 lines — molecule, approve/reject buttons)
```

```tsx
// QuestWorkbench.tsx — pure wiring
import { ChatPanel } from './ChatPanel';
import { QuestionPreviewPanel } from './QuestionPreviewPanel';

export default function QuestWorkbench({ courseId }: { courseId: string }) {
  return (
    <div className="flex h-full">
      <ChatPanel courseId={courseId} className="w-[45%]" />
      <QuestionPreviewPanel className="w-[55%]" />
    </div>
  );
}
```

```tsx
// ChatPanel.tsx — connects to backend pipeline
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotReadable } from '@copilotkit/react-core';

export function ChatPanel({ courseId, className }) {
  useCopilotReadable({ description: 'Active course ID', value: courseId });
  return (
    <CopilotChat
      className={`${className} bg-[var(--cream)]`}
      labels={{ title: 'Quest', placeholder: 'Generate a question about...' }}
    />
  );
}
```

```tsx
// QuestionPreviewPanel.tsx — renders streaming WorkbenchState
import { useCoAgent } from '@copilotkit/react-core';
import type { WorkbenchState } from '@journey-os/shared-types';

export function QuestionPreviewPanel({ className }) {
  const { state } = useCoAgent<WorkbenchState>({ name: 'journey_generation' });

  if (!state?.vignette) {
    return <EmptyPreview message="Ask me to generate a question in the chat panel." />;
  }

  return (
    <div className={`${className} overflow-y-auto p-6`}>
      <StreamingText text={state.vignette} className="font-serif text-base leading-relaxed" />
      {state.stem && <p className="font-sans font-bold mt-4">{state.stem}</p>}
      {state.options?.map(o => <OptionRow key={o.label} option={o} />)}
      {state.validationResults?.length > 0 && (
        <ValidationSummary results={state.validationResults} />
      )}
      {state.pipelineStatus === 'completed' && (
        <ApproveRejectBar itemId={state.itemId} />
      )}
    </div>
  );
}
```

> **Provider requirement:** `<CopilotKit runtimeUrl="/api/copilotkit">` must wrap the app in `frontend/src/app/layout.tsx`. Without this, `useCoAgent` returns `undefined`.

---

## 7. Backend — OOP Patterns in Practice

### The Layer Stack

**Never skip a layer. Never mix responsibilities.**

```
Route     → express.Router, paths, middleware ONLY. Zero if/else logic.
Controller → req parse + Zod validate + call ONE service method + res.json()
Service    → business logic + orchestration. Calls repositories only. No SQL/Cypher.
Repository → DB queries only. Returns typed domain objects. No business logic.
lib/       → Singletons. Never instantiated outside this folder.
```

**Layer compliance test — ask before every file:**

- Route has `if` statements? → **VIOLATION**
- Controller calls `supabase.from()` directly? → **VIOLATION**
- Service writes `.run("MATCH...")` directly? → **VIOLATION**
- Repository has `if (user.role === 'faculty')` logic? → **VIOLATION**

### Singleton Pattern — Database Clients

```typescript
// backend/src/lib/Neo4jClient.ts
import neo4j, { Driver } from 'neo4j-driver';
import { config } from '../config/config';

class Neo4jClientSingleton {
  private static instance: Driver | null = null;

  static getInstance(): Driver {
    if (!this.instance) {
      this.instance = neo4j.driver(
        config.NEO4J_URI,
        neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD)
      );
    }
    return this.instance;
  }
}

export const getNeo4jDriver = () => Neo4jClientSingleton.getInstance();
// Callers: const driver = getNeo4jDriver();
// NEVER: const driver = new neo4j.driver(...) inside a service
```

### Factory + Strategy — PDF Parser

```typescript
// PdfParserFactory decides at runtime — callers never know which parser runs
export class PdfParserFactory {
  static create(config: AppConfig): IPdfParser {
    if (config.LLAMAPARSE_API_KEY) {
      return new LlamaParseParser(config.LLAMAPARSE_API_KEY);  // best quality
    }
    if (config.PDF_PARSER_SERVICE_URL) {
      return new PdfplumberParser(config.PDF_PARSER_SERVICE_URL);  // fallback
    }
    console.warn('[PdfParserFactory] Falling back to pdf-parse — tables may degrade');
    return new PdfParseParser();  // last resort
  }
}

// Interface — all 3 parsers implement this
interface IPdfParser {
  parse(filePath: string): Promise<ParsedDocument>;
}

// Calling code — always factory, never direct
const parser = PdfParserFactory.create(config);
const doc = await parser.parse(uploadPath);  // same call regardless of which parser
```

### DualWrite Pattern — The Only Cross-DB Write Path

```typescript
// CORRECT: all cross-DB writes go through DualWriteService
return await this.dualWriteService.dualWrite(
  // Step 1: Supabase (canonical source — throw on failure)
  () => this.itemRepo.create({ vignette, stem, bloom_level }),
  // Step 2: Neo4j (graph — log failure, don't throw, set sync_status='failed')
  (created) => this.graphRepo.createItemNode(created.id, created.neo4j_node_id)
);

// WRONG: direct writes bypass sync tracking
await supabase.from('assessment_items').insert(data);
await session.run('MERGE (ai:AssessmentItem {...})');
// ↑ No sync_status tracking. No neo4j_node_id writeback. Orphan nodes guaranteed.
```

### Repository Pattern

```typescript
// backend/src/repositories/item.repository.ts
class ItemRepository {
  private supabase = getSupabaseClient();  // singleton from lib/

  async findByCourse(courseId: string): Promise<AssessmentItemRow[]> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .select('*, options(*)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    if (error) throw new DatabaseError(error.message);
    return data;
  }

  async updateStatus(id: string, status: ItemStatus): Promise<AssessmentItemRow> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new DatabaseError(error.message);
    return data;
  }
}
```

### Zod Config — Fail Fast

```typescript
// backend/src/config/config.ts — throw at startup if env vars missing
import { z } from 'zod';

const envSchema = z.object({
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),           // NEO4J_USER not NEO4J_USERNAME
  NEO4J_PASSWORD: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  VOYAGE_API_KEY: z.string().optional(),     // optional if openai-only
  OPENAI_API_KEY: z.string().optional(),     // optional if voyage-only
  EMBEDDING_PROVIDERS: z.string().default('voyage,openai'),
  EMBEDDING_SEARCH_PROVIDER: z.enum(['voyage', 'openai']).default('voyage'),
  LLAMAPARSE_API_KEY: z.string().optional(),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const config = envSchema.parse(process.env);
// Server crashes at startup if any required var is missing — never silently undefined
```

---

## 8. The Generation Pipeline

### Node Sequence

```
init → context_compiler → vignette_builder → stem_writer
     → distractor_generator → validator → graph_writer
```

### WorkbenchState — The Central Data Structure

```typescript
// packages/shared-types/src/index.ts
interface WorkbenchState {
  mode: 'single' | 'bulk' | 'review';
  courseId: string;
  userMessage: string;          // faculty's natural language input
  targetConcepts: string[];
  context: string;              // assembled RAG context (4,000 token budget)
  vignette: string;             // streams progressively
  stem: string;                 // appears after vignette
  options: GeneratedOption[];   // A through E, one at a time
  validationResults: ValidationResult[];
  pipelineStatus: 'idle' | 'running' | 'completed' | 'failed';
  generationLogId: string;
  itemId: string;               // set after graph_writer persists
}
```

### Node Responsibilities

| Node | Model | AI calls? | Key responsibility |
|------|-------|-----------|-------------------|
| `init` | — | ❌ | Load course, user, SubConcepts from DB. Create generation log. |
| `context_compiler` | Haiku | ✅ (refiner only) | Graph RAG + Vector RAG + RRF merge → 4,000 token context |
| `vignette_builder` | **Sonnet** | ✅ | 150–200 word clinical vignette, streamed via STATE_DELTA |
| `stem_writer` | **Sonnet** | ✅ | NBME-style lead-in question, streamed |
| `distractor_generator` | **Sonnet** | ✅ | 2-phase: reasoning artifact → 5 options, streamed one at a time |
| `validator` | — | ❌ | 10 NBME rule functions — pure TypeScript, no AI |
| `graph_writer` | — | ❌ | DualWrite: Supabase + Neo4j with MERGE. Set status='completed'. |

> ⚠️ **Never use Haiku for vignette/stem/distractor generation.** Quality degrades noticeably. Haiku is for the context refiner only. Opus is Phase 2+ Critic Agent only — never Phase 1.

### Streaming Pattern — Required for All Generation Nodes

```typescript
// VignetteBuilderNode.ts — correct streaming
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  system: loadPrompt('vignette-builder-system'),
  messages: [{ role: 'user', content: contextPrompt }],
  max_tokens: 1024,
});

let accumulated = '';
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    accumulated += event.delta.text;
    // Emit STATE_DELTA — this is what the browser renders in real time
    yield { type: 'STATE_DELTA', state: { vignette: accumulated } };
  }
}
return { vignette: accumulated };

// WRONG — collect all then return (breaks UI, pipelineStatus never updates)
const msg = await anthropic.messages.create({ ... });
return { vignette: msg.content[0].text };
```

### Loading Prompts — Never Inline

```typescript
// backend/src/pipeline/nodes/VignetteBuilderNode.ts
import fs from 'fs';
import path from 'path';

// Load from .txt file — never inline the prompt string
const systemPrompt = fs.readFileSync(
  path.join(__dirname, '../prompts/vignette-builder-system.txt'),
  'utf-8'
);
```

### context_compiler — Dual RAG + RRF

```typescript
// Graph RAG: traverse from concept name → chunks
const graphChunks = await neo4j.run(`
  MATCH (sc:SubConcept)
  WHERE toLower(sc.name) CONTAINS toLower($concept)
  MATCH (chunk:ContentChunk)-[:TEACHES]->(sc)
  RETURN chunk.uuid AS chunkId
`, { concept });

// Vector RAG: pgvector cosine search — uses active search provider
const provider = config.EMBEDDING_SEARCH_PROVIDER; // 'voyage' | 'openai'
const queryEmbedding = await embedderService.embedQuery(userMessage); // correct dim per provider
const vectorChunks = await supabase.rpc(`search_chunks_${provider}`, {
  course_id: courseId,
  match_count: 10
});

// Reciprocal Rank Fusion
function rrf(graphRanks: string[], vectorRanks: string[], k = 60): string[] {
  const scores: Record<string, number> = {};
  graphRanks.forEach((id, i) => { scores[id] = (scores[id] || 0) + 1 / (k + i + 1); });
  vectorRanks.forEach((id, i) => { scores[id] = (scores[id] || 0) + 1 / (k + i + 1); });
  return Object.entries(scores).sort(([, a], [, b]) => b - a).map(([id]) => id);
}

// Context budget: 4,000 tokens — Haiku refines if over budget
```

### graph_writer — Neo4j Writes

```cypher
-- All MERGE, never CREATE
MERGE (ai:AssessmentItem {uuid: $itemId})
SET ai.bloom_level = $bloomLevel, ai.status = 'draft', ai.created_at = $now

MERGE (ai)-[:TARGETS]->(sc:SubConcept {name: $conceptName})
MERGE (ai)-[:AT_BLOOM]->(bl:BloomLevel {level: $bloomLevel})
MERGE (ai)-[:IN_COURSE]->(c:Course {uuid: $courseId})
MERGE (ai)-[:GENERATED_FROM]->(cc:ContentChunk {uuid: $chunkId})
```

> Do NOT create `AssessmentItem -[:MAPS_TO]-> USMLE_System` directly. USMLE coverage is derived: `TARGETS → SubConcept → MAPS_TO → USMLE_System`.

---

## 9. The Ingestion Pipeline

### Full Pipeline Flow

```
POST /api/v1/uploads/:id/parse
  ↓
PdfParserFactory.create(config) → IPdfParser
  ├── LlamaParseParser (preferred) → structured Markdown
  ├── PdfplumberParser (fallback)  → decent Markdown
  └── PdfParseParser (last resort) → raw text (warn if tables detected)
  ↓
ParsedDocument { markdown, has_tables, extraction_method }
  ↓
ChunkerService.chunk(markdown)
  Split on ## headers first → then \n\n → 800-token target
  NEVER split inside | table rows |
  ↓
ClassifierNode.classify(chunks) → { academic[], noise[], borderline[] }
  Haiku: "academic | noise | borderline" per chunk
  Cost: ~$0.002 per syllabus (vs $0.30 without classifier)
  ↓
EmbedderService.embedChunks(academicChunks)  ← dual-provider, sequential
  Voyage: voyage-large-2, 1024-dim, batch ≤ 128 → voyage_embedding column
  OpenAI: text-embedding-3-small, 1536-dim, batch ≤ 100 → openai_embedding column
  Both columns populated per chunk. EMBEDDING_SEARCH_PROVIDER controls which is queried.
  ↓
ConceptExtractorNode.extract(academicChunks)
  Haiku: 2–5 SubConcept names + usmle_system_guess + bloom_level_guess
  ONLY processes academic chunks (classifier ran first)
  ↓
DualWriteService: Supabase content_chunks + Neo4j ContentChunk + TEACHES edges
  ↓
FrameworkAligner: MAPS_TO edges to USMLE_System / USMLE_Discipline nodes
```

### Chunker Table Safety

```typescript
// WRONG: splits inside table rows
const chunks = markdown.split('\n\n');

// CORRECT: detect table lines before splitting
function isTableLine(line: string): boolean {
  return line.trim().startsWith('|') || /^\|[-|: ]+\|$/.test(line.trim());
}

function splitMarkdownSafely(markdown: string): string[] {
  const sections = markdown.split(/(?=^#{1,2} )/m);  // split on ## headers first
  return sections.flatMap(section => {
    const lines = section.split('\n');
    if (lines.some(isTableLine)) return [section];  // keep table sections whole
    return splitOnParagraphs(section, 800);         // split paragraphs to 800 tokens
  });
}
```

### Classifier Prompt

```
System: You are a medical curriculum classifier. Classify each text chunk.
Return ONLY valid JSON: { "type": "academic" | "noise" | "borderline", "confidence": 0.0–1.0 }

academic: medical concepts, learning objectives, pathophysiology, clinical content
noise: attendance policy, grading rubric, contact info, course logistics, blank pages
borderline: mixed content, uncertain
```

### Concept Extractor Prompt

```
System: You are a medical education ontologist. Extract SubConcepts from academic text.
Return ONLY valid JSON:
{
  "concepts": ["PascalCaseName1", "PascalCaseName2"],  // 2–5 names, PascalCase
  "usmle_system_guess": "Cardiovascular System" | null,
  "usmle_discipline_guess": "Pathology" | null,
  "bloom_level_guess": 1–6
}
Rules: PascalCase, specific names only (AtherosclerosisPathogenesis not Disease)
```

### Dual Embedding Provider Architecture

This is the core design decision for the 6-month comparison. Because Voyage and OpenAI use different vector dimensions, they cannot share a column. The solution: store both, query one.

**Schema — two nullable columns, two HNSW indexes:**

```sql
-- content_chunk_embeddings
voyage_embedding  vector(1024)   -- Voyage AI voyage-large-2
voyage_model      TEXT DEFAULT 'voyage-large-2'
openai_embedding  vector(1536)   -- OpenAI text-embedding-3-small
openai_model      TEXT DEFAULT 'text-embedding-3-small'

-- Separate indexes — different dims, different ops classes
CREATE INDEX idx_voyage_hnsw ON content_chunk_embeddings
  USING hnsw (voyage_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX idx_openai_hnsw ON content_chunk_embeddings
  USING hnsw (openai_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

**Strategy interface — all providers implement this:**

```typescript
// backend/src/ingestion/providers/IEmbeddingProvider.ts
interface IEmbeddingProvider {
  readonly name: 'voyage' | 'openai';
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

**Factory — controls which providers run:**

```typescript
// EmbeddingProviderFactory.ts
class EmbeddingProviderFactory {
  // Returns ALL providers for ingest (reads EMBEDDING_PROVIDERS=voyage,openai)
  static getIngestProviders(config: AppConfig): IEmbeddingProvider[] {
    const enabled = config.EMBEDDING_PROVIDERS.split(',');
    const providers: IEmbeddingProvider[] = [];
    if (enabled.includes('voyage') && config.VOYAGE_API_KEY)
      providers.push(new VoyageEmbeddingProvider(config.VOYAGE_API_KEY));
    if (enabled.includes('openai') && config.OPENAI_API_KEY)
      providers.push(new OpenAIEmbeddingProvider(config.OPENAI_API_KEY));
    if (!providers.length) throw new Error('No embedding providers configured');
    return providers;
  }

  // Returns ONE provider for search (reads EMBEDDING_SEARCH_PROVIDER=voyage|openai)
  static getSearchProvider(config: AppConfig): IEmbeddingProvider {
    if (config.EMBEDDING_SEARCH_PROVIDER === 'openai' && config.OPENAI_API_KEY)
      return new OpenAIEmbeddingProvider(config.OPENAI_API_KEY);
    return new VoyageEmbeddingProvider(config.VOYAGE_API_KEY!);
  }
}
```

**EmbedderService — ingest runs both, search runs one:**

```typescript
class EmbedderService {
  async embedChunks(chunks: ContentChunk[]): Promise<void> {
    const texts = chunks.map(c => c.content);
    // Sequential — not parallel. Avoids rate-limit collisions between providers.
    for (const provider of this.ingestProviders) {
      const embeddings = await provider.embed(texts);   // batches internally
      for (let i = 0; i < chunks.length; i++) {
        await this.chunkRepo.upsertEmbedding({
          chunk_id: chunks[i].id,
          provider: provider.name,        // → selects the right column
          embedding: embeddings[i],
          model: provider.model,
        });
      }
    }
  }

  async searchChunks(query: string, courseId: string, limit = 10): Promise<ContentChunk[]> {
    const [queryVec] = await this.searchProvider.embed([query]);
    // Calls search_chunks_voyage(vector(1024)) or search_chunks_openai(vector(1536))
    return this.chunkRepo.searchByVector(queryVec, courseId, limit, this.searchProvider.name);
  }
}
```

**Two Supabase RPC functions** (dimensions differ — cannot be one function):

```sql
CREATE FUNCTION search_chunks_voyage(
  query_embedding vector(1024), course_id UUID, match_count INT DEFAULT 10
) RETURNS TABLE(id UUID, content TEXT, similarity FLOAT) LANGUAGE SQL STABLE AS $$
  SELECT cc.id, cc.content, 1-(cce.voyage_embedding <=> query_embedding) AS similarity
  FROM content_chunks cc
  JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id
  WHERE cc.course_id = course_id AND cce.voyage_embedding IS NOT NULL
  ORDER BY cce.voyage_embedding <=> query_embedding LIMIT match_count;
$$;

CREATE FUNCTION search_chunks_openai(
  query_embedding vector(1536), course_id UUID, match_count INT DEFAULT 10
) RETURNS TABLE(id UUID, content TEXT, similarity FLOAT) LANGUAGE SQL STABLE AS $$
  SELECT cc.id, cc.content, 1-(cce.openai_embedding <=> query_embedding) AS similarity
  FROM content_chunks cc
  JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id
  WHERE cc.course_id = course_id AND cce.openai_embedding IS NOT NULL
  ORDER BY cce.openai_embedding <=> query_embedding LIMIT match_count;
$$;
```

**How to run the 6-month comparison:**

```bash
# Months 1–3: Voyage as the search provider (default)
EMBEDDING_SEARCH_PROVIDER=voyage   # in backend/.env.local

# Months 4–6: switch to OpenAI — no re-ingest, both columns already populated
EMBEDDING_SEARCH_PROVIDER=openai

# A/B test within a single session (overrideProvider param):
curl "localhost:3001/api/v1/search?q=atherosclerosis&courseId=medi-531&provider=voyage"
curl "localhost:3001/api/v1/search?q=atherosclerosis&courseId=medi-531&provider=openai"
```

**What to measure** (tracked in `generation_logs`):
- Which embedding provider was active for context retrieval
- Number of chunks retrieved (N in "Found N chunks...")
- NBME validation pass rate per generation
- Faculty approval rate (proxy for output quality)

**Cost comparison:**

| Provider | Model | Dimensions | Cost/1M tokens | ~Cost per syllabus |
|----------|-------|-----------|----------------|-------------------|
| Voyage AI | voyage-large-2 | 1024 | $0.12 | ~$0.50 |
| OpenAI | text-embedding-3-small | 1536 | $0.02 | ~$0.08 |
| OpenAI | text-embedding-3-large | 3072 | $0.13 | ~$0.55 |

`text-embedding-3-small` is the fair comparison: cost-comparable to Voyage, better dimensions.

**Backfill if OpenAI was added after initial ingest:**

```bash
# If chunks were ingested before OPENAI_API_KEY was set:
curl -X POST localhost:3001/api/v1/admin/re-embed?provider=openai \
  -H "Authorization: Bearer $ADMIN_JWT"
# Adds openai_embedding column values for all existing chunks
# voyage_embedding untouched
```

### USMLE System Names (exact — use for MAPS_TO matching)

```
Cardiovascular System, Endocrine System, Gastrointestinal System,
Hematologic System, Immune System, Musculoskeletal System, Nervous System,
Renal System, Reproductive System, Respiratory System,
Skin & Subcutaneous Tissue, Multisystem Processes & Disorders,
Behavioral Health & Nervous System/Special Senses,
Nutritional & Digestive Disorders, Social Sciences,
General Principles of Foundational Science
```

---

## 10. Testing the UI End to End

### Epic 1.1 — Infrastructure

```bash
# 1. Monorepo boots
pnpm dev
# frontend → http://localhost:3000 (Next.js)
# backend  → http://localhost:3001 (Express)

# 2. Health check
curl http://localhost:3001/health
# Expected: { "status": "ok", "neo4j": true, "supabase": true }

# 3. Seed Neo4j
cd seeder && pnpm seed:all
npx ts-node scripts/validate-graph.ts
# Expected: 6/6 checks passed (~557 total nodes)

# 4. CopilotKit spike (P1-008)
# Navigate to http://localhost:3000/workbench-test
# Open React DevTools → Components → find root with WorkbenchState
# Type any message → watch pipelineStatus: 'idle' → 'running' → 'completed'
```

### Epic 1.2 — Ingestion

```bash
# 1. Get a JWT
export JWT=$(curl -s -X POST localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@msm.edu","password":"test123"}' | jq -r .token)

# 2. Upload test syllabus
export UPLOAD_ID=$(curl -s -X POST localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer $JWT" \
  -F "file=@fixtures/test-syllabus.pdf" \
  -F "courseId=medi-531" | jq -r .upload_id)

echo "Upload ID: $UPLOAD_ID"

# 3. Trigger processing
curl -X POST "localhost:3001/api/v1/uploads/$UPLOAD_ID/parse" \
  -H "Authorization: Bearer $JWT"

# 4. Wait ~30 seconds, then verify both embedding columns populated
psql $SUPABASE_DB_URL -c "
  SELECT count(*) total, count(voyage_embedding) voyage, count(openai_embedding) openai
  FROM content_chunk_embeddings;"
# Expected: all three counts equal — both providers ran

# 5. Verify Neo4j (run in Neo4j Browser)
# MATCH (sc:SubConcept) RETURN count(sc)        # → 15–40
# MATCH ()-[:TEACHES]->() RETURN count(*)       # → matches SubConcept count
# MATCH (sc)-[:MAPS_TO]->() RETURN count(*)     # → > 0

# 5. Verify Supabase
# Table Editor → content_chunk_embeddings → rows have sync_status='synced'
# Table Editor → content_chunks → rows have neo4j_node_id set

# 6. Test vector search — compare both providers for same query
curl "localhost:3001/api/v1/search?q=atherosclerosis&courseId=medi-531&provider=voyage" \
  -H "Authorization: Bearer $JWT"
curl "localhost:3001/api/v1/search?q=atherosclerosis&courseId=medi-531&provider=openai" \
  -H "Authorization: Bearer $JWT"
# Both return results — ordering may differ (that's the point of the comparison)
```

### Epic 1.3 — Generation Pipeline (Visual Test)

```bash
# Navigate to http://localhost:3000/workbench?courseId=medi-531

# Open React DevTools → Components → find QuestWorkbench

# Type in chat: "Generate a clinical question about atherosclerosis pathogenesis"

# Watch in React DevTools — WorkbenchState changes in this order:
# 1. pipelineStatus: 'idle' → 'running'
# 2. TEXT_MESSAGE: "Starting generation for Human Structure & Function I..."
# 3. TEXT_MESSAGE: "Found N relevant content chunks..."
# 4. TEXT_MESSAGE: "Writing clinical vignette..."
# 5. vignette: characters appear progressively (Lora serif font)
# 6. stem: question appears after vignette completes
# 7. options: A, B, C, D, E appear one at a time
# 8. validationResults: green/amber badges appear
# 9. pipelineStatus: 'running' → 'completed'
# 10. ApproveRejectBar: two buttons appear below options

# Visual checks:
# - Vignette: 150–200 words, serif font, no lists
# - Stem: ends with a question mark
# - Options: all 5 present, similar length, no "all of the above"
# - Correct answer: not always option A

# Verify in Supabase after generation:
# assessment_items → 1 new row, status='draft'
# options → 5 new rows for that item
# generation_logs → status='completed', duration_ms set, cost_usd set

# Verify in Neo4j:
# MATCH (ai:AssessmentItem) RETURN ai LIMIT 3
# MATCH (ai)-[:TARGETS]->(sc) RETURN ai.uuid, sc.name LIMIT 5
```

### Epic 1.4 — Full Workbench MVP (End-to-End Flow)

```bash
# 1. Login
# Navigate to http://localhost:3000/login
# Email: faculty@msm.edu  Password: test123
# Expected: redirect to /courses

# 2. Course selection
# 1 card visible: MEDI-531 "Human Structure & Function I"
# Shows subconcept_count (from Neo4j) and item_count (from Supabase)
# Click card → navigate to /workbench?courseId=medi-531

# 3. Generate a question
# Left panel: CopilotChat (cream background, navy text)
# Right panel: "Ask me to generate a question in the chat panel."
# Type: "Generate a question about myocardial infarction"
# Watch question stream into right panel

# 4. Approve
# When pipelineStatus === 'completed': Approve (green) + Reject (red) appear
# Click Approve
# Expected: "Question approved ✓" → preview clears after 2s

# 5. View question bank
# Navigate to /items
# Row visible: vignette excerpt, status='approved', Bloom level, USMLE system
# Click row → expands to full question + all 5 options

# 6. Verify Supabase:
# assessment_items → status='approved', updated_at set

# 7. Verify Neo4j:
# MATCH (ai:AssessmentItem {status: 'approved'}) RETURN ai
```

---

## 11. Troubleshooting

### Connection Failures

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `health: neo4j: false` | `NEO4J_USER` typo | Change `NEO4J_USERNAME` → `NEO4J_USER` in `.env.local` |
| `health: supabase: false` | Wrong key or URL | Check `SUPABASE_URL` starts with `https://` |
| CORS error in browser | Backend not running | Confirm `http://localhost:3001` is running |
| Empty data on all pages | RLS blocking reads | Verify P1-004 migration ran — every table needs a policy |
| pgvector error on startup | Extension not enabled | SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;` |

### Ingestion Failures

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `SubConcept count = 0` after ingest | Classifier skipped | `ConceptExtractorNode` must call `ClassifierNode` first |
| Concepts look like course policies | Classifier not working | Check `classifier-system.txt` prompt loads correctly |
| Tables collapsed in chunks | `pdf-parse` fallback | Add `LLAMAPARSE_API_KEY` to `.env.local` |
| `sync_status` stuck at `pending` | `DualWriteService` not called | Ingestion service must use `DualWriteService`, not direct writes |
| `voyage_embedding` column all NULLs | Key missing or not in `EMBEDDING_PROVIDERS` | Confirm `VOYAGE_API_KEY` set and `EMBEDDING_PROVIDERS` includes `voyage` |
| `openai_embedding` column all NULLs | Key missing or added after initial ingest | Set `OPENAI_API_KEY`, add `openai` to `EMBEDDING_PROVIDERS`, run `POST /api/v1/admin/re-embed?provider=openai` |
| Search empty when `EMBEDDING_SEARCH_PROVIDER=openai` | OpenAI never ingested | Column is NULL — backfill first |
| pgvector dimension mismatch error | Wrong provider/column pair | `voyage` → `search_chunks_voyage(vector(1024))`, `openai` → `search_chunks_openai(vector(1536))` — never mix |
| Voyage API 422 | Batch > 128 | `VoyageEmbeddingProvider` slices to max 128 per request |
| `neo4j_node_id` null on Supabase rows | Missing writeback | After MERGE, write `neo4j_node_id` back to Supabase row |

### Pipeline / Generation Failures

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Vignette never appears in UI | Node returns instead of yields | `VignetteBuilderNode` must `yield STATE_DELTA`, not `return` |
| `undefined` in chat panel | `CopilotKitProvider` missing | Add `<CopilotKit runtimeUrl="/api/copilotkit">` to `layout.tsx` |
| Low quality vignettes | Haiku used for generation | Change to `claude-sonnet-4-5-20250929` in `VignetteBuilderNode` |
| `Prompt not found` error | Inline prompt or wrong path | Move to `pipeline/prompts/vignette-builder-system.txt`, use `fs.readFileSync` |
| Duplicate `AssessmentItem` nodes | `CREATE` instead of `MERGE` | Replace `CREATE` with `MERGE` in `GraphWriterNode` Cypher |
| `generation_logs` never completed | `graph_writer` not wired | Check all 7 nodes are wired in `pipeline/graph.ts` |
| Context too large error | Over 4,000 token budget | `context_compiler` must use Haiku to trim — check context refiner prompt |

### Frontend Failures

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `/review` fails: God Component | Component > 150 lines | Split per Atomic Design breakdown in context packet |
| `/review` fails: fetch in atom | `useQuery` or `fetch()` in atom | Move to a hook, pass data as props |
| Vignette text flickers on update | Full re-render on STATE_DELTA | Use append-only `StreamingText` atom pattern |
| Course `subconcept_count` is 0 | Hardcoded or missing Neo4j query | Backend `/courses` endpoint must query Neo4j for count |
| Approve does not update Neo4j | Direct Supabase update | `ItemService.updateStatus` must use `DualWriteService` |
| `/review` fails: bare fetch | `fetch()` in component | Move to `useAssessmentItems()` hook |

### `/review` Failures — Exact Fixes

```bash
# BLOCKING: Layer violation
# grep found: supabase.from('uploads') in services/upload.service.ts:47
# FIX: Move the .from() call to repositories/upload.repository.ts

# BLOCKING: Singleton violation
# grep found: new neo4j.driver() in services/concept-extractor.ts:12
# FIX: Replace with: const driver = getNeo4jDriver();

# BLOCKING: Neo4j CREATE
# grep found: CREATE (ai:AssessmentItem) in pipeline/nodes/GraphWriterNode.ts:34
# FIX: Change to: MERGE (ai:AssessmentItem {uuid: $id})

# HIGH: Wrong model
# grep found: claude-haiku in pipeline/nodes/VignetteBuilderNode.ts:23
# FIX: Change to: claude-sonnet-4-5-20250929

# HIGH: Inline prompt
# grep found: 'You are a medical' in pipeline/nodes/StemWriterNode.ts:18
# FIX: Extract to pipeline/prompts/stem-writer-system.txt
#      Load with: fs.readFileSync(path.join(__dirname, '../prompts/stem-writer-system.txt'), 'utf-8')
```

---

## 12. Quick Reference

### All Commands

| Command | Args | Effect |
|---------|------|--------|
| `/story` | `P1-NNN` | Load story + auto-inject epic context packet |
| `/plan` | — | File-by-file implementation plan with layer compliance |
| `/implement` | — | Build current story with specialist agents |
| `/verify` | — | Run story smoke test from context packet |
| `/review` | — | 12-check quality audit, BLOCKING/HIGH/MEDIUM scoring |
| `/commit` | — | Push branch + open PR to dev |
| `/epic` | `1.1–1.4` | Run entire epic via subagents |
| `/compound` | — | Extract patterns, update docs and context stubs |
| `/next` | — | Highest-priority open story |
| `/status` | — | Current story, `SESSION_STATE.md` summary |
| `/checkpoint` | — | Save mid-session snapshot |
| `/clear` | — | End session, save full state |
| `/restore` | — | Restore last checkpoint |
| `/deploy` | `dev\|prod` | Deploy to Vercel + Railway |
| `/codereview` | `branch` | In-depth diff review |
| `/design-query` | `question` | Answer from source docs only |
| `/prioritize` | — | Re-score and sort backlog |

### The 10 Rules

| # | Rule | Where |
|---|------|-------|
| 1 | TypeScript strict — no `any`, no `unknown` without assertion | Everywhere |
| 2 | Supabase first, Neo4j second — every dual-write in this order | `DualWriteService` |
| 3 | `MERGE` not `CREATE` in Neo4j — all writes idempotent | All Cypher |
| 4 | Skinny nodes — < 100 bytes in Neo4j, full text in Supabase | Neo4j writes |
| 5 | Stream everything via AG-UI `STATE_DELTA` — never batch then return | Pipeline nodes |
| 6 | Haiku for cheap ops, Sonnet for generation — never swap | Pipeline models |
| 7 | One file per pipeline node — each node is self-contained | Pipeline nodes |
| 8 | Prompts in `.txt` files in `pipeline/prompts/` — never inline | Pipeline nodes |
| 9 | Labels match NODE_REGISTRY — `SCREAMING_SNAKE` frameworks, `PascalCase` concepts | All Cypher |
| 10 | No `localStorage` / `sessionStorage` | Frontend |

### Build Order and Exit Gates

| Week | Epic | Stories | Exit Gate |
|------|------|---------|-----------|
| 1–2 | **1.1 Infrastructure** | P1-001 → 008 | ~557 Neo4j nodes, health check ok, `STATE_DELTA` renders in browser |
| 3–4 | **1.2 Ingestion** | P1-009 → 015 | 15–40 SubConcepts from test syllabus, `MAPS_TO` edges present, embeddings searchable |
| 5–6 | **1.3 Generation** | P1-016 → 023 | Full pipeline generates NBME question end-to-end, persists in both DBs |
| 7–8 | **1.4 Workbench MVP** | P1-024 → 029 | Login → generate → approve → view in question bank |

### File Location Map

| What | Where |
|------|-------|
| Next.js pages | `frontend/src/app/(group)/page.tsx` |
| React atoms | `frontend/src/components/atoms/Name/Name.tsx` |
| React molecules | `frontend/src/components/molecules/Name/Name.tsx` |
| React organisms | `frontend/src/components/organisms/Name/Name.tsx` |
| Layout templates | `frontend/src/components/templates/Name/Name.tsx` |
| Data hooks | `frontend/src/hooks/useName.ts` |
| Express routes | `backend/src/routes/name.routes.ts` |
| Controllers | `backend/src/controllers/name.controller.ts` |
| Services | `backend/src/services/name.service.ts` |
| Repositories | `backend/src/repositories/name.repository.ts` |
| DB singletons | `backend/src/lib/Neo4jClient.ts` etc. |
| Pipeline nodes | `backend/src/pipeline/nodes/NodeNameNode.ts` |
| Claude prompts | `backend/src/pipeline/prompts/name-system.txt` |
| SQL migrations | `backend/supabase/migrations/YYYYMMDDHHMMSS_name.sql` |
| Ingestion parsers | `backend/src/ingestion/parsers/Name.ts` |
| Shared TS types | `packages/shared-types/src/index.ts` |
| Neo4j seed scripts | `seeder/src/seed-layer1.ts` |
| Validation scripts | `scripts/validate-graph.ts` |

### Environment Variables Cheat Sheet

| Variable | Where | Critical note |
|----------|-------|---------------|
| `NEO4J_URI` | `backend/.env.local` | `neo4j+s://` prefix for Aura |
| `NEO4J_USER` | `backend/.env.local` | **Not** `NEO4J_USERNAME` — breaks silently |
| `NEO4J_PASSWORD` | `backend/.env.local` | — |
| `SUPABASE_URL` | `backend/.env.local` | Must start with `https://` |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env.local` | Server-side only, never expose to browser |
| `ANTHROPIC_API_KEY` | `backend/.env.local` | Server-side only |
| `EMBEDDING_PROVIDERS` | `backend/.env.local` | `voyage,openai` — both columns populated at ingest |
| `EMBEDDING_SEARCH_PROVIDER` | `backend/.env.local` | `voyage` or `openai` — switch to compare, no re-ingest |
| `VOYAGE_API_KEY` | `backend/.env.local` | voyage-large-2, 1024-dim. Server-side only |
| `OPENAI_API_KEY` | `backend/.env.local` | text-embedding-3-small, 1536-dim. Server-side only |
| `LLAMAPARSE_API_KEY` | `backend/.env.local` | Optional — enables Markdown PDF quality |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | Safe to expose — anon key only |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:3001` in dev |

---

*Journey OS · Morehouse School of Medicine · Phase 1 · Pre-production*

---

# PART 2: PHASE 2 — THE QUALITY ENGINE (Weeks 9–16)

## Phase 2 Overview

Phase 2 completes the LangGraph.js pipeline from 7 nodes to 14, adds automated quality scoring, review mode for editing existing questions, bulk generation via Inngest, and data linting.

**Consumer:** Faculty + Course Director  
**Proves:** Exam-ready question quality at scale  
**Exit gate:** ≥ 60% questions auto-handled, ≥ 50 approved items, TEACHES_VERIFIED workflow operational

---

## Phase 2 Epic Map

| Epic | Weeks | Stories | What Ships |
|------|-------|---------|------------|
| 2.1: Pipeline Completion | 9–10 | P2-001 → P2-006 | Full 14-node pipeline, Critic Agent, auto-routing |
| 2.2: Review Mode + Bulk | 11–12 | P2-007 → P2-012 | Conversational editing, Inngest bulk gen, Socket.io |
| 2.3: ECD + TaskShells | 13–14 | P2-013 → P2-017 | TaskShell seed, ProficiencyVariables, Toulmin arguments |
| 2.4: Data Quality | 15–16 | P2-018 → P2-021 | TEACHES_VERIFIED, KaizenML linting, golden dataset |

---

## Phase 2 Build Order

### Epic 2.1 (Weeks 9–10): Run these in order
```
P2-003 (validator upgrade — no new deps)
P2-001 (tagger — runs after graph_writer)
P2-002 (dedup_detector — needs EmbeddingService from P1-012)
P2-004 (critic_agent — needs validator + item saved)
P2-005 (review_router — needs critic scores)
P2-006 (self-correction loops — needs review_router)
```

### Epic 2.2 (Weeks 11–12): Run in order, install infra first
```
[Install Inngest: npm install inngest --workspace=backend]
[Install Socket.io: npm install socket.io socket.io-client]
P2-010 (bulk generation via Inngest — foundational)
P2-007 (review mode pipeline)
P2-008 (review mode UI)
P2-009 (conversational refinement)
P2-011 (bulk queue UI)
P2-012 (Socket.io notifications)
```

### Epic 2.3 (Weeks 13–14): Run in order
```
P2-013 (TaskShell seed — foundational, no deps)
P2-014 (ProficiencyVariable nodes — needs TaskShells)
P2-017 (ASSESSED_BY links — needs both 013 + 014)
P2-016 (context_compiler ECD — needs TaskShells + PVs)
P2-015 (Toulmin generation — needs tagger from 2.1)
```

### Epic 2.4 (Weeks 15–16): Can run in any order after 2.2
```
P2-018 (TEACHES_VERIFIED — independent)
P2-019 (KaizenML linting — needs Inngest from 2.2)
P2-021 (generation history — needs generation_logs populated)
P2-020 (golden dataset — run last, needs approved items to seed)
```

---

## Phase 2: New Infrastructure Setup

### Inngest (background jobs)
```bash
# 1. Install
npm install inngest --workspace=backend

# 2. Start dev server (separate terminal during development)
npx inngest-cli@latest dev
# → Inngest Dev UI at http://localhost:8288

# 3. Register functions in backend/src/index.ts
import { serve } from 'inngest/express';
app.use('/api/inngest', serve({ client: inngest, functions: [...] }));

# 4. Required env vars
INNGEST_EVENT_KEY=your-event-key    # from inngest.com dashboard
INNGEST_SIGNING_KEY=your-signing-key
```

### Socket.io (real-time notifications)
```bash
# Backend
npm install socket.io --workspace=backend

# Frontend
npm install socket.io-client --workspace=frontend

# Initialize: wrap Express httpServer with Socket.io in backend/src/index.ts
# Auth: validate JWT in socket.handshake.auth.token middleware
# Rooms: user:{userId} — emit to room, never to socket ID directly
```

---

## Phase 2: Full 14-Node Pipeline

```
Phase 1 nodes (7):     init → context_compiler → vignette_builder → stem_writer →
                       distractor_generator → validator → graph_writer

Phase 2 additions (7): dedup_detector (before validator)
                       validator UPGRADED (30 rules + Cover the Options)
                       critic_agent (after graph_writer)
                       tagger (after critic_agent)
                       toulmin_generator (after tagger)
                       review_router (terminal node)
                       + 3 review-mode nodes: load_review_question → apply_edit → revalidate

Full Phase 2 order:
init → context_compiler → vignette_builder → stem_writer →
distractor_generator → dedup_detector → validator → graph_writer →
critic_agent → tagger → toulmin_generator → review_router
```

---

## Phase 2: Model Assignment

| Node | Model | Reason |
|------|-------|--------|
| `tagger` | `claude-haiku-4-5` | Cheap structured JSON, 6 fields |
| `cover_the_options` | `claude-sonnet-4-6` | Semantic judgment required |
| `critic_agent` | `claude-opus-4-6` | **Only Opus usage in entire codebase** |
| `toulmin_generator` | `claude-sonnet-4-6` | ECD quality matters |
| `dedup_detector` | No AI | Pure vector search |
| `review_router` | No AI | Pure TypeScript routing |
| `apply_edit` (review mode) | `claude-sonnet-4-6` | Surgical text editing |

**Critical:** Opus has a $50/month circuit breaker. If exceeded, critic skips and routes to `faculty_review`.

---

## Phase 2: New Supabase Tables

| Table | Epic | Purpose |
|-------|------|---------|
| `assessment_item_embeddings` | 2.1 | Stem embeddings for dedup detection |
| `task_shells` | 2.3 | ECD TaskShell registry |
| `proficiency_variables` | 2.3 | 1:1 with SubConcepts, measurable variables |
| `assessment_item_versions` | 2.2 | Immutable edit history for review mode |
| `bulk_batches` | 2.2 | Inngest bulk generation job tracking |
| `bulk_batch_items` | 2.2 | Per-item status within a batch |
| `teaches_verifications` | 2.4 | Audit log of TEACHES verification actions |
| `kaizen_lint_runs` | 2.4 | Nightly data quality rule results |
| `golden_dataset` | 2.4 | 25 verified high-quality items for regression |

New columns on `assessment_items`: `bloom_level`, `usmle_system`, `usmle_discipline`, `difficulty`, `acgme_domain`, `epa_number`, `validation_results JSONB`, `validation_passed`, `dedup_similarity`, `dedup_status`, `critic_composite_score`, `critic_reasoning`, `auto_route`, `toulmin JSONB`, `task_shell_id`

---

## Phase 2: New Routes

```
# Items
GET  /api/v1/items/:id/versions        → item edit history

# Batches
POST /api/v1/batches                   → create bulk generation batch
GET  /api/v1/batches                   → list user's batches
GET  /api/v1/batches/:id               → batch + item statuses
POST /api/v1/batches/:id/items/:itemId/retry  → retry failed item

# Concept mappings (TEACHES verification)
GET  /api/v1/courses/:id/concept-mappings     → pending TEACHES edges
PATCH /api/v1/concept-mappings/:id/verify     → verify or reject a mapping

# Generation history
GET  /api/v1/generation-logs           → paginated history + stats

# Admin (admin role only)
GET  /api/v1/admin/lint-results        → KaizenML lint run results
POST /api/v1/admin/lint-run            → manually trigger lint
GET  /api/v1/admin/golden-dataset      → golden items + regression scores
POST /api/v1/admin/golden-run          → manually trigger regression

# Re-embed (from Phase 1)
POST /api/v1/admin/re-embed            → backfill embeddings for a provider
```

---

## Phase 2: New Frontend Routes

```
/batches                           → bulk generation batch list
/batches/:id                       → batch detail + per-item progress
/workbench?mode=review&itemId=X    → review mode workbench
/history                           → generation history + stats
/courses/:id/concept-review        → TEACHES_VERIFIED queue
```

---

## Phase 2: Slash Command Updates

The daily workflow `/story → /plan → /implement → /verify → /review → /commit` is identical.

For Phase 2 epics, the `/epic` command delegates to the new `@quality-specialist` agent for:
- Any story with `critic_agent`, `dedup_detector`, `validator`, or `review_router`
- Any story with `kaizen_lint_runs` or `golden_dataset`
- Any Inngest cron function

---

## Phase 2 Exit Gate

Run this checklist at end of Week 16 before starting Phase 3:

```bash
# 1. Auto-handling rate ≥ 60%
psql $SUPABASE_DB_URL -c "
  SELECT auto_route, count(*) AS n,
    round(count(*)*100.0/sum(count(*)) OVER (), 1) AS pct
  FROM assessment_items WHERE auto_route IS NOT NULL GROUP BY auto_route;"

# 2. ≥ 50 approved items
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM assessment_items WHERE status='approved';"

# 3. TEACHES_VERIFIED workflow works
# MATCH ()-[:TEACHES_VERIFIED]->() RETURN count(*)  → > 0

# 4. Zero stale generation logs
psql $SUPABASE_DB_URL -c "
  SELECT count(*) FROM generation_logs
  WHERE status='running' AND created_at < now() - interval '2 hours';"
# Expected: 0

# 5. Nightly lint passing
psql $SUPABASE_DB_URL -c "
  SELECT rule_id, passed FROM kaizen_lint_runs
  WHERE run_at > now() - interval '25 hours';"
# Expected: 5 rows, all passed=true
```

---

# PART 3: PHASE 3 — THE COVERAGE MAP (Weeks 17–24)

## Phase 3 Overview

Phase 3 transforms Journey OS from a question generator into institutional intelligence. Scales from one course to all 9. Builds USMLE gap detection, a D3 coverage visualization, the LCME compliance dashboard, and UMLS/LOD enrichment — pulling StandardTerm grounding forward from Phase 4 to improve LCME evidence quality.

**Consumer:** Course Director + Associate Dean  
**Proves:** Institutional intelligence — gaps visible, LCME evidence auditable  
**Exit gate:** All 9 courses ingested, USMLE heatmap live, LCME dashboard shows all 93 elements, ≥ 50% SubConcepts have UMLS CUI grounding, evidence exportable in < 60 seconds

---

## Phase 3 Epic Map

| Epic | Weeks | Stories | What Ships |
|------|-------|---------|------------|
| 3.1: Multi-Course Ingestion | 17–18 | P3-001 → P3-006 | Inngest 7-stage pipeline, PPTX parser, all 9 syllabi, SubConcept dedup, SLO extraction + ILO linking |
| 3.2: USMLE Gap Detection | 19–20 | P3-007 → P3-010 | 16×7 heatmap, priority scoring, PageRank, gap-to-workbench loop |
| 3.3: Faculty Dashboard | 21–22 | P3-011 → P3-014 | Real-time dashboard, D3 force graph, course detail, full design system |
| 3.4: LCME Compliance + UMLS | 23–24 | P3-015 → P3-018 | LCME 12-standard heatmap, evidence chain query, CSV export, UMLS LOD enrichment |

---

## Phase 3 Build Order

### Epic 3.1 (Weeks 17–18)
```
P3-002 (PPTX parser — no deps, builds on factory)
P3-001 (Inngest pipeline — foundational, needs P3-002)
P3-005 (SLO extraction — add to Inngest pipeline)
P3-003 (bulk ingest all 9 — run AFTER pipeline tested)
P3-004 (SubConcept dedup — run AFTER all 9 ingested)
P3-006 (SLO → ILO linking — needs SLOs extracted)
```

### Epic 3.2 (Weeks 19–20)
```
P3-007 (heatmap data — foundational, needs MAPS_TO edges + ingested courses)
P3-008 (priority scoring — needs heatmap)
P3-009 (PageRank — parallel with P3-008)
P3-010 (gap-to-generation loop — needs heatmap + workbench)
```

### Epic 3.3 (Weeks 21–22)
```
P3-011 (dashboard — needs heatmap + history data)
P3-013 (course detail — simpler, build first)
P3-012 (D3 coverage map — most complex, build last)
P3-014 (design system — polish pass, after all screens exist)
```

### Epic 3.4 (Weeks 23–24)
```
[Register UMLS API key before starting]
P3-018 (UMLS enrichment — run after dedup, takes ~75s for 500 concepts)
P3-015 (LCME dashboard — foundational, needs FULFILLS edges)
P3-016 (evidence chain drill-down — needs P3-015)
P3-017 (evidence export — needs P3-016)
```

---

## Phase 3: New Infrastructure

### UMLS API Key (Required for P3-018)
```bash
# 1. Register free at https://uts.nlm.nih.gov/uts/signup-login
# 2. Get API key from your NLM profile
# 3. Add to env
echo "UMLS_API_KEY=your-key" >> .env.local

# 4. Test
curl -X POST "https://utslogin.nlm.nih.gov/cas/v1/api-key" \
  -d "apikey=$UMLS_API_KEY"
# Expected: HTML containing TGT-{ticket}
```

### D3.js
```bash
npm install d3 --workspace=frontend
npm install @types/d3 --workspace=frontend --save-dev
```

### PPTX Parser
```bash
npm install pptx-text-extract --workspace=backend
```

---

## Phase 3: New Supabase Tables

| Table | Epic | Purpose |
|-------|------|---------|
| `ingestion_jobs` | 3.1 | 7-stage pipeline progress tracking |
| `slos` | 3.1 | Student Learning Outcomes per course |
| `slo_ilo_suggestions` | 3.1 | AI-suggested ILO matches for each SLO |
| `sub_concept_dedup_log` | 3.1 | Log of merged SubConcept nodes |
| `sub_concept_analytics` | 3.2 | PageRank + betweenness per SubConcept |
| `standard_terms` | 3.4 | UMLS CUI + SNOMED CT + MeSH identifiers |
| `umls_enrichment_jobs` | 3.4 | UMLS enrichment job progress |
| `gap_priorities` (view) | 3.2 | Materialized view — gap priority scores |

New column on `sub_concepts`: `canonical_id UUID` (null = IS canonical; set = points to canonical after dedup)

---

## Phase 3: New Routes

```
# Ingestion
POST /api/v1/uploads                            → trigger ingest (now Inngest-based)
GET  /api/v1/ingestion-jobs                     → list all jobs
GET  /api/v1/ingestion-jobs/:id                 → job status + stage + progress
POST /api/v1/ingestion-jobs/:id/retry           → retry from failed stage

# SLOs
GET  /api/v1/slos?courseId=X&status=pending     → SLOs awaiting ILO link
PATCH /api/v1/slos/:id/fulfills                 → confirm ILO link

# Analytics
GET  /api/v1/analytics/usmle-heatmap            → 16×7 coverage data
GET  /api/v1/analytics/gap-priorities?limit=N   → top N gaps by priority score
GET  /api/v1/analytics/coverage-graph           → D3 nodes + edges (≤500 nodes)

# Dashboard + Courses
GET  /api/v1/dashboard                          → aggregated dashboard (< 500ms)
GET  /api/v1/courses/:id/detail                 → course + coverage + weeks

# LCME (admin)
GET  /api/v1/admin/lcme/coverage                → 12-standard heatmap data
GET  /api/v1/admin/lcme/elements/:id/evidence   → full evidence chain for one element
GET  /api/v1/admin/lcme/export?format=csv|json  → full evidence export (< 60s)

# UMLS (admin)
GET  /api/v1/admin/umls-enrichment/status       → enrichment progress
POST /api/v1/admin/umls-enrichment/run          → trigger enrichment job
POST /api/v1/admin/graph-analytics-run          → trigger PageRank computation
GET  /api/v1/admin/graph-analytics/latest       → latest centrality scores
```

---

## Phase 3: New Frontend Routes

```
/analytics/usmle-heatmap           → 16×7 USMLE coverage heatmap (click → workbench)
/analytics/coverage-map            → D3 force-directed graph (NEW screen — not in prototype)
/analytics/gaps                    → gap priorities list
/courses/:id                       → course detail (wires existing prototype screen)
/dashboard                         → faculty dashboard (wires existing prototype)
/admin/lcme                        → LCME 12-standard heatmap (wires prototype)
/admin/lcme/:elementId             → LCME element drill-down + evidence chain
/admin/ilo-management              → SLO → ILO linking queue (wires prototype)
```

---

## UMLS Coverage Impact on LCME

Without UMLS (P3-018 skipped): LCME chain uses free-text concept name matching — fragile.  
With UMLS (P3-018 done): LCME chain uses CUI-based matching — machine-verifiable:

```cypher
// Enhanced chain (with UMLS)
MATCH (lcme_el)<-[:ALIGNS_TO]-(ilo)<-[:FULFILLS]-(slo)<-[:MAPS_TO]-(sc)-[:GROUNDED_IN]->(st:StandardTerm)
MATCH (sc)<-[:TARGETS]-(ai:AssessmentItem {status: 'approved'})
RETURN lcme_el.elementId, st.cui, count(DISTINCT ai) AS evidence
```

This is why UMLS is pulled forward from Phase 4 into Phase 3 — it materially improves LCME evidence quality.

---

## Phase 3 Exit Gate Checklist

```bash
# 1. All 9 courses ingested
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM ingestion_jobs WHERE status='completed';"
# ≥ 9

# 2. SubConcept dedup ran
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM sub_concept_dedup_log;"
# > 0

# 3. USMLE heatmap has data
curl "localhost:3001/api/v1/analytics/usmle-heatmap" | jq '[.cells[] | select(.itemCount > 0)] | length'
# > 0

# 4. LCME dashboard 93 elements
curl "localhost:3001/api/v1/admin/lcme/coverage" -H "Authorization: Bearer $ADMIN_JWT" | jq '.elements | length'
# 93

# 5. Evidence export < 60 seconds
time curl "localhost:3001/api/v1/admin/lcme/export?format=csv" -H "Authorization: Bearer $ADMIN_JWT" -o /dev/null
# real time < 60s

# 6. UMLS ≥ 50% enriched
curl "localhost:3001/api/v1/admin/umls-enrichment/status" -H "Authorization: Bearer $ADMIN_JWT"
# enriched/total ≥ 0.50

# 7. D3 coverage map renders (manual visual check)
# /analytics/coverage-map → nodes visible, red/amber/green coloring correct
```

---

# PART 4: PHASE 4 — THE ITEM BANK + EXAM ASSEMBLY (Weeks 25–32)

## Phase 4 Overview

Phase 4 makes Journey OS real: production item bank with advanced filtering and inline editing, a Python/PuLP MIP solver assembling constraint-optimized exams, live exam delivery with timed sessions and server-side scoring, legacy question import to hit ≥ 200 items, and full admin infrastructure (user management, onboarding wizard, data integrity dashboard, Supabase Realtime notifications, LCME → UMLS alignment).

**Consumer:** Faculty + Students + Associate Dean + Admins  
**Proves:** End-to-end assessment workflow — generate → bank → assemble → deliver → score  
**Exit gate:** ≥ 200 approved items. At least one exam assembled and administered. LOD enrichment automated.

---

## Phase 4 Epic Map

| Epic | Weeks | Stories | What Ships |
|------|-------|---------|------------|
| 4.1: Item Bank + Management | 25–26 | P4-001 → P4-004 | Rich item bank with all filters, inline editor + re-validation, per-item analytics radar chart + UMLS grounding, legacy CSV import pipeline |
| 4.2: Exam Assembly | 27–28 | P4-005 → P4-008 | Blueprint constraint form, Python MIP solver (PuLP/FastAPI port 8001), exam preview + drag-to-reorder + manual swap, timed exam delivery + auto-submit + server-side scoring |
| 4.3: LOD + Admin | 29–32 | P4-009 → P4-014 | LCME_Element → StandardTerm alignment, auto-backfill on ingest, SuperAdmin + InstitutionalAdmin screens, dual-channel notifications (Socket.io + Supabase Realtime), faculty onboarding wizard, data integrity dashboard |

---

## Phase 4 Build Order

### Epic 4.1 (Weeks 25–26)
```
P4-001 (item bank view — foundational, all filters)
P4-003 (per-item analytics — depends on item bank)
P4-002 (rich editor — depends on item bank + P2-003 validator)
P4-004 (legacy import — parallel with editor; needs EmbedderService + tagger)
```

### Epic 4.2 (Weeks 27–28)
```
[Set up python/mip-solver first: pip install fastapi uvicorn pulp]
P4-006 (MIP solver Python service — foundational, test directly before Express integration)
P4-005 (exam builder UI — needs MIP solver backend)
P4-007 (preview + swap — needs P4-005, install @dnd-kit)
P4-008 (exam delivery — needs P4-007, student auth)
```

### Epic 4.3 (Weeks 29–32)
```
P4-009 (LCME term alignment — run script after P3-018 complete)
P4-010 (GROUNDED_IN backfill — add to ingest trigger)
P4-012 (notifications — foundational for P4-008 exam:assigned events)
P4-011 (admin screens — needs user management endpoints)
P4-013 (onboarding wizard — needs P4-011 user endpoint)
P4-014 (data integrity — last, needs all other health signals wired)
```

---

## Phase 4: New Infrastructure

### Python MIP Solver Setup
```bash
# First-time setup
cd python/mip-solver
python -m venv .venv
source .venv/bin/activate    # or .venv\Scripts\activate on Windows
pip install fastapi uvicorn pulp pydantic

# Dev: start alongside Express
uvicorn main:app --port 8001 --reload

# turbo.json: add to dev task
# "tasks": { "dev": { "dependsOn": ["^build"] } }
# Run in separate terminal or add to Turborepo pipeline
```

### Supabase Realtime (notifications table)
```sql
-- Enable in Supabase dashboard → Database → Replication → Add table
-- OR via migration:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### @dnd-kit Install
```bash
npm install @dnd-kit/core @dnd-kit/sortable --workspace=frontend
```

---

## Phase 4: New Supabase Tables

| Table | Epic | Purpose |
|-------|------|---------|
| `import_jobs` | 4.1 | CSV legacy import progress tracking |
| `exams` | 4.2 | Exam metadata + blueprint + MIP solve result |
| `exam_questions` | 4.2 | Items in exam with position + points |
| `exam_sessions` | 4.2 | Per-student exam attempt (assigned → submitted → scored) |
| `student_responses` | 4.2 | One row per student per question (selectedOption, isCorrect) |
| `notifications` | 4.3 | Persistent notification store with Supabase Realtime |

New columns:
- `assessment_items.source TEXT` — 'ai_generated' | 'legacy_import'
- `public.users.onboarding_completed BOOLEAN`
- `public.users.onboarding_step INTEGER`
- `umls_enrichment_jobs.trigger TEXT` — 'manual' | 'auto_backfill' | 'post_ingest'

---

## Phase 4: New Routes

```
# Item Bank
GET  /api/v1/item-bank                          → filtered + paginated item bank
GET  /api/v1/item-bank/export.csv               → streaming CSV export with filters
GET  /api/v1/items/:id                          → full item detail (all panels)
PATCH /api/v1/items/:id                         → rich edit + re-validate

# Imports
POST /api/v1/imports                            → CSV legacy import (multipart)
GET  /api/v1/imports/:id                        → import job progress

# Exams
POST /api/v1/exams                              → create exam (calls MIP solver)
GET  /api/v1/exams                              → list faculty's exams
GET  /api/v1/exams/:id                          → exam detail + questions
PATCH /api/v1/exams/:id                         → update (status, questionOrder)
PATCH /api/v1/exams/:id/questions/:qId/swap     → swap one question

# Exam sessions (students)
POST /api/v1/exams/:id/assign                   → assign to students
PATCH /api/v1/exam-sessions/:id/responses       → record answer (auto-save)
POST /api/v1/exam-sessions/:id/submit           → submit exam → returns score

# Admin
GET  /api/v1/admin/dashboard                    → system-wide stats
GET  /api/v1/admin/users                        → user list (filterable)
POST /api/v1/admin/users/invite                 → invite new user
GET  /api/v1/admin/lod-enrichment/status        → UMLS + LCME alignment status
POST /api/v1/admin/umls-enrichment/backfill     → manual backfill trigger
GET  /api/v1/admin/data-integrity               → full health report

# Users
PATCH /api/v1/users/me/onboarding               → save onboarding step/completion

# Notifications
GET  /api/v1/notifications                      → list user's notifications
PATCH /api/v1/notifications/read-all            → mark all read

# Institution admin
GET  /api/v1/institution/dashboard              → institution-scoped stats
```

---

## Phase 4: New Frontend Routes

```
/repository/item-bank           → advanced item bank (wires prototype)
/items/:id                      → item detail with all panels (wires prototype)
/items/:id/edit                 → rich editor with re-validation (NEW screen)
/exams/new                      → exam builder + blueprint form (wires prototype)
/exams/:id                      → exam preview + manual swap (wires prototype)
/exams/:sessionId/take          → student exam delivery (NEW screen)
/admin                          → admin dashboard (wires prototype)
/admin/users                    → user management (wires prototype)
/admin/data-integrity           → data integrity view (wires prototype)
/institution                    → institutional admin dashboard (wires prototype)
/onboarding                     → faculty onboarding wizard (wires prototype)
/notifications                  → notification history (wires prototype)
```

---

## MIP Solver: Failure Modes

| Failure | Behavior |
|---------|----------|
| Solver unavailable (down/cold) | Greedy fallback — sort by critic score, apply hard filters |
| Infeasible (too few items) | Return `status: 'infeasible'` + UI shows "relax constraints" message |
| Timeout (> 30s) | Return best solution found so far — still usable |
| Blueprint violation after swap | Show warn badge — do NOT block finalize |

---

## Phase 4 Exit Gate Checklist

```bash
# 1. ≥ 200 approved items
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM assessment_items WHERE status='approved';"
# ≥ 200

# 2. MIP solver responsive
curl -X POST "localhost:8001/solve" -H "Content-Type: application/json" \
  -d '{"items":[...],"total_questions":10,...}'
# status: "optimal" or "greedy_fallback"

# 3. At least one exam assembled
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM exams WHERE status='published';"
# ≥ 1

# 4. At least one exam session submitted
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM exam_sessions WHERE status='scored';"
# ≥ 1

# 5. Legacy import pipeline working
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM assessment_items WHERE source='legacy_import';"
# > 0

# 6. LCME term alignment
# MATCH (el:LCME_Element)-[:USES_TERM]->(st:StandardTerm) RETURN count(*)  → > 0

# 7. Admin can invite user without DB access
# Test invite flow end-to-end: POST /admin/users/invite → email sent → user logs in → onboarding completes
```

---

# PART 5: SUPPLEMENTAL STORIES — UNROUTED/UNWIRED SCREENS

## Why This Section Exists

The prototype has 132 routes / 93 components. After Phases 1–4, 72+ screens had no story file and no backend wiring. These 24 supplemental stories close that gap for screens that matter.

**Context packet:** `docs/context-packets/CP-SUPP.md`

---

## PSUPP Story Map

| # | Story | Route | Phase wired with | Role |
|---|-------|-------|-----------------|------|
| PSUPP-001 | Invitation Accept | `/invite/accept` | Phase 4 | Public (invited) |
| PSUPP-002 | Role Selection | `/role-selection` | Phase 1 | Public |
| PSUPP-003 | Admin Registration | `/register/admin` | Phase 4 | Public + access code |
| PSUPP-004 | User Profile | `/profile` | Phase 1 | All |
| PSUPP-005 | Settings | `/settings` | Phase 1 | All |
| PSUPP-006 | Week View | `/courses/:id/week/:weekId` | Phase 1 | Faculty |
| PSUPP-007 | Generate from Week | `/courses/:id/week/:weekId/generate` | Phase 1 | Faculty |
| PSUPP-008 | Course Ready | `/courses/:id/ready` | Phase 1 | Faculty |
| PSUPP-009 | Course Roster | `/faculty/courses/:id/roster` | Phase 5 | Faculty |
| PSUPP-010 | Weekly Materials Upload | `/courses/:id/week/:weekId/upload-materials` | Phase 3 | Faculty |
| PSUPP-011 | Analytics Home | `/analytics` | Phase 3 | Faculty + Inst Admin |
| PSUPP-012 | Per-Course Analytics | `/analytics/course/:courseId` | Phase 3 | Faculty |
| PSUPP-013 | Personal Analytics | `/analytics/personal` | Phase 4 | Faculty |
| PSUPP-014 | Version History | `/questions/:questionId/history` | Phase 4 | Faculty |
| PSUPP-015 | Institution List | `/admin/institutions` | Phase 4 | Admin |
| PSUPP-016 | Institution Detail | `/admin/institutions/:id` | Phase 4 | Admin |
| PSUPP-017 | Application Queue + /apply | `/admin/applications` + `/apply` | Phase 4 | Public + Admin |
| PSUPP-018 | Framework Management | `/admin/frameworks` | Phase 4 | Admin |
| PSUPP-019 | Institutional USMLE Coverage | `/institution/usmle-coverage` | Phase 3 | Inst Admin |
| PSUPP-020 | Faculty vs Target Coverage | `/institution/faculty-coverage` | Phase 4 | Inst Admin |
| PSUPP-021 | Section Sequence Modeler | `/institution/sequence` | Phase 3/5 | Inst Admin |
| PSUPP-022 | Institution Students List | `/institution/students` | Phase 5 | Inst Admin |
| PSUPP-023 | Institution Courses List | `/institution/courses` | Phase 4 | Inst Admin |
| PSUPP-024 | Admin Onboarding Wizard | `/onboarding/admin` | Phase 4 | Inst Admin |

---

## Build Priority

```
# Blocks other flows — wire immediately:
PSUPP-001 (invite accept)
PSUPP-002 (role selection)
PSUPP-004 (profile)
PSUPP-008 (course ready — end of ingestion flow)
PSUPP-006 (week view — linked from course detail)

# Wire with Phase 3:
PSUPP-010 (weekly materials upload)
PSUPP-011 (analytics home)
PSUPP-012 (course analytics)
PSUPP-019 (institutional USMLE — NEW screen)
PSUPP-020 (faculty coverage — NEW screen)
PSUPP-021 (sequence modeler — NEW screen; prereqs for Phase 5)

# Wire with Phase 4:
PSUPP-003, PSUPP-005, PSUPP-007, PSUPP-009, PSUPP-013,
PSUPP-014, PSUPP-015, PSUPP-016, PSUPP-017, PSUPP-018,
PSUPP-022, PSUPP-023, PSUPP-024

# Wire with Phase 5:
PSUPP-009 (roster — student data only available then)
PSUPP-022 (institution students — populated then)
```
