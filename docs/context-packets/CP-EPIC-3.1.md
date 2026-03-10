# CP-EPIC-3.1 — Multi-Course Ingestion (Weeks 17–18)
**Stories:** P3-001 · P3-002 · P3-003 · P3-004 · P3-005 · P3-006
**Auto-loaded by:** `/story P3-00N` where N = 1–6

---

## What This Epic Builds

Scales the Phase 1 single-course pipeline into a production-grade, Inngest-orchestrated multi-course ingestion system. Adds PPTX parsing, ingests all 9 MSM syllabi, deduplicates SubConcepts across courses, and extracts + links Student Learning Outcomes (SLOs) to Institutional Learning Outcomes (ILOs).

**Exit gate:** All 9 syllabi ingested. SubConcepts deduplicated across courses (20–40% reduction). SLO → ILO FULFILLS relationships created.

---

## Prerequisites

- Epic 2.2 complete: Inngest installed and working
- Phase 1 ingestion pipeline: upload → parse → chunk → embed → extract → dual-write working for MEDI 531
- P1-006: ILO nodes exist in Neo4j (Layer 2 seed)

---

## Phase 3 Ingestion Pipeline (Inngest 7-Stage)

```typescript
// backend/src/inngest/ingestion-pipeline.function.ts

export const ingestionPipelineFunction = inngest.createFunction(
  {
    id: 'ingestion-pipeline',
    concurrency: { limit: 3 },     // max 3 courses ingesting simultaneously
    retries: 3,
  },
  { event: 'journey/ingest.requested' },
  async ({ event, step }) => {
    const { uploadId, courseId, userId, filePath, fileType } = event.data;

    // Stage 1: Validate file
    await step.run('validate_file', async () => {
      const file = await getUploadedFile(filePath);
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.mimeType)) {
        throw new Error(`Unsupported file type: ${file.mimeType}`);
      }
      if (file.sizeBytes > 100 * 1024 * 1024) throw new Error('File exceeds 100MB limit');
      await updateJobStage(uploadId, 'validate_file', 10);
    });

    // Stage 2: Parse document
    const parsedDoc = await step.run('parse_document', async () => {
      const parser = PdfParserFactory.create(fileType);  // returns PptxParser for .pptx
      const result = await parser.parse(filePath);
      await updateJobStage(uploadId, 'parse_document', 25);
      return result;
    });

    // Stage 3: Semantic chunk
    const chunks = await step.run('semantic_chunk', async () => {
      const result = await chunkDocument(parsedDoc, { maxTokens: 800, overlap: 100 });
      await updateJobStage(uploadId, 'semantic_chunk', 40);
      return result;
    });

    // Stage 4: Classify chunks
    const classifiedChunks = await step.run('classify_chunks', async () => {
      const result = await classifyChunks(chunks);  // Haiku classifier
      await updateJobStage(uploadId, 'classify_chunks', 55);
      return result;
    });

    // Stage 5: Embed chunks (dual provider)
    await step.run('embed_chunks', async () => {
      await embedderService.embedBatch(classifiedChunks, uploadId);
      await updateJobStage(uploadId, 'embed_chunks', 70);
    });

    // Stage 6: Extract concepts (SubConcepts + ProficiencyVariables + SLOs)
    const extractedData = await step.run('extract_concepts', async () => {
      const concepts = await conceptExtractorNode.run(classifiedChunks, courseId);
      const slos = await sloExtractorNode.run(parsedDoc, courseId);
      await updateJobStage(uploadId, 'extract_concepts', 85);
      return { concepts, slos };
    });

    // Stage 7: Dual write
    await step.run('dual_write', async () => {
      await dualWriteService.writeIngestResult(uploadId, courseId, classifiedChunks, extractedData);
      await updateJobStage(uploadId, 'dual_write', 100);
      await updateJobStatus(uploadId, 'completed');
    });

    await inngest.send({ name: 'journey/ingest.completed', data: { uploadId, courseId } });
  }
);
```

---

## Phase 3 SQL Migration

