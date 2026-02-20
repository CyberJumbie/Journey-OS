# STORY-F-27 Brief: Inngest Content Pipeline

## 0. Lane & Priority

```yaml
story_id: STORY-F-27
old_id: S-F-11-1
lane: faculty
lane_priority: 3
within_lane_order: 27
sprint: 4
size: L
depends_on:
  - STORY-F-24 (faculty) — Content records must exist as pipeline input
blocks:
  - STORY-F-28 (faculty) — Dual-Write Chunks (pipeline produces chunks)
  - STORY-F-29 (faculty) — Voyage AI Embedding Integration (pipeline calls embed service)
personas_served: [faculty]
epic: E-11 (Content Processing Pipeline)
feature: F-05 (Content Upload & Storage)
```

## 1. Summary

Build the **content processing pipeline** orchestrated by Inngest that takes uploaded content records and processes them through four stages: **parse** (extract text from PDF/PPTX/DOCX), **clean** (normalize whitespace, strip non-content), **chunk** (800-token chunks with 100-token overlap), and **embed** (generate 1024-dim vectors via Voyage AI). The pipeline is triggered when a content record's status changes to `pending` and uses Inngest's durable execution with built-in retry and step functions.

Key constraints:
- Parse: factory pattern to select parser by MIME type (pdf-parse, pptx-parser, mammoth)
- Clean: normalize whitespace, remove headers/footers, strip non-content elements
- Chunk: 800 tokens with 100-token overlap using tiktoken (cl100k_base encoding)
- Embed: 1024-dim embeddings via Voyage AI voyage-3-large (delegated to STORY-F-29)
- Status transitions: `pending` -> `processing` -> `completed` | `error`
- Retry: up to 3 times for transient failures, mark as `error` after exhaustion
- Pipeline stages are idempotent
- Each chunk stores: content_id, chunk_index, text, token_count, embedding vector
- Custom error classes: `ParseError`, `ChunkError`, `EmbedError`, `PipelineStageError`

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define pipeline types, stage types, chunk types | `packages/types/src/content/pipeline.types.ts` | 30m |
| 2 | Update barrel export | `packages/types/src/content/index.ts` | 5m |
| 3 | Create pipeline error classes | `apps/server/src/errors/pipeline.errors.ts` | 20m |
| 4 | Export new errors | `apps/server/src/errors/index.ts` | 5m |
| 5 | Implement `ParseService` (factory pattern) | `apps/server/src/services/parse.service.ts` | 90m |
| 6 | Implement `CleanService` | `apps/server/src/services/clean.service.ts` | 45m |
| 7 | Implement `ChunkService` (tiktoken) | `apps/server/src/services/chunk.service.ts` | 60m |
| 8 | Implement `EmbedService` interface | `apps/server/src/services/embed.service.ts` | 15m |
| 9 | Implement `ContentPipeline` orchestrator | `apps/server/src/pipelines/content.pipeline.ts` | 60m |
| 10 | Implement Inngest function | `apps/server/src/inngest/content.function.ts` | 45m |
| 11 | Write parse service tests (5 tests) | `apps/server/src/__tests__/parse.service.test.ts` | 45m |
| 12 | Write chunk service tests (4 tests) | `apps/server/src/__tests__/chunk.service.test.ts` | 30m |
| 13 | Write pipeline integration tests (6 tests) | `apps/server/src/__tests__/content.pipeline.test.ts` | 60m |

**Total estimate:** ~9 hours (Size L)

## 3. Data Model (inline, complete)

### `packages/types/src/content/pipeline.types.ts`

