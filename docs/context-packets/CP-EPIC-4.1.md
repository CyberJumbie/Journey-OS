# CP-EPIC-4.1 — Item Bank + Management (Weeks 25–26)
**Stories:** P4-001 · P4-002 · P4-003 · P4-004
**Auto-loaded by:** `/story P4-00N` where N = 1–4

---

## What This Epic Builds

Upgrades the Phase 1 basic question bank into a production-grade item bank with advanced filtering, rich inline editing with automatic re-validation, per-item analytics with Critic radar chart and UMLS grounding, and a legacy import pipeline for existing MSM questions.

**Exit gate:** Item bank filterable by all dimensions. Legacy questions importable. Rich editor re-validates on save. ≥ 200 total approved items (combined AI-generated + legacy import).

---

## Prerequisites

- P1-029: basic question bank exists (`/items`)
- P2-001: tags (bloom_level, usmle_system, difficulty) on items
- P2-004: critic scores on items
- P2-015: Toulmin JSONB on items
- P3-018: standard_terms table exists (UMLS grounding, may be partial)
- Epic 2.2: Inngest installed

---

## Phase 4 SQL Migration (Epic 4.1)

```sql
-- backend/supabase/migrations/20260201000000_phase4_item_bank.sql

-- Source tracking on assessment_items
ALTER TABLE assessment_items
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_generated';
  -- values: 'ai_generated' | 'legacy_import' | 'manual'

-- Import job tracking
CREATE TABLE import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  total_rows    INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  failed_rows   INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  errors        JSONB DEFAULT '[]'::jsonb,  -- array of {row, error}
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage import jobs" ON import_jobs FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

---

## Item Bank Filters (Full Set)

```typescript
// backend/src/services/item-bank.service.ts
interface ItemBankFilters {
  // Phase 1 / prototype filters
  system?: string;          // USMLE system name (partial match)
  difficulty?: string;      // 'Easy' | 'Medium' | 'Hard'
  bloom?: number;           // 1–6
  status?: string;          // 'approved' | 'draft' | 'rejected'
  format?: string;          // 'Single Best Answer' (all Phase 1–4 items)
  search?: string;          // full-text search on stem + vignette
  page?: number;
  limit?: number;

  // Phase 4 additions
  critic_min?: number;      // min critic_composite_score
  has_toulmin?: boolean;    // items with/without Toulmin
  task_shell_id?: string;   // filter by TaskShell used
  auto_route?: string;      // 'auto_approve' | 'faculty_review' | 'auto_reject'
  batch_id?: string;        // items from a specific bulk batch
  source?: string;          // 'ai_generated' | 'legacy_import'
  sort?: string;            // 'created_at' | 'critic_composite_score' | 'bloom_level'
  sort_dir?: 'asc' | 'desc';
}
```

---

## Rich Item Editor: Re-Validation Flow

On `PATCH /api/v1/items/:id` with full item body:

```typescript
// backend/src/controllers/item-edit.controller.ts

async updateItem(req: Request, res: Response) {
  const { vignette, stem, options, explanation } = schema.parse(req.body);
  const itemId = req.params.id;

  // 1. Save new version (immutable history)
  await assessmentItemVersionRepo.create({
    itemId, vignette, stem, options,
    editInstruction: req.body.editInstruction || 'Manual edit',
    editedBy: req.user.id,
  });

  // 2. Run validator (30 rules + Cover the Options)
  const validationResults = await validatorNode.validate({ vignette, stem, options });

  // 3. Run Critic if validation passed (expensive — skip if failed)
  let criticScores = null;
  if (validationResults.allPassed) {
    criticScores = await criticAgentNode.score({ vignette, stem, options, explanation });
  }

  // 4. Update assessment_items
  await dualWriteService.updateItem(itemId, {
    vignette, stem, options: JSON.stringify(options), explanation,
    validationResults: JSON.stringify(validationResults.results),
    validationPassed: validationResults.allPassed,
    criticCompositeScore: criticScores?.composite || null,
    ...criticScores?.metrics,
    updatedAt: new Date(),
  });

  res.json({
    validationPassed: validationResults.allPassed,
    validationResults: validationResults.results,
    criticCompositeScore: criticScores?.composite,
    autoRoute: reviewRouter.decide(validationResults, criticScores),
  });
}
```

---

## Legacy Import CSV Format

```csv
stem,vignette,option_a,option_b,option_c,option_d,option_e,correct_option,explanation,course_code,bloom_level,usmle_system
"A 45-year-old man presents with...","","Atherosclerosis","Hypertension","Diabetes","Heart failure","None of the above","a","Atherosclerosis is the most common cause...","MEDI531","3","Cardiovascular System"
```

Required columns: `stem`, `option_a`–`option_e`, `correct_option`, `course_code`  
Optional columns: `vignette`, `explanation`, `bloom_level`, `usmle_system`, `difficulty`

Missing optional fields: tagger fills them in during import pipeline.

---

## Per-Item Analytics Response

```typescript
// GET /api/v1/items/:id — full detail response
interface ItemDetailResponse extends QuestionDetail {
  // Phase 2 quality
  criticScores: {
    clinical_accuracy: number;
    vignette_realism: number;
    distractor_quality: number;
    bloom_alignment: number;
    nbme_compliance: number;
    educational_value: number;
    composite: number;
  };
  criticReasoning: string;
  validationResults: { rule: string; passed: boolean; message: string }[];
  toulmin: {
    claim: string; data: string; warrant: string;
    backing: string; rebuttal: string; qualifier: string;
  } | null;

