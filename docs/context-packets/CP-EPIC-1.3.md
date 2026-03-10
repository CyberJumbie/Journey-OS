# Context Packet: Epic 1.3 — Generation Pipeline
# Stories: P1-016 through P1-023 | Weeks 5–6
# SELF-CONTAINED: Everything needed is inlined here. No reference chasing.

---

## WHAT THIS EPIC DELIVERS

A 7-node LangGraph.js StateGraph that takes a faculty's natural language message →
assembles relevant curriculum context → generates a USMLE-style clinical vignette + stem +
5 options → validates against 10 NBME rules → persists in Supabase + Neo4j with full provenance.

**Exit gate:** Type "Generate a question about atherosclerosis for MEDI 531" →
see question stream progressively in browser → valid NBME-style question persisted in DB.

---

## WORKBENCH STATE (the central data structure — know this cold)

```typescript
interface WorkbenchState {
  mode: 'single' | 'bulk' | 'review';
  courseId: string;
  userMessage: string;            // faculty's natural language input
  targetConcepts: string[];       // parsed concept names
  context: string;                // assembled curriculum context (4,000 tokens)
  vignette: string;               // streams progressively
  stem: string;                   // appears after vignette
  options: GeneratedOption[];     // one at a time, A through E
  validationResults: ValidationResult[];
  pipelineStatus: 'idle' | 'running' | 'completed' | 'failed';
  generationLogId: string;        // FK to generation_logs
  itemId: string;                 // FK to assessment_items (set after P1-023)
}

interface GeneratedOption {
  label: string;       // 'A' through 'E'
  text: string;
  is_correct: boolean;
  rationale: string;
  misconception_targeted?: string;
}

interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}
```

---

## PIPELINE NODES (sequence — do NOT reorder)

```
init → context_compiler → vignette_builder → stem_writer → distractor_generator → validator → graph_writer
```

Each node: **one file, one class, one responsibility**.
Interface: `interface PipelineNode { execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> }`

---

## STORY ACCEPTANCE CRITERIA

### P1-016: StateGraph Scaffold
- `backend/src/pipeline/graph.ts` — StateGraph definition, all 7 node slots
- State channels match WorkbenchState (all fields above)
- Agent ID: `journey_generation`
- Endpoint: `POST /api/copilotkit` (via CopilotKit Runtime)
- Empty pipeline runs without error (all nodes pass-through initially)
- `WorkbenchState` imported from `@journey-os/shared-types`

### P1-017: init Node
Responsibilities (NO AI calls — pure data loading):
- Load course from Neo4j by `courseId`
- Load user profile from Supabase
- Query existing SubConcepts: `MATCH (c:Course {uuid: $id})<-[:OFFERS_COURSE]-()<-[:CONTAINS_BLOCK]-()<-[:HAS_PHASE]-()<-[:IN_YEAR]-()<-[:HAS_TRACK]-()<-[:HAS_PROGRAM]-()<-[:HAS_SCHOOL]-(i) WITH c MATCH (chunk:ContentChunk)-[:TEACHES]->(sc:SubConcept) RETURN DISTINCT sc`
  (Or simpler: traverse from chunks with IN_COURSE or use upload_id to course_id)
- Set `pipelineStatus: 'running'`
- Create `generation_logs` row in Supabase (status: 'running')
- Emit TEXT_MESSAGE: "Starting generation for [course name]..."

### P1-018: context_compiler Node
Two RAG paths merged via Reciprocal Rank Fusion:

**Graph RAG path:**
```cypher
// Find chunks that teach the target concept
MATCH (sc:SubConcept)
WHERE toLower(sc.name) CONTAINS toLower($conceptName)
MATCH (chunk:ContentChunk)-[:TEACHES]->(sc)
RETURN chunk.uuid AS chunk_id
```
Then fetch full chunk text from Supabase `content_chunks.content`.

**Vector RAG path:**
- Embed `userMessage` with Voyage AI
- `SELECT cc.* FROM content_chunks cc JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id WHERE cc.course_id = $courseId ORDER BY cce.embedding <=> $embedding LIMIT 10`

**RRF merge:**
```typescript
function reciprocalRankFusion(graphRanks: string[], vectorRanks: string[], k=60): string[] {
  const scores: Record<string, number> = {};
  graphRanks.forEach((id, i) => scores[id] = (scores[id] || 0) + 1/(k + i + 1));
  vectorRanks.forEach((id, i) => scores[id] = (scores[id] || 0) + 1/(k + i + 1));
  return Object.entries(scores).sort(([,a],[,b]) => b - a).map(([id]) => id);
}
```

**Context Refiner (Haiku):** Trim merged results to 4,000-token budget.
Emit TEXT_MESSAGE: "Found [N] relevant chunks from your course materials..."

