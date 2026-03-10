# Context Packet: Epic 1.2 — Single Course Ingestion
# Stories: P1-009 through P1-015 | Weeks 3–4
# SELF-CONTAINED: Everything needed is inlined here. No reference chasing.

---

## WHAT THIS EPIC DELIVERS

A faculty member uploads a PDF syllabus → the system extracts academic content →
chunks it intelligently → embeds it with Voyage AI + OpenAI (dual-provider) → extracts SubConcepts via Claude Haiku →
aligns SubConcepts to USMLE frameworks → persists everything in Supabase + Neo4j.

**Exit gate:** Upload MEDI-531 syllabus → Neo4j has 15–40 SubConcept nodes with TEACHES edges
from ContentChunk nodes → pgvector embeddings searchable → USMLE MAPS_TO edges present.

---

## STORY ACCEPTANCE CRITERIA

### P1-009: File Upload Endpoint
- `POST /api/v1/uploads` — multipart/form-data, PDF only, max 50MB
- Stores in Supabase Storage bucket `raw-uploads`
- Storage path: `{institution_id}/{course_id}/{upload_id}/{original_filename}`
- WORM: write-once, no overwrites or deletes via API
- Creates `uploads` row with `status: 'pending'`
- Returns `{ upload_id, status: 'pending' }`
- Auth: JWT with `role: 'faculty'` or `role: 'institutional_admin'`
- Validate: PDF mime type + size check
- Use `multer` for multipart parsing

### P1-010: PDF Syllabus Parser (Markdown-first)
See SOL-006 below. Key ACs:
- `POST /api/v1/uploads/:id/parse` triggers parsing
- **Always try LlamaParse API first** (returns Markdown natively)
- Fallback to `python/pdf-parser` service (pdfplumber) if LlamaParse fails
- Last fallback: `pdf-parse` npm package (raw text — last resort)
- Output: `ParsedDocument { markdown, page_count, extraction_method, has_tables }`
- Updates `uploads.status` to `'processing'`
- Success metric: output contains `|` pipe characters if syllabus has tables

### P1-011: Markdown-Aware Chunker
- Input: `ParsedDocument.markdown`
- Split strategy: `##` headers first → then `\n\n` → respect 800-token target
- NEVER split inside a Markdown table row (`| ... |`)
- NEVER split mid-sentence
- Each chunk gets `chunk_index`, `token_count`, `source_type: 'syllabus'`
- Output: `ContentChunk[]` saved to `content_chunks` table

### P1-012: Dual Embedding Service (Voyage AI + OpenAI)
**Design:** Two providers, two nullable vector columns, one Strategy interface. Both embed at ingest time. One is used at search time (config-controlled). 6-month comparison — no re-ingest needed to switch.

- `IEmbeddingProvider`: `{ name, model, dimensions, embed(texts): Promise<number[][]> }`
- `VoyageEmbeddingProvider` — `voyage-large-2`, **1024-dim**, batch max 128, 300 RPM
- `OpenAIEmbeddingProvider` — `text-embedding-3-small`, **1536-dim**, batch max 100, 3000 RPM
- `EmbeddingProviderFactory.getIngestProviders(config)` — reads `EMBEDDING_PROVIDERS=voyage,openai`
- `EmbeddingProviderFactory.getSearchProvider(config)` — reads `EMBEDDING_SEARCH_PROVIDER=voyage|openai`
- `EmbedderService.embedChunks()` — runs ALL ingest providers **sequentially** (avoid rate-limit collisions)
- `EmbedderService.searchChunks(query, courseId, limit, overrideProvider?)` — uses search provider