```typescript
/**
 * Pipeline stage names.
 */
export type PipelineStage = "parse" | "clean" | "chunk" | "embed";

/**
 * Pipeline stage result.
 */
export interface StageResult {
  readonly stage: PipelineStage;
  readonly success: boolean;
  readonly duration_ms: number;
  readonly error_message: string | null;
  readonly output_size: number;
}

/**
 * Pipeline execution log.
 */
export interface PipelineLog {
  readonly content_id: string;
  readonly stages: ReadonlyArray<StageResult>;
  readonly total_duration_ms: number;
  readonly final_status: "completed" | "error";
}

/**
 * Parsed text output from parse stage.
 */
export interface ParsedContent {
  readonly content_id: string;
  readonly raw_text: string;
  readonly page_count: number;
  readonly mime_type: string;
  readonly char_count: number;
}

/**
 * Cleaned text output from clean stage.
 */
export interface CleanedContent {
  readonly content_id: string;
  readonly cleaned_text: string;
  readonly char_count: number;
  readonly removed_elements: ReadonlyArray<string>;
}

/**
 * Chunk output from chunk stage.
 */
export interface ContentChunk {
  readonly content_id: string;
  readonly chunk_index: number;
  readonly text: string;
  readonly token_count: number;
  readonly start_char: number;
  readonly end_char: number;
}

/**
 * Embedded chunk (chunk + embedding vector).
 */
export interface EmbeddedChunk extends ContentChunk {
  readonly embedding: ReadonlyArray<number>;
}

/**
 * Parser interface for factory pattern.
 */
export interface IParser {
  parse(buffer: Buffer): Promise<ParsedContent>;
  readonly supportedMimeTypes: ReadonlyArray<string>;
}

/**
 * Embed service interface for provider abstraction.
 */
export interface IEmbedService {
  embedBatch(chunks: ReadonlyArray<ContentChunk>): Promise<ReadonlyArray<EmbeddedChunk>>;
  readonly modelName: string;
  readonly dimensions: number;
}

/**
 * Chunk configuration.
 */
export interface ChunkConfig {
  readonly maxTokens: number;
  readonly overlapTokens: number;
  readonly encoding: string;
}

/**
 * Default chunk configuration.
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxTokens: 800,
  overlapTokens: 100,
  encoding: "cl100k_base",
};

/**
 * Supported MIME types for parsing.
 */
export const PARSEABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type ParseableMimeType = (typeof PARSEABLE_MIME_TYPES)[number];
```

## 4. Database Schema (inline, complete)

No new tables in this story. The content pipeline updates the existing `contents` table status field (from STORY-F-24). Chunks are stored in STORY-F-28 (Dual-Write Chunks). The pipeline log is stored as structured JSON in application logs (not persisted to a table).

```sql
-- No new migration. Pipeline updates existing contents.status via ContentRepository.updateStatus():
-- UPDATE contents SET status = 'processing' WHERE id = $1;
-- UPDATE contents SET status = 'completed' WHERE id = $1;
-- UPDATE contents SET status = 'error', error_message = $2 WHERE id = $1;
```

## 5. API Contract (complete request/response)

No REST endpoints. The pipeline is triggered internally by Inngest when a content record's status is set to `pending`. The Inngest function signature:

```typescript
// Inngest event: "content.status.pending"
// Payload: { content_id: string }
// Triggered when ContentRepository.updateStatus(id, { status: "pending" }) is called
```

**Pipeline flow:**
1. Inngest receives `content.status.pending` event
2. Step 1: Fetch content record, download file from Supabase Storage
3. Step 2: Parse (extract text based on MIME type)
4. Step 3: Clean (normalize text)
5. Step 4: Chunk (split into 800-token chunks with 100-token overlap)
6. Step 5: Embed (generate 1024-dim vectors via Voyage AI)
7. Step 6: Write chunks to storage (delegated to STORY-F-28)
8. Step 7: Update content status to `completed`

On failure at any step: update content status to `error` with error message.

## 6. Frontend Spec

Not applicable for this story. The content pipeline runs entirely server-side. Pipeline progress is visible through the content record's `status` field, which can be polled or observed via real-time updates in future stories.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/pipeline.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Edit (add pipeline exports) |
| 3 | `apps/server/src/errors/pipeline.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 5 | `apps/server/src/services/parse.service.ts` | Service | Create |
| 6 | `apps/server/src/services/clean.service.ts` | Service | Create |
| 7 | `apps/server/src/services/chunk.service.ts` | Service | Create |
| 8 | `apps/server/src/services/embed.service.ts` | Service | Create (interface + stub) |
| 9 | `apps/server/src/pipelines/content.pipeline.ts` | Pipeline | Create |
| 10 | `apps/server/src/inngest/content.function.ts` | Inngest | Create |
| 11 | `apps/server/src/__tests__/parse.service.test.ts` | Tests | Create |
| 12 | `apps/server/src/__tests__/chunk.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/__tests__/content.pipeline.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-24 | faculty | Required | Content records (pipeline input) |
| STORY-F-18 | faculty | Required | StorageService for downloading uploaded files |
| STORY-U-3 | universal | **DONE** | Auth context |