### P1-019: vignette_builder Node
- Model: `claude-sonnet-4-5-20250929` (Sonnet only for generation)
- Input: context (4,000 tokens), targetConcepts[], userMessage
- Output: 150–200 word clinical vignette
- **STREAM via STATE_DELTA** — character by character to `vignette` field
- Prompt file: `backend/src/pipeline/prompts/vignette-builder-system.txt`
- Emit TEXT_MESSAGE: "Writing clinical vignette..."

Vignette must include: patient demographics, chief complaint, history, PE findings, labs/imaging

### P1-020: stem_writer Node
- Model: `claude-sonnet-4-5-20250929`
- Input: vignette, context, targetConcepts
- Output: single NBME-style lead-in question
- NBME phrasing: "most likely", "best next step", "most appropriate"
- Avoid negatives ("EXCEPT"), avoid "all of the following"
- Stream via STATE_DELTA to `stem` field
- Emit TEXT_MESSAGE: "Crafting question stem..."

### P1-021: distractor_generator Node
- Model: `claude-sonnet-4-5-20250929`
- **TWO PHASE** generation:
  - Phase 1 (reasoning artifact, stored in generation_logs, NOT shown to user): Explain correct answer + identify 4 misconceptions
  - Phase 2 (options): Generate 5 options using Phase 1 reasoning
- Each option: `{ label, text, is_correct, rationale, misconception_targeted }`
- Options stream one at a time via STATE_DELTA to `options[]`
- Randomize correct answer position: NOT always A or E
- Distractors must: be plausible, similar length, same grammatical form, target real misconceptions
- Emit TEXT_MESSAGE: "Generating answer options..."

### P1-022: validator Node
- NO AI calls — pure functions
- Location: `backend/src/pipeline/validators/nbme-rules.ts`

10 rules (all are warnings in Phase 1, not blockers):
```typescript
const rules: Array<(item: GeneratedQuestion) => ValidationResult> = [
  (i) => ({ rule: 'vignette_present', passed: i.vignette?.split(/\s+/).length > 50, message: 'Vignette must be >50 words' }),
  (i) => ({ rule: 'stem_question_mark', passed: i.stem?.trim().endsWith('?'), message: 'Stem must end with ?' }),
  (i) => ({ rule: 'exactly_five_options', passed: i.options?.length === 5, message: 'Exactly 5 options required' }),
  (i) => ({ rule: 'one_correct', passed: i.options?.filter(o => o.is_correct).length === 1, message: 'Exactly 1 correct answer' }),
  (i) => ({ rule: 'similar_length', passed: checkSimilarLength(i.options), message: 'Options must be similar length (max 2x ratio)' }),
  (i) => ({ rule: 'no_absolutes', passed: !hasAbsoluteTerms(i.options), message: 'No "always"/"never" in options' }),
  (i) => ({ rule: 'no_all_above', passed: !hasAllAbove(i.options), message: 'No "all of the above" or "none of the above"' }),
  (i) => ({ rule: 'no_grammatical_cue', passed: !hasGrammaticalCue(i), message: 'Correct answer must not be only grammatically fitting option' }),
  (i) => ({ rule: 'options_ordered', passed: areOptionsOrdered(i.options), message: 'Options should be in logical order' }),
  (i) => ({ rule: 'no_stem_cueing', passed: !hasStemCueing(i), message: 'Stem must not cue correct answer via repeated words' }),
];
```

### P1-023: graph_writer Node
Uses DualWriteService (P1-014):

**Supabase:**
```typescript
// Insert assessment_items row
// Insert 5 options rows
// Update generation_logs: status='completed', total_tokens_*, total_cost_usd, duration_ms
```

**Neo4j (all MERGE, never CREATE):**
```cypher
MERGE (ai:AssessmentItem {uuid: $itemId})
SET ai.bloom_level = $bloomLevel, ai.status = 'draft', ai.created_at = $now

MERGE (ai)-[:TARGETS]->(sc:SubConcept {name: $conceptName})
MERGE (ai)-[:AT_BLOOM]->(bl:BloomLevel {level: $bloomLevel})
MERGE (ai)-[:IN_COURSE]->(c:Course {uuid: $courseId})
MERGE (ai)-[:GENERATED_FROM]->(cc:ContentChunk {uuid: $chunkId})
// ↑ One GENERATED_FROM per source chunk (may be multiple)
```

Set `pipelineStatus: 'completed'` on state.
Emit TEXT_MESSAGE: "Question saved. Ready to review."

---

## FILE MAP