  // Phase 3 provenance + ECD
  taskShell: { shellId: string; name: string } | null;
  contentChunkExcerpt: string | null;    // source chunk text (200 chars)
  ingestionJobId: string | null;
  generationLogId: string | null;
  pipelineVersion: string;
  retryCount: number;

  // Phase 3/4 UMLS grounding
  standardTerm: {
    cui: string;
    name: string;
    snomedCtId: string | null;
    meshId: string | null;
  } | null;

  // Source
  source: 'ai_generated' | 'legacy_import' | 'manual';
}
```

---

## New Files (Epic 4.1)

```
frontend/src/hooks/useItemBank.ts
frontend/src/hooks/useItemDetail.ts
frontend/src/hooks/useItemEditor.ts
frontend/src/app/(faculty)/repository/item-bank/page.tsx
frontend/src/app/(faculty)/items/[id]/page.tsx
frontend/src/app/(faculty)/items/[id]/edit/page.tsx
frontend/src/components/organisms/CriticRadarChart/CriticRadarChart.tsx
frontend/src/components/organisms/ToulminPanel/ToulminPanel.tsx
frontend/src/components/organisms/ProvenancePanel/ProvenancePanel.tsx
frontend/src/components/organisms/VignetteEditor/VignetteEditor.tsx
frontend/src/components/organisms/StemEditor/StemEditor.tsx
frontend/src/components/organisms/OptionsEditor/OptionsEditor.tsx
backend/src/controllers/item-bank.controller.ts
backend/src/controllers/item-edit.controller.ts
backend/src/services/item-bank.service.ts
backend/src/repositories/item-bank.repository.ts
backend/src/routes/item-bank.routes.ts
backend/src/inngest/legacy-import.function.ts
backend/src/controllers/import.controller.ts
backend/src/routes/import.routes.ts
backend/supabase/migrations/20260201000000_phase4_item_bank.sql
```

---

## Smoke Tests

```bash
# 1. Item bank with filters
curl "localhost:3001/api/v1/item-bank?bloom=3&status=approved&critic_min=3.5&limit=10" \
  -H "Authorization: Bearer $JWT" | jq '{total, items: (.items | length)}'
# Expected: all returned items have bloom_level=3, status=approved, critic_composite_score >= 3.5

# 2. Rich edit + re-validate
curl -X PATCH "localhost:3001/api/v1/items/{id}" \
  -H "Authorization: Bearer $JWT" -d '{"stem":"Updated stem...",...}'
# Expected: { validation_passed: true, critic_composite_score: > 0 }

# 3. Item detail with all panels
curl "localhost:3001/api/v1/items/{id}" -H "Authorization: Bearer $JWT" | \
  jq '{criticScores: .criticScores.composite, hasToulmin: (.toulmin != null), hasUmls: (.standardTerm != null)}'

# 4. Legacy import
curl -X POST "localhost:3001/api/v1/imports" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -F "file=@fixtures/legacy/sample-10-questions.csv"
sleep 120
# Check import job completed
curl "localhost:3001/api/v1/imports/{importId}" -H "Authorization: Bearer $ADMIN_JWT"
# Expected: { processed_rows: 10, failed_rows: 0, status: 'completed' }

# 5. ≥ 200 total approved items (Phase 4 exit gate)
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM assessment_items WHERE status='approved';"
# Expected: ≥ 200 (combined AI + legacy import)
```