### NPM Packages (new)
| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `pdf-parse` | ^1.1.x | PDF text extraction | ~2MB |
| `@types/pdf-parse` | ^1.1.x | TypeScript types | dev only |
| `mammoth` | ^1.8.x | DOCX text extraction | ~500KB |
| `tiktoken` | ^1.0.x | Token counting (cl100k_base) | ~4MB |

### NPM Packages (already installed)
- `inngest` -- Durable function execution
- `@supabase/supabase-js` -- Supabase client (for file download + status update)
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/repositories/content.repository.ts` -- ContentRepository (STORY-F-24)
- `apps/server/src/services/storage/storage.service.ts` -- StorageService for file download (STORY-F-18)
- `apps/server/src/inngest/client.ts` -- Inngest client instance
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class

## 9. Test Fixtures (inline)

```typescript
import type {
  ParsedContent,
  CleanedContent,
  ContentChunk,
  EmbeddedChunk,
  PipelineLog,
} from "@journey-os/types";
import type { Content } from "@journey-os/types";

/** Mock content record (pending status) */
export const MOCK_PENDING_CONTENT: Content = {
  id: "content-uuid-001",
  course_id: "course-uuid-001",
  session_id: null,
  upload_id: "upload-uuid-001",
  filename: "lecture-notes.pdf",
  mime_type: "application/pdf",
  file_size: 1024000,
  storage_path: "inst-uuid-001/course-uuid-001/upload-uuid-001/lecture-notes.pdf",
  checksum: "abc123def456",
  status: "pending",
  uploaded_by: "user-uuid-001",
  error_message: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

/** Mock PDF buffer (minimal valid) */
export const MOCK_PDF_BUFFER = Buffer.from("%PDF-1.4\nSample text content for testing.");

/** Mock DOCX buffer (minimal) */
export const MOCK_DOCX_BUFFER = Buffer.alloc(100); // mammoth handles actual DOCX structure

/** Mock parsed content */
export const MOCK_PARSED: ParsedContent = {
  content_id: "content-uuid-001",
  raw_text: "This is the extracted text from the lecture notes.\n\nIt covers cardiac anatomy and physiology.",
  page_count: 5,
  mime_type: "application/pdf",
  char_count: 92,
};

/** Mock cleaned content */
export const MOCK_CLEANED: CleanedContent = {
  content_id: "content-uuid-001",
  cleaned_text: "This is the extracted text from the lecture notes. It covers cardiac anatomy and physiology.",
  char_count: 89,
  removed_elements: ["header", "footer", "page_numbers"],
};

/** Mock chunks (2 chunks from small content) */
export const MOCK_CHUNKS: ContentChunk[] = [
  {
    content_id: "content-uuid-001",
    chunk_index: 0,
    text: "This is the extracted text from the lecture notes.",
    token_count: 10,
    start_char: 0,
    end_char: 50,
  },
  {
    content_id: "content-uuid-001",
    chunk_index: 1,
    text: "It covers cardiac anatomy and physiology.",
    token_count: 8,
    start_char: 40,
    end_char: 89,
  },
];

/** Mock embedded chunks */
export const MOCK_EMBEDDED_CHUNKS: EmbeddedChunk[] = MOCK_CHUNKS.map((chunk) => ({
  ...chunk,
  embedding: new Array(1024).fill(0.01),
}));

/** Mock unsupported MIME type */
export const MOCK_UNSUPPORTED_CONTENT: Content = {
  ...MOCK_PENDING_CONTENT,
  mime_type: "image/png",
  filename: "diagram.png",
};

/** Mock pipeline log */
export const MOCK_PIPELINE_LOG: PipelineLog = {
  content_id: "content-uuid-001",
  stages: [
    { stage: "parse", success: true, duration_ms: 500, error_message: null, output_size: 92 },
    { stage: "clean", success: true, duration_ms: 50, error_message: null, output_size: 89 },
    { stage: "chunk", success: true, duration_ms: 100, error_message: null, output_size: 2 },
    { stage: "embed", success: true, duration_ms: 2000, error_message: null, output_size: 2 },
  ],
  total_duration_ms: 2650,
  final_status: "completed",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/parse.service.test.ts` (5 tests)

```
describe("ParseService")
  it parses PDF buffer and returns extracted text
  it parses DOCX buffer and returns extracted text
  it throws ParseError for unsupported MIME type
  it throws ParseError for corrupted file buffer
  it selects correct parser via factory pattern based on MIME type
```

### `apps/server/src/__tests__/chunk.service.test.ts` (4 tests)

```
describe("ChunkService")
  it splits text into 800-token chunks with 100-token overlap
  it returns single chunk for text shorter than 800 tokens
  it preserves chunk ordering via chunk_index
  it counts tokens correctly using tiktoken cl100k_base
```

### `apps/server/src/__tests__/content.pipeline.test.ts` (6 tests)

```
describe("ContentPipeline")
  it processes content through all 4 stages (parse -> clean -> chunk -> embed)
  it updates content status to "processing" at start
  it updates content status to "completed" on success
  it updates content status to "error" with message on parse failure
  it retries transient failures up to 3 times
  it produces correct pipeline log with stage durations
```

**Total: 15 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The pipeline is a server-side background process with no user-facing UI. E2E coverage will be added with the full upload-to-search journey.

## 12. Acceptance Criteria

1. Inngest function triggered when content record status changes to `pending`
2. Parse step extracts text from PDF (pdf-parse), DOCX (mammoth) based on MIME type
3. Clean step normalizes whitespace, removes headers/footers, strips non-content
4. Chunk step creates 800-token chunks with 100-token overlap using tiktoken (cl100k_base)
5. Embed step generates 1024-dim embeddings via Voyage AI (delegated to IEmbedService)
6. Pipeline updates content status: `pending` -> `processing` -> `completed` | `error`
7. Error handling: retry up to 3 times for transient failures, mark `error` after exhaustion
8. Each step logs to structured pipeline log for debugging
9. Parse service uses factory pattern to select parser by MIME type
10. Pipeline stages are idempotent (re-running produces same result)
11. Custom error classes: `ParseError`, `ChunkError`, `EmbedError`, `PipelineStageError`
12. All 15 API tests pass
13. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Inngest for durable pipeline | S-F-11-1: "Inngest provides durable execution with built-in retry and step functions" |
| Parse by MIME type | S-F-11-1: "pdf-parse, pptx-parser, mammoth" |
| 800-token chunks, 100 overlap | S-F-11-1: "800-token chunks with 100-token overlap using tiktoken" |
| tiktoken cl100k_base | S-F-11-1: "measured by tiktoken (cl100k_base encoding)" |
| 1024-dim embeddings | ARCHITECTURE_v10: "All embeddings are 1024-dim (Voyage AI voyage-3-large)" |
| Status transitions | S-F-11-1: "pending -> processing -> completed | error" |
| Retry 3 times | S-F-11-1: "retry up to 3 times for transient failures" |
| Factory pattern for parsers | S-F-11-1: "Parse service uses factory pattern to select parser by MIME type" |
| Idempotent stages | S-F-11-1: "Pipeline stages are idempotent" |
| Custom error classes | S-F-11-1: "ParseError, ChunkError, EmbedError, PipelineStageError" |

## 14. Environment Prerequisites

- **Inngest:** Dev server running (`npx inngest-cli@latest dev`)
- **Supabase:** Project running, `contents` table exists (STORY-F-24), `uploads` table exists (STORY-F-18)
- **Supabase Storage:** `content-originals` bucket accessible for file download
- **Express:** Server running on port 3001 with Inngest route registered
- **No Neo4j needed** for this story (chunks are dual-written in STORY-F-28)
- **New npm packages:** `pdf-parse`, `mammoth`, `tiktoken`
- **VOYAGE_API_KEY:** Environment variable set (used by embed service in STORY-F-29)

## 15. Implementation Notes

- **ParseService factory pattern:**

```typescript
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export class ParseService {
  readonly #parsers: Map<string, IParser>;

  constructor() {
    this.#parsers = new Map();
    this.#parsers.set("application/pdf", new PdfParser());
    this.#parsers.set(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      new DocxParser(),
    );
  }

  async parse(buffer: Buffer, mimeType: string, contentId: string): Promise<ParsedContent> {
    const parser = this.#parsers.get(mimeType);
    if (!parser) {
      throw new ParseError(`Unsupported MIME type: ${mimeType}`);
    }
    return parser.parse(buffer);
  }
}
```

- **ChunkService with tiktoken:**

```typescript
import { encoding_for_model } from "tiktoken";
import type { ContentChunk, ChunkConfig } from "@journey-os/types";
import { DEFAULT_CHUNK_CONFIG } from "@journey-os/types";

export class ChunkService {
  readonly #config: ChunkConfig;

  constructor(config?: Partial<ChunkConfig>) {
    this.#config = { ...DEFAULT_CHUNK_CONFIG, ...config };
  }

  chunk(text: string, contentId: string): ContentChunk[] {
    const enc = encoding_for_model("gpt-4"); // uses cl100k_base
    const tokens = enc.encode(text);
    const chunks: ContentChunk[] = [];
    let startToken = 0;
    let chunkIndex = 0;

    while (startToken < tokens.length) {
      const endToken = Math.min(startToken + this.#config.maxTokens, tokens.length);
      const chunkTokens = tokens.slice(startToken, endToken);
      const chunkText = new TextDecoder().decode(enc.decode(chunkTokens));

      chunks.push({
        content_id: contentId,
        chunk_index: chunkIndex,
        text: chunkText,
        token_count: chunkTokens.length,
        start_char: /* computed from decoded text positions */,
        end_char: /* computed from decoded text positions */,
      });

      startToken += this.#config.maxTokens - this.#config.overlapTokens;
      chunkIndex++;
    }

    enc.free();
    return chunks;
  }
}
```

- **CleanService:**

```typescript
export class CleanService {
  clean(rawText: string, contentId: string): CleanedContent {
    const removed: string[] = [];
    let text = rawText;

    // Remove common headers/footers
    text = this.#removeHeadersFooters(text, removed);
    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();
    // Remove page numbers
    text = text.replace(/\n\d+\n/g, "\n");

    return {
      content_id: contentId,
      cleaned_text: text,
      char_count: text.length,
      removed_elements: removed,
    };
  }
}
```

- **Inngest function:**

```typescript
export const contentPipeline = inngest.createFunction(
  { id: "content-pipeline", retries: 3 },
  { event: "content.status.pending" },
  async ({ event, step }) => {
    const contentId = event.data.content_id;

    // Step 1: Fetch content and update status to processing
    const content = await step.run("fetch-content", async () => {
      await contentRepository.updateStatus(contentId, { status: "processing" });
      return contentRepository.findById(contentId);
    });

    // Step 2: Download file
    const buffer = await step.run("download-file", async () => {
      return storageService.download(content.storage_path);
    });

    // Step 3: Parse
    const parsed = await step.run("parse", async () => {
      return parseService.parse(buffer, content.mime_type, contentId);
    });

    // Step 4: Clean
    const cleaned = await step.run("clean", async () => {
      return cleanService.clean(parsed.raw_text, contentId);
    });

    // Step 5: Chunk
    const chunks = await step.run("chunk", async () => {
      return chunkService.chunk(cleaned.cleaned_text, contentId);
    });

    // Step 6: Embed
    const embedded = await step.run("embed", async () => {
      return embedService.embedBatch(chunks);
    });

    // Step 7: Mark complete
    await step.run("complete", async () => {
      await contentRepository.updateStatus(contentId, { status: "completed" });
    });

    return { content_id: contentId, chunks: embedded.length };
  },
);
```

- **Error class hierarchy:**

```
JourneyOSError
  ├── PipelineStageError (code: "PIPELINE_STAGE_ERROR") — base for stage errors
  ├── ParseError (code: "PARSE_ERROR") — extends PipelineStageError
  ├── ChunkError (code: "CHUNK_ERROR") — extends PipelineStageError
  └── EmbedError (code: "EMBED_ERROR") — extends PipelineStageError
```

- **OOP:** All services use JS `#private` fields, constructor DI.
- **vi.hoisted()** needed for Inngest, storage, and repository mocks in tests.