```
backend/src/pipeline/graph.ts                     ← P1-016: StateGraph wiring
backend/src/pipeline/PipelineNode.interface.ts    ← P1-016: interface contract
backend/src/pipeline/nodes/InitNode.ts            ← P1-017
backend/src/pipeline/nodes/ContextCompilerNode.ts ← P1-018
backend/src/pipeline/nodes/VignetteBuilderNode.ts ← P1-019
backend/src/pipeline/nodes/StemWriterNode.ts      ← P1-020
backend/src/pipeline/nodes/DistractorGeneratorNode.ts ← P1-021
backend/src/pipeline/nodes/ValidatorNode.ts       ← P1-022
backend/src/pipeline/nodes/GraphWriterNode.ts     ← P1-023
backend/src/pipeline/validators/nbme-rules.ts     ← P1-022: 10 rule functions
backend/src/pipeline/prompts/vignette-builder-system.txt    ← P1-019
backend/src/pipeline/prompts/stem-writer-system.txt         ← P1-020
backend/src/pipeline/prompts/distractor-generator-system.txt ← P1-021
backend/src/pipeline/prompts/context-refiner-system.txt     ← P1-018
```

---

## DESIGN PATTERNS IN THIS EPIC

**Interface pattern:**
```typescript
// PipelineNode.interface.ts
export interface PipelineNode {
  execute(state: WorkbenchState): Promise<Partial<WorkbenchState>>;
}
```

**Builder pattern (InitNode):**
```typescript
class WorkbenchStateBuilder {
  private state: Partial<WorkbenchState> = {};
  withCourse(course: Course) { this.state.courseId = course.id; return this; }
  withPipelineStatus(s: PipelineStatus) { this.state.pipelineStatus = s; return this; }
  withGenerationLog(id: string) { this.state.generationLogId = id; return this; }
  build(): Partial<WorkbenchState> { return this.state; }
}
// Usage: return new WorkbenchStateBuilder().withCourse(c).withPipelineStatus('running').build();
```

**Observer / event pattern (streaming):**
```typescript
// In VignetteBuilderNode — stream to STATE_DELTA
for await (const chunk of anthropic.messages.stream({ ... })) {
  if (chunk.type === 'content_block_delta') {
    yield { type: 'STATE_DELTA', state: { vignette: accumulated } };
  }
}
```

---

## MODEL USAGE (strictly enforced)
| Node | Model | Why |
|------|-------|-----|
| context_compiler (refiner) | claude-haiku-4-5 | Cheap, fast filter |
| vignette_builder | claude-sonnet-4-5-20250929 | Quality matters |
| stem_writer | claude-sonnet-4-5-20250929 | Quality matters |
| distractor_generator | claude-sonnet-4-5-20250929 | Quality critical |
| validator | NO AI | Pure functions |
| graph_writer | NO AI | DB writes only |
| init | NO AI | Data loading |

**NEVER use Opus in Phase 1.** Opus = Critic Agent, Phase 2+ only.

---

## GRAPH RELATIONSHIPS CREATED BY THIS EPIC
```
AssessmentItem -[:TARGETS]-> SubConcept
AssessmentItem -[:AT_BLOOM]-> BloomLevel
AssessmentItem -[:IN_COURSE]-> Course
AssessmentItem -[:GENERATED_FROM]-> ContentChunk
```
**Do NOT create** `AssessmentItem -[:MAPS_TO]-> USMLE_System` directly.
USMLE coverage is derived: `AssessmentItem → TARGETS → SubConcept → MAPS_TO → USMLE_System`.

---

## FAILURE MODES

1. **Wrong model** — using Haiku for vignette/stem/distractor generation. Quality degrades noticeably.
2. **Inline prompts** — writing prompt strings directly in node code. All prompts go in `pipeline/prompts/*.txt`. Load with `fs.readFileSync`.
3. **Not streaming** — collecting all tokens then returning. This breaks the CopilotKit UI. MUST stream.
4. **CREATE vs MERGE** — if pipeline retries (user regenerates), CREATE makes duplicate AssessmentItem nodes.
5. **Context over budget** — sending 8,000 tokens of context to Sonnet. Keep context_compiler to 4,000 tokens max.
6. **Reasoning artifact shown** — Phase 1 reasoning from distractor_generator Phase 1 goes to `generation_logs.pipeline_state` only, NOT to STATE_DELTA.
7. **DualWrite bypass** — writing directly to Supabase/Neo4j in graph_writer without DualWriteService.

---

## SMOKE TEST
```bash
# Start full stack
pnpm dev

# Seed Neo4j (if not done)
cd seeder && npx ts-node src/seed-layer1.ts && npx ts-node src/seed-layer2.ts

# Ingest a course syllabus (P1-010 must be done)
# Then send a generation request via CopilotKit

# Check in browser:
# 1. pipelineStatus: 'running' appears
# 2. vignette streams character by character
# 3. stem appears after vignette
# 4. options A-E appear one at a time
# 5. validationResults appear
# 6. pipelineStatus: 'completed'

# Check Neo4j:
# MATCH (ai:AssessmentItem) RETURN ai LIMIT 5
# MATCH (ai)-[:TARGETS]->(sc) RETURN ai, sc LIMIT 5
# MATCH (ai)-[:GENERATED_FROM]->(cc) RETURN ai, cc LIMIT 5

# Check Supabase:
# assessment_items table → 1 new row, status='draft'
# options table → 5 new rows for that item
# generation_logs → status='completed', duration_ms, cost set
```
