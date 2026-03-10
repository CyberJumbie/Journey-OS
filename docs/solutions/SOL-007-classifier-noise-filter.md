# SOL-007: LangGraph Classifier Node — Administrative Noise Filter

## Trigger
Any time chunks from MSM syllabi reach the concept extractor (P1-013).
Must run BEFORE the Haiku concept extraction call — noise chunks will hallucinate false SubConcepts.

Story it emerged from: P1-013 (informed by MSM syllabus analysis)
Depends on: SOL-006 (Markdown extraction must run first)

---

## The Problem

MSM syllabi have a high administrative noise-to-signal ratio. Sending noise chunks to Haiku:
- Burns tokens on content that produces no SubConcepts
- Confuses the model — "_____ inspect contour" extracted as a SubConcept is worse than nothing
- Increases cost (Haiku is cheap but not free across 50-page syllabi)

### Known Noise Patterns in MSM Syllabi

| Noise Type | Example | Source |
|---|---|---|
| Blank checklists | `_____ inspect contour, seek evidence of asymmetry` | IPC syllabus |
| Policy text | "Students who miss an exam without prior approval will receive a 0..." | All syllabi |
| Contact info | "Questions? Email Dr. Smith at jsmith@msm.edu" | All syllabi |
| Cover page | "Pathology Block — MEDI 538 — Fall 2025 — School of Medicine" | All syllabi |
| Reading lists | "Chapter 4, pages 87-102 in Robbins and Cotran Pathologic Basis..." | Pathology |
| Date-only rows | Table rows that are just dates with no associated content | Pathology schedule |

### Content to KEEP

| Content Type | Example | What to extract |
|---|---|---|
| Learning objectives | "Students will be able to describe the pathogenesis of..." | SubConcepts |
| Clinical topics | "Myocardial infarction: etiology, pathophysiology, complications" | SubConcepts |
| Session titles | "Lecture 7: Renal Pathology — Glomerulonephritis" | SubConcepts |
| Case descriptions | "A 55-year-old male presents with chest pain..." | SubConcepts + context |

---

## Implementation

### Node Location
```
apps/server/src/pipeline/nodes/classifier.node.ts
apps/server/src/pipeline/prompts/classifier-system.txt
```

### TypeScript Node

```typescript
// apps/server/src/pipeline/nodes/classifier.node.ts
import { WorkbenchState } from '@msm/shared-types'
import { readFileSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = readFileSync(
  path.join(__dirname, '../prompts/classifier-system.txt'), 'utf-8'
)

const client = new Anthropic()

export interface ClassifiedChunks {
  academic: ContentChunk[]    // pass to concept_extractor
  noise: ContentChunk[]       // discard (log counts for monitoring)
  borderline: ContentChunk[]  // log for review — may need prompt tuning
}

export async function classifierNode(chunks: ContentChunk[]): Promise<ClassifiedChunks> {
  const academic: ContentChunk[] = []
  const noise: ContentChunk[] = []
  const borderline: ContentChunk[] = []

  // Batch chunks (Haiku handles 4096 output tokens, classify 10 at a time)
  const BATCH_SIZE = 10
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    
    const response = await client.messages.create({
      model: 'claude-haiku-20240307',   // cheap — this is a routing call, not generation
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: batch.map((chunk, idx) => 
          `CHUNK_${idx}:\n${chunk.content}`
        ).join('\n\n---\n\n')
      }]
    })

    // Parse JSON classification response
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const classifications: Array<{ index: number; category: 'academic' | 'noise' | 'borderline' }> = 
      JSON.parse(text)

    for (const { index, category } of classifications) {
      const chunk = batch[index]
      if (category === 'academic') academic.push(chunk)
      else if (category === 'noise') noise.push(chunk)
      else borderline.push(chunk)
    }
  }

  console.log(`Classifier: ${academic.length} academic, ${noise.length} noise, ${borderline.length} borderline`)
  return { academic, noise, borderline }
}
```

### Prompt File

```text
// apps/server/src/pipeline/prompts/classifier-system.txt

You are classifying chunks of a medical school syllabus at Morehouse School of Medicine.
Your job: route each chunk to the correct processing lane.

CATEGORY DEFINITIONS:
- "academic": Contains medical concepts, learning objectives, clinical topics, case descriptions, 
  lecture titles, or other content that should be mapped to USMLE/LCME standards.
  Examples: clinical objectives, pathology session descriptions, anatomy learning goals, case vignettes.

- "noise": Administrative content with no medical learning value.
  Examples: attendance policies, late exam penalties, contact information, cover pages,
  blank checklists (lines starting with _____), grading breakdowns, reading assignments
  (citations only, no content), date-only rows, course logistics.

- "borderline": Ambiguous. When in doubt, mark borderline — do not lose academic content.
  Examples: A schedule row that lists a topic title but no objectives.

INPUT: You will receive CHUNK_0 through CHUNK_N separated by "---".

OUTPUT: Respond ONLY with a JSON array. No explanation. No preamble.
Format: [{"index": 0, "category": "academic"}, {"index": 1, "category": "noise"}, ...]

IMPORTANT RULES:
1. When in doubt → "borderline" (never discard potentially academic content)
2. Blank checklist items (_____ text) → always "noise"
3. Policy text → always "noise"
4. A topic title with no objectives → "borderline" (lecturer may add objectives verbally)
5. Color-coding instructions like "(blue--required participation)" → "noise" (color is lost anyway)
```

---

## Where It Goes in the Ingestion Pipeline

```
pdf_parser         → ParsedDocument (Markdown)
      ↓
chunker            → ContentChunk[] (Markdown-aware, 800 tokens)
      ↓
classifier         → { academic: ContentChunk[], noise: ContentChunk[], borderline: ContentChunk[] }
      ↓
embedder           → embeds ONLY academic chunks (saves ~30-40% embedding cost)
      ↓
concept_extractor  → receives ONLY academic chunks (no noise hallucination)
      ↓
framework_aligner  → SubConcept[] → MAPS_TO → USMLE_System
```

---

## Cost Analysis

Classifying a 50-page syllabus (~100 chunks at ~400 tokens each):
- Input tokens: 100 chunks × 400 tokens = 40,000 tokens
- Classification batch: 10 chunks/call = 10 Haiku calls
- Haiku cost: ~$0.25 per million input tokens = **~$0.01 per syllabus**
- Savings on concept_extractor: if 40% is noise, saves 16,000 Haiku tokens (~$0.004)
- Net: nearly free. The ROI is in extraction quality, not cost.

---

## Monitoring

Track in `generation_logs.pipeline_state`:
```typescript
{
  classifier: {
    total_chunks: 100,
    academic_count: 61,
    noise_count: 31,
    borderline_count: 8,
    noise_ratio: 0.31   // alert if > 0.60 (something wrong with extraction)
  }
}
```

If `noise_ratio > 0.60` → the PDF extraction likely failed (raw text, not Markdown). Alert and retry with better parser.

---

## Gotchas

- Never discard `borderline` — surface them in the UI for faculty review in a future story (SubConceptReviewQueue already exists in the prototype)
- Classifier runs in the ingestion pipeline (P1-013), NOT the generation pipeline (P1-016+)
- Haiku is correct for this — it's a routing call (cheap), not generation (quality matters more)
- If the classifier prompt over-discards, tune it by checking what's in `noise` — err toward keeping borderline

## Provenance
Pattern established: P1-013 (informed by MSM syllabus analysis)
Applies to: P1-013 (concept extractor must only receive classified academic chunks)
See also: SOL-006 (Markdown extraction — prerequisite)
