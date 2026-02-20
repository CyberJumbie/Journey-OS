---
name: format-parser-factory-pattern
tags: [parser, factory, format-detection, error-collection, import]
story: STORY-F-3
date: 2026-02-20
---
# Format Parser Factory Pattern

**Problem:** Multiple file formats (CSV, XML, plain text) need to produce the same standardized output type. Format detection must be automatic, and parsing must be fault-tolerant — collecting non-fatal errors without stopping.

**Solution:** A parser interface + factory with auto-detection, plus a non-fatal error collection pattern for batch processing.

## When to Use
- Multiple input formats producing the same output shape
- User-uploaded files where format isn't guaranteed
- Batch processing where partial success is acceptable (import pipelines, data migration)

## When NOT to Use
- Single known format (just use the parser directly)
- Streaming ingestion where you can't buffer the full file
- Formats that require multi-file context (e.g., QTI test manifests referencing external item files)

## Pattern Components

### 1. Parser Interface

```typescript
// packages/types — format-agnostic
export interface IParser {
  readonly format: ImportFormat;
  parse(buffer: Uint8Array, filename: string, options: ParserOptions): Promise<ParseResult>;
  canParse(buffer: Uint8Array, filename: string): boolean;
}
```

Key: `canParse()` enables content sniffing (not just extension matching). Each parser decides if it can handle the content.

### 2. Factory with Auto-Detection

```typescript
export class ParserFactory {
  readonly #parsers: readonly IParser[];

  constructor() {
    this.#parsers = [new CsvParser(), new QtiParser(), new TextParser()];
  }

  detectFormat(buffer: Uint8Array, filename: string): ImportFormat {
    for (const parser of this.#parsers) {
      if (parser.canParse(buffer, filename)) return parser.format;
    }
    throw new UnsupportedFormatError(filename);
  }

  async parse(buffer: Uint8Array, filename: string, options?: Partial<ParserOptions>): Promise<ParseResult> {
    if (buffer.byteLength > maxSize) throw new FileSizeLimitError(buffer.byteLength, maxSize);
    const parser = this.getParser(filename, buffer);
    return parser.parse(buffer, filename, fullOptions);
  }
}
```

Detection order matters — put most specific formats first (e.g., QTI XML before generic XML).

### 3. Non-Fatal Error Collection

```typescript
export interface ParseErrorDetail {
  readonly index: number;      // 1-based item index
  readonly line: number;       // Line in source file
  readonly message: string;    // Human-readable
  readonly severity: 'warning' | 'error';  // warning = include item, error = skip item
  readonly field: string | null;           // Which field caused the issue
}

export interface ParseResult {
  readonly questions: readonly ParsedQuestion[];
  readonly errors: readonly ParseErrorDetail[];
  readonly totalFound: number;
  readonly successCount: number;
  readonly errorCount: number;
  // ...
}
```

Parsers accumulate errors per-item and continue. `severity: 'error'` skips the item; `severity: 'warning'` includes it with the warning. This lets users see partial results and fix specific rows.

### 4. Content Sniffing

```typescript
// QTI parser: check extension + content
canParse(buffer: Uint8Array, filename: string): boolean {
  if (!filename.toLowerCase().endsWith('.xml')) return false;
  const content = new TextDecoder().decode(buffer.slice(0, 1024));
  return content.includes('imsqti') || content.includes('assessmentItem');
}
```

Only read the first 1KB for sniffing — don't parse the full file just to detect format.

## Testing Pattern

Use inline fixture strings and a `toBuffer()` helper:

```typescript
function toBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

const VALID_CSV = `stem,optionA,optionB,correctAnswer\n"Question?","A","B","A"`;

it('should parse valid CSV', async () => {
  const result = await parser.parse(toBuffer(VALID_CSV), 'test.csv', options);
  expect(result.successCount).toBe(1);
  expect(result.errors).toHaveLength(0);
});
```

Test error collection explicitly:

```typescript
it('should collect non-fatal errors for malformed rows', async () => {
  const result = await parser.parse(toBuffer(MALFORMED_CSV), 'bad.csv', options);
  expect(result.questions.length).toBeGreaterThanOrEqual(1); // partial success
  expect(result.errors.length).toBeGreaterThanOrEqual(2);
  expect(result.errors[0]!.field).toBe('stem');
  expect(result.errors[0]!.severity).toBe('error');
});
```

## Source Reference
- [ARCHITECTURE_v10 Section 8.4] — Pipeline C steps: Parse -> Normalize -> ...
- [CODE_STANDARDS Section 3.1] — Depend on abstractions (IParser interface)