**Schema (two nullable columns, two HNSW indexes):**
```sql
ALTER TABLE content_chunk_embeddings
  ADD COLUMN voyage_embedding  vector(1024),
  ADD COLUMN voyage_model      TEXT DEFAULT 'voyage-large-2',
  ADD COLUMN openai_embedding  vector(1536),
  ADD COLUMN openai_model      TEXT DEFAULT 'text-embedding-3-small';

CREATE INDEX idx_voyage_hnsw ON content_chunk_embeddings
  USING hnsw (voyage_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX idx_openai_hnsw ON content_chunk_embeddings
  USING hnsw (openai_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

**Two Supabase RPC functions** (different vector dimensions — cannot be one function):
```sql
CREATE FUNCTION search_chunks_voyage(query_embedding vector(1024), course_id UUID, match_count INT)
CREATE FUNCTION search_chunks_openai(query_embedding vector(1536), course_id UUID, match_count INT)
```

**Env vars:**
```
EMBEDDING_PROVIDERS=voyage,openai    # both columns populated at ingest
EMBEDDING_SEARCH_PROVIDER=voyage     # switch to openai to compare — no re-ingest
VOYAGE_API_KEY=pa-...
OPENAI_API_KEY=sk-...
```

### P1-013: AI Concept Extraction (Two-Stage)
See SOL-007 below. Key ACs:
**Stage 1 — Classifier (Haiku):**
- Classify each chunk: `{ type: 'academic' | 'noise' | 'borderline' }`
- Academic chunks only proceed to Stage 2
- Noise threshold: if `noise_ratio > 0.4`, log warning

**Stage 2 — Concept Extractor (Haiku, academic chunks only):**
- Extract 2–5 SubConcept names per academic chunk
- Also extract: `usmle_system_guess`, `usmle_discipline_guess`, `bloom_level_guess`
- Each SubConcept: `MERGE (sc:SubConcept {name: $name, uuid: $uuid})`
- Create `TEACHES` edge: `(chunk)-[:TEACHES]->(sc)`
- Use DualWriteService (P1-014)

### P1-014: DualWriteService
```typescript
// backend/src/services/dual-write.service.ts
class DualWriteService {
  async dualWrite<T>(
    supabaseWrite: () => Promise<T>,
    neo4jWrite: (result: T) => Promise<void>
  ): Promise<T> {
    // 1. Write Supabase (throw on failure — do NOT proceed to Neo4j)
    const result = await supabaseWrite();
    // 2. Write Neo4j (on failure: update sync_status='failed', log, don't throw)
    try {
      await neo4jWrite(result);
    } catch (err) {
      await this.markFailed(result);
      logger.error('Neo4j write failed', err);
    }
    return result;
  }
  async reconcileFailures(): Promise<void> {
    // Query all sync_status='failed' records → retry neo4j write
    // Called via POST /api/v1/admin/reconcile
  }
}
```
Rules:
- Supabase fails → throw, do NOT write Neo4j
- Neo4j fails → Supabase persists, `sync_status = 'failed'`
- All Neo4j writes use MERGE (idempotent)
- Writes `neo4j_node_id` back to Supabase on success
- `sync_status` states: `pending | synced | failed | orphaned`

### P1-015: Framework Alignment
- Runs after P1-013 concept extraction
- Haiku's `usmle_system_guess` → match to existing USMLE_System node in Neo4j
- Create `MAPS_TO` edge: `(sc:SubConcept)-[:MAPS_TO]->(us:USMLE_System)`
- Match is fuzzy: "Cardiovascular" matches "Cardiovascular System"
- If no match → skip (don't create garbage edges)
- Also create MAPS_TO for USMLE_Discipline
- Store convenience props on SubConcept: `usmle_system`, `usmle_discipline`

---

## FILE MAP

```
backend/src/routes/upload.routes.ts           ← P1-009
backend/src/controllers/upload.controller.ts  ← P1-009
backend/src/services/upload.service.ts        ← P1-009, P1-010
backend/src/repositories/upload.repository.ts ← P1-009
backend/src/ingestion/PdfParserFactory.ts     ← P1-010: Factory pattern
backend/src/ingestion/parsers/IPdfParser.interface.ts   ← P1-010
backend/src/ingestion/parsers/LlamaParseParser.ts       ← P1-010: preferred
backend/src/ingestion/parsers/PdfplumberParser.ts       ← P1-010: fallback
backend/src/ingestion/parsers/PdfParseParser.ts         ← P1-010: last resort
backend/src/ingestion/ChunkerService.ts       ← P1-011
backend/src/ingestion/EmbedderService.ts      ← P1-012
backend/src/ingestion/ClassifierNode.ts       ← P1-013: Stage 1
backend/src/ingestion/ConceptExtractorNode.ts ← P1-013: Stage 2
backend/src/services/dual-write.service.ts    ← P1-014: CRITICAL
backend/src/repositories/chunk.repository.ts  ← P1-011, P1-012
backend/src/repositories/graph.repository.ts  ← P1-013, P1-015
backend/src/pipeline/prompts/classifier-system.txt       ← P1-013
backend/src/pipeline/prompts/concept-extractor-system.txt ← P1-013
```

---

## INGESTION PIPELINE FLOW

```
Upload PDF → POST /api/v1/uploads/:id/parse
  ↓