```sql
-- backend/supabase/migrations/20260101000000_phase3_ingestion.sql

-- ── Ingestion jobs ─────────────────────────────────────────────────────────
CREATE TABLE ingestion_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id        UUID NOT NULL,
  course_id        UUID NOT NULL,
  status           TEXT DEFAULT 'queued',  -- queued | running | completed | failed
  stage            TEXT,                    -- current pipeline stage
  progress_pct     INTEGER DEFAULT 0,
  total_chunks     INTEGER,
  embedded_chunks  INTEGER DEFAULT 0,
  extracted_concepts INTEGER DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── SLOs ─────────────────────────────────────────────────────────────────────
CREATE TABLE slos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text            TEXT NOT NULL,
  course_id       UUID NOT NULL,
  week_number     INTEGER,
  bloom_guess     INTEGER,
  ilo_id          UUID,                   -- FK to reference ILOs table
  fulfills_status TEXT DEFAULT 'pending', -- pending | linked | skipped
  neo4j_node_id   TEXT,
  sync_status     TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── SLO → ILO suggestion log ─────────────────────────────────────────────────
CREATE TABLE slo_ilo_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id      UUID NOT NULL REFERENCES slos(id),
  ilo_id      TEXT NOT NULL,   -- ILO uuid (stored in Neo4j, reference only)
  ilo_name    TEXT,
  similarity  FLOAT NOT NULL,
  accepted    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── SubConcept dedup tracking ────────────────────────────────────────────────
ALTER TABLE sub_concepts ADD COLUMN IF NOT EXISTS canonical_id UUID;  -- null = IS canonical

CREATE TABLE sub_concept_dedup_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merged_node_id  TEXT NOT NULL,    -- Neo4j uuid of merged (deleted) node
  canonical_node_id TEXT NOT NULL,  -- Neo4j uuid of kept canonical node
  similarity      FLOAT NOT NULL,
  merged_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Sub-concept analytics (from P3-009 PageRank) ────────────────────────────
CREATE TABLE sub_concept_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_concept_id  TEXT NOT NULL,    -- Neo4j uuid
  pagerank        FLOAT,
  betweenness     FLOAT,
  computed_at     TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own jobs" ON ingestion_jobs FOR SELECT USING (true);  -- all authenticated users
ALTER TABLE slos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty see course slos" ON slos FOR ALL USING (true);  -- RLS by institution in Phase 4
```

---

## PPTX Parser Contract

```typescript
// backend/src/ingestion/parsers/PptxParser.ts

import PptxTextExtract from 'pptx-text-extract';

export class PptxParser implements IPdfParser {
  async parse(filePath: string): Promise<ParsedDocument> {
    const result = await PptxTextExtract.extract(filePath);
    return {
      pages: result.slides.map((slide, i) => ({
        pageNumber: i + 1,
        text: `[Slide ${i + 1}]\n${slide.text}\n[Notes]\n${slide.notes || ''}`.trim(),
        metadata: {
          source: 'pptx',
          slideNumber: i + 1,
          hasNotes: Boolean(slide.notes),
          isEmpty: !slide.text && !slide.notes,
        },
      })).filter(p => !p.metadata.isEmpty),
    };
  }
}
```

---

## SubConcept Dedup Algorithm

