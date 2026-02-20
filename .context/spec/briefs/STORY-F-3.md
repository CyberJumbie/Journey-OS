# STORY-F-3: Import Parser

**Epic:** E-24 (Legacy Import Pipeline)
**Feature:** F-11
**Sprint:** 17
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-24-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need parsers for CSV, QTI, and plain text formats so that I can import legacy question banks from existing systems into Journey OS.

## Acceptance Criteria
- [ ] CSV parser: handles standard CSV with configurable column mapping via `papaparse`
- [ ] QTI parser: supports QTI 2.1 XML format (common in LMS exports) via `fast-xml-parser`
- [ ] Plain text parser: regex-based extraction from formatted text (stem, choices, answer key)
- [ ] Parser factory: auto-detect format from file extension and content sniffing
- [ ] Each parser returns standardized `ParsedQuestion[]` with normalized fields
- [ ] Validation: parser-level validation for malformed input (missing stem, no correct answer, etc.)
- [ ] Error collection: non-fatal parse errors collected per row/item with line number
- [ ] File size limit: configurable max (default 10MB)
- [ ] Custom error classes: `ParseError`, `UnsupportedFormatError`, `FileSizeLimitError`
- [ ] 10-14 API tests: each format, auto-detection, malformed input, partial parse, size limit
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Field Mapping UI is built in STORY-F-15.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/import/parser.types.ts`, `src/import/parsed-question.types.ts` |
| Service | apps/server | `src/services/import/parser-factory.service.ts`, `src/services/import/parsers/csv-parser.ts`, `src/services/import/parsers/qti-parser.ts`, `src/services/import/parsers/text-parser.ts` |
| Errors | apps/server | `src/errors/import.errors.ts` |
| Tests | apps/server | `src/services/import/__tests__/csv-parser.test.ts`, `src/services/import/__tests__/qti-parser.test.ts`, `src/services/import/__tests__/text-parser.test.ts`, `src/services/import/__tests__/parser-factory.test.ts` |

## Database Schema
No database schema changes. Parsers are stateless services that transform file buffers into `ParsedQuestion[]`.

## API Endpoints
No new endpoints. Parsers are consumed internally by the import pipeline (STORY-F-15 upload controller).

## Dependencies
- **Blocks:** STORY-F-15 (Field Mapping UI)
- **Blocked by:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (10-14)
1. CSV parser: parse valid CSV with headers returns ParsedQuestion[]
2. CSV parser: missing required column returns ParseError with line number
3. CSV parser: partial parse collects errors and returns valid rows
4. QTI parser: parse valid QTI 2.1 XML returns ParsedQuestion[]
5. QTI parser: malformed XML returns ParseError
6. QTI parser: missing correct answer flagged per item
7. Text parser: parse numbered question format (1. Stem\nA) Choice...)
8. Text parser: parse asterisk-marked correct answer (*C) Correct)
9. Parser factory: auto-detect CSV from .csv extension
10. Parser factory: auto-detect QTI from .xml extension with QTI namespace
11. Parser factory: auto-detect text from .txt extension
12. Parser factory: unsupported format returns UnsupportedFormatError
13. File size limit: buffer exceeding 10MB returns FileSizeLimitError
14. All parsers return consistent ParsedQuestion shape

## Implementation Notes
- See `docs/solutions/format-parser-factory-pattern.md` for the factory pattern.
- QTI 2.1 is XML-based; use `fast-xml-parser` for efficient parsing.
- CSV parsing: use `papaparse` with header detection and type inference.
- Plain text parser: support common formats like "1. Stem\nA) Choice\nB) Choice\n*C) Correct\nD) Choice".
- Parser output is format-agnostic `ParsedQuestion` -- downstream pipeline does not care about source format.
- Consider streaming parser for large files to avoid memory spikes.
- File upload handled by Supabase Storage (E-10) -- parsers receive file buffer/stream.
- Use `pnpm --filter server add papaparse fast-xml-parser` to install parser dependencies.
