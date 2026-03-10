# Context Packet: Epic 1.1 — Infrastructure & Spike
# Stories: P1-001 through P1-008 | Weeks 1–2
# SELF-CONTAINED: Read this file. You have everything needed to implement this epic.
# Do NOT chase external references. Everything from source docs is inlined below.

---

## WHAT THIS EPIC DELIVERS

By end of Epic 1.1:
- Turborepo monorepo running with frontend:3000 + backend:3001 locally
- GitHub Actions CI passing (lint + type-check + build)
- Supabase project provisioned with all Phase 1 tables + pgvector + RLS
- Neo4j Aura provisioned with ~65 institutional nodes (Layer 1)
- Neo4j Layer 2 seed: ~492 framework nodes (USMLE, LCME, Bloom, EPA, AAMC)
- Shared TypeScript types package working
- CopilotKit + LangGraph spike: STATE_DELTA renders in browser

**Exit gate:** Neo4j has ~557 nodes. Supabase tables live. JWT auth works. STATE_DELTA proven.

---

## STORY ACCEPTANCE CRITERIA (verbatim from source)

### P1-001: Monorepo Scaffold
- Turborepo monorepo at repo root
- `pnpm-workspace.yaml` declaring: frontend, backend, packages/*, seeder
- `turbo.json` with tasks: build, dev, lint, type-check
- `frontend/` — Next.js 15 App Router, TypeScript strict, Tailwind 4, shadcn/ui New York
- `backend/` — Express.js + TypeScript, ts-node-dev hot reload
- `packages/shared-types/` — TypeScript lib, importable as `@journey-os/shared-types`
- Root `package.json` with dev script running both concurrently
- `pnpm dev` starts frontend:3000 + backend:3001
- `pnpm build` runs turbo build across all packages

### P1-002: Provision Services
- Supabase project created (free tier OK for Phase 1)
- Neo4j Aura Free instance created
- Anthropic API key obtained
- Voyage AI API key obtained
- All keys documented in `.env.example`
- `backend/.env.local` with real values (gitignored)
- `frontend/.env.local` with NEXT_PUBLIC_* values
- Database connection test: `GET /health` returns `{ status: 'ok', neo4j: true, supabase: true }`

### P1-003: Environment Config + CI
- `backend/src/config/config.ts` — Zod-validated env, throws on missing vars at startup
- `.github/workflows/ci.yml` — runs `turbo lint type-check build`
- CI runs on push to main and dev branches
- CI must pass before merge (branch protection rule)
- Separate jobs: lint, type-check, build (can run in parallel)
- Node.js 20 LTS in CI

### P1-004: Supabase DDL — Core Tables
Full schema (write as migration `backend/supabase/migrations/20250101000000_phase1_core.sql`):

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Institutions
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  role TEXT NOT NULL CHECK (role IN ('faculty','institutional_admin','student','advisor','superadmin')),
  display_name TEXT,
  email TEXT,
  is_course_director BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  code TEXT NOT NULL,         -- e.g. 'MEDI-531'
  title TEXT NOT NULL,
  description TEXT,
  academic_year TEXT,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Uploads (WORM — write once, never delete via API)
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  uploaded_by UUID REFERENCES user_profiles(id),
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Content chunks (extracted from syllabi)
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES uploads(id),
  course_id UUID REFERENCES courses(id),
  institution_id UUID REFERENCES institutions(id),
  chunk_index INT,
  content TEXT,
  token_count INT,
  source_type TEXT CHECK (source_type IN ('syllabus','lecture_slide','textbook','other')),
  source_page INT,
  metadata JSONB,
  neo4j_node_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','orphaned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;

-- Embeddings (1024-dim Voyage AI)
CREATE TABLE content_chunk_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID UNIQUE REFERENCES content_chunks(id),
  embedding vector(1024),
  model_name TEXT DEFAULT 'voyage-large-2',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- HNSW index for fast cosine similarity search
CREATE INDEX ON content_chunk_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Assessment items
CREATE TABLE assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES user_profiles(id),
  vignette TEXT,
  stem TEXT,
  explanation TEXT,
  bloom_level INT,
  usmle_system TEXT,
  usmle_discipline TEXT,
  difficulty_estimate FLOAT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','rejected','retired')),
  toulmin JSONB,
  generation_log_id UUID,
  neo4j_node_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','orphaned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;

-- Options (A-E per item)
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES assessment_items(id) ON DELETE CASCADE,
  label CHAR(1) CHECK (label IN ('A','B','C','D','E')),
  option_text TEXT,
  is_correct BOOLEAN DEFAULT false,
  distractor_rationale TEXT,
  misconception_targeted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- Generation logs (full pipeline audit trail)
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  user_id UUID REFERENCES user_profiles(id),
  mode TEXT CHECK (mode IN ('single','bulk','review')),
  input_message TEXT,
  pipeline_state JSONB,
  model_calls JSONB,
  total_tokens_in INT,
  total_tokens_out INT,
  total_cost_usd DECIMAL(10,6),
  duration_ms INT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (institution-scoped)
CREATE POLICY "institution_isolation" ON institutions FOR ALL USING (id = (
  SELECT institution_id FROM user_profiles WHERE id = auth.uid()
));
CREATE POLICY "institution_isolation" ON courses FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);
CREATE POLICY "institution_isolation" ON content_chunks FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);
CREATE POLICY "institution_isolation" ON assessment_items FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);
```

### P1-005: Neo4j Layer 1 Seed — Institutional Hierarchy (~65-70 nodes)
Target: MSM institutional hierarchy for MEDI 531 (Human Structure & Function I).

```cypher
// Institution
MERGE (i:Institution {uuid: 'msm-001', name: 'Morehouse School of Medicine', slug: 'msm'})

// School
MERGE (s:School {uuid: 'msm-med-001', name: 'School of Medicine'})
MERGE (i)-[:HAS_SCHOOL]->(s)

// Program
MERGE (p:Program {uuid: 'msm-md-001', name: 'Doctor of Medicine', code: 'MD'})
MERGE (s)-[:OFFERS_PROGRAM]->(p)

// ProgramTrack
MERGE (t:ProgramTrack {uuid: 'msm-track-std', name: 'Standard MD Track'})
MERGE (p)-[:HAS_TRACK]->(t)

// AcademicYears (Y1-Y4)
MERGE (y1:AcademicYear {uuid: 'msm-y1', name: 'Year 1', year_number: 1})
MERGE (y2:AcademicYear {uuid: 'msm-y2', name: 'Year 2', year_number: 2})
MERGE (t)-[:IN_YEAR]->(y1)
MERGE (t)-[:IN_YEAR]->(y2)

// CurricularPhases
MERGE (ph1:CurricularPhase {uuid: 'msm-phase1', name: 'Phase 1: Foundations', phase_number: 1})
MERGE (ph2:CurricularPhase {uuid: 'msm-phase2', name: 'Phase 2: Systems', phase_number: 2})
MERGE (y1)-[:HAS_PHASE]->(ph1)
MERGE (y1)-[:HAS_PHASE]->(ph2)

// Blocks (at least 4 in Phase 1)
MERGE (b1:Block {uuid: 'msm-b1', name: 'Block 1: Cell Biology & Genetics'})
MERGE (b2:Block {uuid: 'msm-b2', name: 'Block 2: Human Structure & Function'})
MERGE (b3:Block {uuid: 'msm-b3', name: 'Block 3: Biochemistry & Metabolism'})
MERGE (b4:Block {uuid: 'msm-b4', name: 'Block 4: Physiology'})
MERGE (ph1)-[:CONTAINS_BLOCK]->(b1)
MERGE (ph1)-[:CONTAINS_BLOCK]->(b2)
MERGE (ph2)-[:CONTAINS_BLOCK]->(b3)
MERGE (ph2)-[:CONTAINS_BLOCK]->(b4)

// Course: MEDI 531 (the Phase 1 pilot course)
MERGE (c:Course {uuid: 'medi-531', code: 'MEDI-531', name: 'Human Structure & Function I'})
MERGE (b2)-[:OFFERS_COURSE]->(c)

// AcademicTerm
MERGE (term:AcademicTerm {uuid: 'msm-2025-fall', name: 'Fall 2025', year: 2025, season: 'Fall'})
MERGE (c)-[:IN_TERM]->(term)
```

### P1-006: Neo4j Layer 2 Seed — Framework Nodes (~492 nodes)
Seed these framework nodes. All use SCREAMING_SNAKE labels.

**USMLE Systems (16 nodes):**
Cardiovascular System, Endocrine System, Gastrointestinal System, Hematologic System,
Immune System, Musculoskeletal System, Nervous System, Renal System, Reproductive System,
Respiratory System, Skin & Subcutaneous Tissue, Multisystem Processes, Behavioral Health,
Nutritional & Digestive, Social Sciences, General Principles

**USMLE Disciplines (7 nodes):**
Biochemistry & Nutrition, Embryology, Genetics, Gross Anatomy, Histology, Microbiology, Pharmacology, Physiology, Pathology

**Bloom Levels (6 nodes):**
Remember (1), Understand (2), Apply (3), Analyze (4), Evaluate (5), Create (6)

**LCME Standards (12) + Elements (93)** → seed from `seeder/data/lcme_standards.json`
**EPA-UME Competencies (84)** → seed from `seeder/data/epa-ume-competencies.json`
**AAMC Core Competencies (15)** → seed inline

### P1-007: Shared Types
File: `packages/shared-types/src/pipeline.ts`
```typescript
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'orphaned';
export type ItemStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'retired';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type GenerationMode = 'single' | 'bulk' | 'review';
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface WorkbenchState {
  mode: GenerationMode;
  courseId: string;
  userMessage: string;
  targetConcepts: string[];
  context: string;
  vignette: string;
  stem: string;
  options: GeneratedOption[];
  validationResults: ValidationResult[];
  pipelineStatus: PipelineStatus;
  generationLogId: string;
  itemId: string;
}

export interface GeneratedOption {
  label: string;           // 'A' through 'E'
  text: string;
  is_correct: boolean;
  rationale: string;
  misconception_targeted?: string;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}

export interface ParsedDocument {
  markdown: string;
  page_count: number;
  extraction_method: 'llamaparse' | 'pdfplumber' | 'pdf-parse';
  has_tables: boolean;
  noise_ratio?: number;
}

export interface ContentChunkInput {
  content: string;
  chunk_index: number;
  token_count: number;
  source_type: 'syllabus' | 'lecture_slide' | 'textbook' | 'other';
  source_page?: number;
  chunk_type?: 'academic' | 'noise' | 'borderline';
}
```

### P1-008: CopilotKit + LangGraph Spike
Goal: Prove the AG-UI streaming loop works before building all 7 nodes.
- Express backend: `backend/src/copilotkit/runtime.ts` — CopilotKit Runtime at `POST /api/copilotkit`
- LangGraph stub: StateGraph with one pass-through node that emits STATE_DELTA
- Frontend: `CopilotKitProvider` in layout.tsx, `useCoAgent` hook in a test page
- `STATE_DELTA` updates should render in the browser in real time
- Proof: type a message → see `pipelineStatus: 'running'` in UI → then `pipelineStatus: 'completed'`

---

## FILE MAP — exactly where to create each file

```
backend/src/config/config.ts          ← P1-003: Zod env validation
backend/src/lib/Neo4jClient.ts         ← P1-001: Singleton
backend/src/lib/SupabaseClient.ts      ← P1-001: Singleton  
backend/src/lib/AnthropicClient.ts     ← P1-001: Singleton
backend/src/routes/health.routes.ts   ← P1-002: health check
backend/src/index.ts                  ← P1-001: Express entry
backend/src/app.ts                    ← P1-001: Express factory
backend/supabase/migrations/20250101000000_phase1_core.sql  ← P1-004
backend/src/copilotkit/runtime.ts     ← P1-008: CopilotKit
backend/src/pipeline/graph.ts         ← P1-008: LangGraph stub

frontend/src/app/layout.tsx           ← P1-001: providers
frontend/src/app/page.tsx             ← P1-001: home redirect
frontend/src/providers/QueryProvider.tsx        ← P1-001
frontend/src/providers/CopilotKitProvider.tsx   ← P1-008
frontend/src/lib/supabase.ts          ← P1-001: browser client
frontend/src/lib/api-client.ts        ← P1-001: fetch wrapper
frontend/src/lib/query-client.ts      ← P1-001: TanStack config
frontend/src/styles/globals.css       ← P1-001: Tailwind + tokens

packages/shared-types/src/pipeline.ts ← P1-007
packages/shared-types/src/database.ts ← P1-007
packages/shared-types/src/api.ts      ← P1-007
packages/shared-types/src/index.ts    ← P1-007

seeder/src/seed-layer1.ts             ← P1-005: CYPHER in TS
seeder/src/seed-layer2.ts             ← P1-006: Framework nodes

.github/workflows/ci.yml              ← P1-003: CI pipeline
```

---

## KEY PATTERNS FOR THIS EPIC

### Singleton Pattern (backend/src/lib/)
```typescript
// Neo4jClient.ts
import neo4j, { Driver } from 'neo4j-driver';
import { config } from '../config/config';

class Neo4jClient {
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
  static async close(): Promise<void> {
    if (this.instance) { await this.instance.close(); this.instance = null; }
  }
}
export const neo4j_driver = Neo4jClient.getInstance;
```

### Zod Config (backend/src/config/config.ts)
```typescript
import { z } from 'zod';
const envSchema = z.object({
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),          // NOTE: NEO4J_USER not NEO4J_USERNAME
  NEO4J_PASSWORD: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  VOYAGE_API_KEY: z.string(),
  LLAMAPARSE_API_KEY: z.string().optional(),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export const config = envSchema.parse(process.env);
```

### CopilotKit Runtime (P1-008)
```typescript
import { CopilotRuntime, AnthropicAdapter } from '@copilotkit/runtime';
import Anthropic from '@anthropic-ai/sdk';

const runtime = new CopilotRuntime({
  agents: { journey_generation: graph }  // LangGraph StateGraph
});
export const copilotKitHandler = runtime.handler({
  model: new AnthropicAdapter({ anthropic: new Anthropic() })
});
// Mount at POST /api/copilotkit in index.ts
```

---

## DESIGN TOKENS (use these in frontend, not raw hex)
```css
/* frontend/src/styles/globals.css */
:root {
  --cream: #f5f3ef;
  --parchment: #faf9f6;
  --navy: #002c76;
  --blue: #2b71b9;
  --green: #69a338;
  --red: #d32f2f;
  --amber: #f59e0b;
  --gray-600: #4b5563;
  --gray-300: #d1d5db;
}
/* Fonts: Lora (headings), Source Sans 3 (body), DM Mono (labels) */
```

---

## FAILURE MODES FOR THIS EPIC

1. **NEO4J_USER typo** — env var is `NEO4J_USER` not `NEO4J_USERNAME`. Connection fails silently.
2. **MERGE vs CREATE** — all Neo4j seeder writes must use MERGE. CREATE causes duplicate nodes on re-run.
3. **pgvector not enabled** — `CREATE EXTENSION IF NOT EXISTS vector` must run BEFORE table creation.
4. **CopilotKit version mismatch** — `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime` must be same version.
5. **STATE_DELTA not streaming** — if you return from graph node instead of yielding events, nothing renders in UI.
6. **Supabase RLS blocks everything** — after enabling RLS, every table needs a policy or all reads return empty.
7. **turbo caching stale** — if types change but turbo cache is hot, consumers see old types. Run `turbo run build --force` on type changes.

---

## SMOKE TEST (proves epic is done)
```bash
# 1. Monorepo boots
pnpm dev
# frontend:3000 → 200 OK
# backend:3001/health → { status: 'ok', neo4j: true, supabase: true }

# 2. Neo4j node counts
# Layer 1: ~65 nodes
# Layer 2: ~492 nodes  
# Total: ~557 nodes

# 3. Supabase tables exist
# All 8 tables visible in Supabase dashboard

# 4. CopilotKit spike
# Navigate to /workbench-test
# Type "hello" → see pipelineStatus: 'running' → then 'completed' in React DevTools
```