```typescript
// scripts/dedup-subconcepts.ts (key logic)

const DEDUP_THRESHOLD = 0.92;

// 1. Get all SubConcept names + uuids from Neo4j
// 2. Embed all names in batches of 100 using EmbedderService
// 3. Build similarity matrix (only upper triangle — O(n²/2))
// 4. Find clusters: if similarity(A,B) >= 0.92, they're the same concept
// 5. Per cluster: canonical = node with most TEACHES edges

async function mergeNodes(canonical: SubConceptNode, merged: SubConceptNode, similarity: number) {
  // Redirect all edges from merged → canonical
  await neo4j.run(`
    MATCH (merged:SubConcept {uuid: $mergedUuid})<-[r:TEACHES]-(cc:ContentChunk)
    MATCH (canonical:SubConcept {uuid: $canonicalUuid})
    MERGE (cc)-[:TEACHES]->(canonical)
    DELETE r
  `, { mergedUuid: merged.uuid, canonicalUuid: canonical.uuid });

  await neo4j.run(`
    MATCH (merged:SubConcept {uuid: $mergedUuid})<-[r:TEACHES_VERIFIED]-(cc:ContentChunk)
    MATCH (canonical:SubConcept {uuid: $canonicalUuid})
    MERGE (cc)-[:TEACHES_VERIFIED]->(canonical)
    DELETE r
  `, { mergedUuid: merged.uuid, canonicalUuid: canonical.uuid });

  // Redirect TARGETS from AssessmentItems
  await neo4j.run(`
    MATCH (ai:AssessmentItem)-[r:TARGETS]->(merged:SubConcept {uuid: $mergedUuid})
    MATCH (canonical:SubConcept {uuid: $canonicalUuid})
    MERGE (ai)-[:TARGETS]->(canonical)
    DELETE r
  `, { mergedUuid: merged.uuid, canonicalUuid: canonical.uuid });

  // Delete merged node
  await neo4j.run(`MATCH (n:SubConcept {uuid: $mergedUuid}) DETACH DELETE n`, { mergedUuid: merged.uuid });

  // Update Supabase canonical_id
  await supabase.from('sub_concepts').update({ canonical_id: canonical.uuid }).eq('neo4j_node_id', merged.uuid);

  // Log
  await supabase.from('sub_concept_dedup_log').insert({ merged_node_id: merged.uuid, canonical_node_id: canonical.uuid, similarity });
}
```

---

## SLO Extraction Prompt

```
backend/src/pipeline/prompts/slo-extractor-system.txt

Extract all Student Learning Outcomes (SLOs) from this syllabus text.

Look for sections labeled: "Learning Objectives", "Course Objectives", "Student Learning Outcomes",
"Upon completion students will be able to", "By the end of this course".

For each SLO found, return a JSON array:
[
  {
    "text": "full SLO statement",
    "weekNumber": 3,          // null if not week-specific
    "bloomGuess": 3           // 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create
  }
]

Return ONLY valid JSON array, no preamble, no markdown fences.
If no SLOs found, return: []
```

---

## New Files (Epic 3.1)

```
backend/src/inngest/ingestion-pipeline.function.ts    (replaces synchronous Phase 1 pipeline)
backend/src/ingestion/parsers/PptxParser.ts
backend/src/ingestion/SloExtractorNode.ts
backend/src/pipeline/prompts/slo-extractor-system.txt
backend/src/services/SubConceptDedupService.ts
backend/src/controllers/ingestion.controller.ts
backend/src/repositories/ingestion-job.repository.ts
backend/src/controllers/slo.controller.ts
backend/src/services/slo.service.ts
backend/src/repositories/slo.repository.ts
backend/src/routes/slo.routes.ts
scripts/bulk-ingest.ts
scripts/dedup-subconcepts.ts
backend/supabase/migrations/20260101000000_phase3_ingestion.sql
```

---

## Smoke Tests

```bash
# 1. Ingestion pipeline for one new course
curl -X POST localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer $JWT" \
  -F "file=@fixtures/syllabi/medi-532.pdf" -F "courseId=medi-532"
# Poll until completed (all 7 stages)

# 2. PPTX parser
curl -X POST localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer $JWT" \
  -F "file=@fixtures/lectures/cardio-lecture.pptx" -F "courseId=medi-531"
# Check: content_chunks have source='pptx' in metadata

# 3. Bulk ingest all 9 courses
pnpm tsx scripts/bulk-ingest.ts
# Wait ~30 minutes for all 9 to complete
# MATCH (sc:SubConcept) RETURN count(sc)  → 500–1500 (pre-dedup)

# 4. SubConcept dedup
pnpm tsx scripts/dedup-subconcepts.ts
# MATCH (sc:SubConcept) RETURN count(sc)  → 300–1000 (20–40% reduction)
# SELECT count(*) FROM sub_concept_dedup_log → > 0

# 5. SLOs extracted
# MATCH (s:SLO) RETURN count(s)  → 100–500 (across 9 courses)
# SELECT count(*) FROM slos WHERE fulfills_status = 'pending' → most are pending

# 6. SLO → ILO linking
curl "localhost:3001/api/v1/slos?courseId=medi-531&status=pending&limit=3" \
  -H "Authorization: Bearer $ADMIN_JWT"
# Expected: suggestions array with ilo candidates
```