PdfParserFactory.create(config) → IPdfParser
  ├── LlamaParseParser (preferred) → Markdown
  ├── PdfplumberParser (fallback)  → Markdown
  └── PdfParseParser (last resort) → raw text
  ↓
ParsedDocument { markdown, has_tables, extraction_method }
  ↓
ChunkerService.chunk(markdown) → ContentChunk[]
  (split on ## headers, never inside | tables, 800 token target)
  ↓
ClassifierNode.classify(chunks) → { academic[], noise[], borderline[] }
  (Haiku, ~$0.002 per syllabus)
  ↓
EmbedderService.embedChunks(academicChunks) → BOTH providers run sequentially
  (Voyage voyage-large-2 1024-dim batch≤128 + OpenAI text-embedding-3-small 1536-dim batch≤100)
  → voyage_embedding + openai_embedding columns both populated in content_chunk_embeddings
  ↓
ConceptExtractorNode.extract(academicChunks) → SubConcept[]
  (Haiku, 2-5 concepts per chunk)
  ↓
DualWriteService: Supabase content_chunks + Neo4j ContentChunk nodes + TEACHES edges
  ↓
FrameworkAligner: MAPS_TO edges to USMLE_System / USMLE_Discipline
```

---

## CRITICAL IMPLEMENTATION PATTERNS

### Factory Pattern (PdfParserFactory)
```typescript
// backend/src/ingestion/PdfParserFactory.ts
export class PdfParserFactory {
  static create(config: { llamaparse_key?: string; use_python_service: boolean }): IPdfParser {
    if (config.llamaparse_key) return new LlamaParseParser(config.llamaparse_key);
    if (config.use_python_service) return new PdfplumberParser();
    return new PdfParseParser();   // last resort
  }
}
// Callers NEVER import individual parsers. Always use the factory.
```

### Strategy Pattern (IPdfParser interface)
```typescript
// backend/src/ingestion/parsers/IPdfParser.interface.ts
export interface IPdfParser {
  parse(filePath: string): Promise<ParsedDocument>;
}
// All 3 parsers implement this. Swap without changing callers.
```

### Chunker - Table Safety Rule
```typescript
// NEVER do this:
chunks = markdown.split('\n\n');  // ← WRONG: splits mid-table

// DO this:
function splitMarkdownSafely(markdown: string): string[] {
  const sections = markdown.split(/(?=^#{1,2} )/m);  // split on headers first
  return sections.flatMap(section => {
    if (isInsideTable(section)) return [section];     // keep tables whole
    return splitOnParagraphs(section, 800);           // then split paragraphs
  });
}
```

### Classifier Prompt (embed in context packet)
```
System: You are a medical curriculum classifier. Classify each text chunk as:
- "academic": contains medical concepts, learning objectives, clinical content, pathophysiology
- "noise": administrative text (attendance policy, grading rubric, contact info, course schedule)  
- "borderline": mixed content, or uncertain

Return ONLY valid JSON: { "type": "academic" | "noise" | "borderline", "confidence": 0.0-1.0 }
```

### Concept Extractor Prompt
```
System: You are a medical education ontologist. Extract SubConcepts from academic medical text.

For each academic chunk, return JSON:
{
  "concepts": ["concept name 1", "concept name 2"],  // 2-5 PascalCase names
  "usmle_system_guess": "Cardiovascular System",     // one of the 16 USMLE systems or null
  "usmle_discipline_guess": "Pathology",             // one of the disciplines or null
  "bloom_level_guess": 3                             // 1-6
}

Rules:
- Concept names are PascalCase, specific (not "Disease" but "AtherosclerosisPathogenesis")
- Return ONLY valid JSON, no preamble
```

---

## DATABASE SHAPES THIS EPIC TOUCHES

**Supabase writes:**
- `uploads` — status transitions: pending → processing → completed/failed
- `content_chunks` — one row per chunk, sync_status starts 'pending'
- `content_chunk_embeddings` — one row per chunk, two nullable vector columns: `voyage_embedding vector(1024)` + `openai_embedding vector(1536)`

**Neo4j writes (via DualWriteService):**
- `MERGE (cc:ContentChunk {uuid: $id})` — skinny node, uuid + chunk_index only
- `MERGE (sc:SubConcept {uuid: $uuid, name: $name})`
- `MERGE (cc)-[:TEACHES]->(sc)` — the key relationship
- `MERGE (sc)-[:MAPS_TO]->(us:USMLE_System {name: $system})` — framework alignment

**CRITICAL:** After Neo4j MERGE succeeds:
- Write `neo4j_node_id` back to Supabase `content_chunks.neo4j_node_id`
- Set `sync_status = 'synced'`

---

## USMLE SYSTEMS (exact names — use these for MAPS_TO matching)
Cardiovascular System, Endocrine System, Gastrointestinal System, Hematologic System,
Immune System, Musculoskeletal System, Nervous System, Renal System, Reproductive System,
Respiratory System, Skin & Subcutaneous Tissue, Multisystem Processes & Disorders,
Behavioral Health & Nervous System/Special Senses, Nutritional & Digestive Disorders,
Social Sciences, General Principles of Foundational Science

---

## FAILURE MODES FOR THIS EPIC

1. **Raw text extraction** — if LlamaParse is unavailable and pdf-parse runs, syllabus tables collapse to garbage. Always check: `has_tables && extraction_method === 'pdf-parse'` → warn faculty, don't proceed with chunking.
2. **Chunker splits mid-table** — splits on `\n` inside `| cell | cell |` rows. Always detect table lines before splitting.
3. **Classifier skipped** — sending all 100 chunks to concept extractor costs ~$0.30 vs $0.01 with classifier. Never skip classifier.
4. **DualWrite order reversed** — writing Neo4j before Supabase violates the contract. If Supabase row doesn't exist, Neo4j node is an orphan.
5. **sync_status never updated** — if you forget to call `markSynced()` after successful Neo4j write, reconciler will keep retrying.
6. **Voyage batch limit** — max 128 texts per API call. If you send 200 chunks at once, API returns 422.
7. **SubConcept name collision** — "Atherosclerosis" from MEDI-531 and "Atherosclerosis" from MEDI-532 must MERGE to the same node (they're the same concept). MERGE on name, not upload_id.

---

## SMOKE TEST
```bash
# Upload test syllabus
curl -X POST http://localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer $JWT" \
  -F "file=@fixtures/test-syllabus.pdf" \
  -F "courseId=medi-531"

# Trigger parse
curl -X POST http://localhost:3001/api/v1/uploads/$UPLOAD_ID/parse \
  -H "Authorization: Bearer $JWT"

# Check results in Neo4j:
# MATCH (sc:SubConcept) RETURN count(sc)  → should be 15-40
# MATCH ()-[:TEACHES]->() RETURN count(*) → should match SubConcept count
# MATCH (sc)-[:MAPS_TO]->() RETURN count(*) → should be > 0

# Check Supabase:
# content_chunks → rows with sync_status = 'synced'
# content_chunk_embeddings → both columns populated
# SELECT count(*), count(voyage_embedding), count(openai_embedding) FROM content_chunk_embeddings;
# → all three counts equal (both providers ran)
```
