# SOL-006: Markdown-First PDF Extraction for MSM Medical Syllabi

## Trigger
Any time parsing an MSM syllabus (PDF or DOCX). Raw text extraction will silently corrupt the data.
Apply this pattern in P1-010 (PDF parser) and any future document ingestion story.

Story it emerged from: P1-010 (informed by architectural analysis of actual MSM syllabi)

---

## The Problem: 5 Known Failure Modes in MSM Syllabi

These are not hypothetical. They appear in the actual Pathology, Microbiology, FoM1, Gross Anatomy (OS2), and IPC syllabi at MSM.

### 1. Table Collapse
Tables are the primary structure for schedules. When flattened to `.txt`, column boundaries collapse:
```
# Raw text output (broken)
"August 13 Cardiovascular Introduction Dr. SmithSeptember 4 Renal PathologyDr. Jones"

# What Markdown extraction preserves
| Date | Topic | Lecturer |
|------|-------|----------|
| August 13 | Cardiovascular Introduction | Dr. Smith |
| September 4 | Renal Pathology | Dr. Jones |
```

### 2. Temporal Marker Inconsistency
Syllabi mix date formats: "August 13", "9/4", "Week 3", "Session 7", cohort-split times "(LC) -1:30-3P".
The LLM cannot reliably sequence topics without structural context.

### 3. Color-Coding Lost
FoM1 syllabus encodes modality via text color: blue = required/synchronous, peach = asynchronous.
All formatting stripped by naive text extraction → modality information destroyed.

### 4. Broken Learning Objective Hierarchies
Gross anatomy objectives have 3+ levels of nesting. Numbered sub-objectives become orphaned:
```
# Raw text (broken): "origin and course of preganglionic fibers" floats free of parent
# Markdown preserves indentation → LLM understands hierarchy
```

### 5. Administrative Noise (high token burn)
IPC syllabus contains: blank peer exam checklists (`_____ inspect contour...`),
late penalty policy pages, email templates. These consume context and confuse concept extraction.
A classifier node must strip them before the Haiku concept extractor sees the document.

---

## Solution: Markdown-First Extraction

### Strategy

Never extract raw `.txt`. Extract to **Markdown**. Markdown preserves:
- Table structure via `|` pipe notation
- Bold/italic via `**` and `_`
- Hierarchical indentation (numbered lists, nested bullets)
- Section headers via `#`

### Phase 1 Implementation (Node.js — P1-010)

`pdf-parse` (npm) will produce raw text and hit all 5 failure modes. The pragmatic Phase 1 approach:

**Option A — LlamaParse API (recommended for Phase 1):**
```typescript
// apps/server/src/services/pdf-parser.service.ts
// Cloud API, returns clean Markdown, handles MSM's complex layouts
// Free tier: 1000 pages/day — sufficient for Phase 1 testing

const LLAMAPARSE_API_KEY = config.LLAMAPARSE_API_KEY  // add to env

async function parseToMarkdown(storagePath: string): Promise<string> {
  // 1. Download from Supabase Storage
  const { data: fileBlob } = await supabase.storage
    .from('raw-uploads')
    .download(storagePath)

  // 2. Upload to LlamaParse
  const formData = new FormData()
  formData.append('file', fileBlob, path.basename(storagePath))
  
  const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLAMAPARSE_API_KEY}` },
    body: formData,
  })
  const { id: jobId } = await uploadRes.json()

  // 3. Poll for completion (LlamaParse is async)
  let markdown = ''
  for (let i = 0; i < 30; i++) {
    await sleep(2000)
    const statusRes = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
      { headers: { 'Authorization': `Bearer ${LLAMAPARSE_API_KEY}` } }
    )
    if (statusRes.ok) {
      const result = await statusRes.json()
      markdown = result.markdown
      break
    }
  }

  return markdown
}
```

**Option B — pdfplumber Python microservice (better quality, more setup):**
```python
# services/pdf-parser/app/main.py  (Python FastAPI — mirrors mip-solver pattern)
# Port: 8003
import pdfplumber
from fastapi import FastAPI, UploadFile
import io

app = FastAPI()

@app.post("/parse")
async def parse_pdf(file: UploadFile):
    content = await file.read()
    markdown_pages = []
    
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            # Extract tables first (highest priority for syllabi)
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    markdown_pages.append(table_to_markdown(table))
            else:
                # Fall back to text with layout preservation
                text = page.extract_text(layout=True)  # preserves column spacing
                if text:
                    markdown_pages.append(text)
    
    return {"markdown": "\n\n---\n\n".join(markdown_pages)}

def table_to_markdown(table: list) -> str:
    if not table or not table[0]:
        return ""
    header = "| " + " | ".join(str(c or "") for c in table[0]) + " |"
    separator = "| " + " | ".join("---" for _ in table[0]) + " |"
    rows = [
        "| " + " | ".join(str(c or "") for c in row) + " |"
        for row in table[1:]
    ]
    return "\n".join([header, separator] + rows)
```

**Option C — pdf-parse npm (simplest, but lowest quality — use only for well-structured PDFs):**
```typescript
import pdfParse from 'pdf-parse'
// Returns raw text — will hit failure modes 1, 3, 4 above
// Use ONLY if LlamaParse/pdfplumber are not available
// Acceptable for Phase 1 if testing with clean PDFs
// MUST be upgraded before ingesting real MSM syllabi
```

### Decision criteria for Phase 1
- Simple, single-column syllabus → Option C (pdf-parse, fast, no external dependency)
- Multi-column or table-heavy syllabus → Option A (LlamaParse, minimal setup)
- High volume or offline requirement → Option B (pdfplumber Python service)

**Recommendation: Start with Option A (LlamaParse). Add `LLAMAPARSE_API_KEY` to `.env.example`.**
If API costs become an issue or offline operation is needed, implement Option B.

---

## Updated ParsedDocument Type

```typescript
// packages/shared-types/src/pipeline.ts
interface ParsedDocument {
  markdown: string           // Full document as Markdown (primary format)
  pages: ParsedPage[]        // Page-by-page breakdown
  metadata: {
    title?: string
    author?: string
    pageCount: number
    extractionMethod: 'llamaparse' | 'pdfplumber' | 'pdf-parse'
    hasTableContent: boolean   // flag for chunker to use table-aware splitting
    hasNestedObjectives: boolean
  }
}

interface ParsedPage {
  pageNumber: number
  markdown: string      // Markdown for this page (includes table pipes, bold, etc.)
  hasTable: boolean
}
```

---

## Gotchas

- LlamaParse is async — always poll, never assume immediate response. 30 × 2s = 60s max wait.
- pdfplumber `layout=True` significantly slows extraction — benchmark before using on 50MB files.
- Markdown tables with merged cells (`colspan`) won't parse perfectly — flag them in `metadata`.
- FoM1 color-coding is **unrecoverable** from any text/Markdown extractor. Document this as a known limitation. Workaround: if a syllabus mentions "blue = required", instruct the Classifier node to treat all sessions as required unless context says otherwise.

## Provenance
Pattern established: P1-010 (informed by MSM syllabus analysis)
Applies to: P1-010 (PDF parser), P1-011 (chunker — must be Markdown-aware), P1-013 (concept extractor must get Markdown not raw text)
See also: SOL-007 (Classifier noise-filter node)
