# Plan: STORY-F-3 — Import Parser

## Summary
Three file parsers (CSV, QTI 2.1 XML, plain text) + a parser factory with format auto-detection. In-memory processing only — no DB, no API endpoints, no Neo4j. Produces standardized `ParsedQuestion[]` consumed by STORY-F-57 (Import Pipeline).

## Tasks (implementation order)

| # | Task | File | Notes |
|---|------|------|-------|
| 0 | Install dependencies | `apps/server/package.json` | `papaparse`, `fast-xml-parser`, `@types/papaparse` |
| 1 | Define `ParsedQuestion` + option types | `packages/types/src/import/parsed-question.types.ts` | Create |
| 2 | Define `IParser`, `ParserOptions`, `ParseResult`, `ParseErrorDetail`, `ImportFormat`, `CsvColumnMapping` | `packages/types/src/import/parser.types.ts` | Create |
| 3 | Barrel export | `packages/types/src/import/index.ts` | Create |
| 4 | Add import export to root barrel | `packages/types/src/index.ts` | Edit |
| 5 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Required before server can see new types |
| 6 | Custom error classes: `ParseError`, `UnsupportedFormatError`, `FileSizeLimitError` | `apps/server/src/errors/import.errors.ts` | Extend `JourneyOSError` |
| 7 | Add import errors to barrel | `apps/server/src/errors/index.ts` | Edit — single Edit call, re-read after |
| 8 | `CsvParser` — papaparse, configurable column mapping, header detection | `apps/server/src/services/import/parsers/csv-parser.ts` | Create |
| 9 | `QtiParser` — fast-xml-parser for QTI 2.1, correctResponse extraction | `apps/server/src/services/import/parsers/qti-parser.ts` | Create |
| 10 | `TextParser` — regex-based, asterisk + [CORRECT] markers | `apps/server/src/services/import/parsers/text-parser.ts` | Create |
| 11 | `ParserFactory` — format auto-detection (extension + content sniffing) | `apps/server/src/services/import/parser-factory.service.ts` | Create |
| 12 | CSV parser tests | `apps/server/src/services/import/parsers/__tests__/csv-parser.test.ts` | 4 tests |
| 13 | QTI parser tests | `apps/server/src/services/import/parsers/__tests__/qti-parser.test.ts` | 3 tests |
| 14 | Text parser tests | `apps/server/src/services/import/parsers/__tests__/text-parser.test.ts` | 3 tests |
| 15 | Parser factory tests | `apps/server/src/services/import/__tests__/parser-factory.test.ts` | 4 tests |

## Implementation Order
Types (1-5) -> Errors (6-7) -> Services (8-11) -> Tests (12-15)

## Deviations from Brief

1. **Test file locations:** Brief puts tests in `apps/server/src/tests/import/`. Project convention uses `__tests__/` dirs colocated with source. Using `apps/server/src/services/import/parsers/__tests__/` for parser tests and `apps/server/src/services/import/__tests__/` for factory tests.

2. **No `apps/server/src/index.ts` changes:** No routes to register — parsers are internal services.

## Patterns to Follow
- OOP: `#private` fields, public getters, constructor DI
- `JourneyOSError` base class at `apps/server/src/errors/base.errors.ts`
- Named exports only, no default exports
- TypeScript strict, no `any`
- After editing barrel files, immediately re-read to verify exports intact (CLAUDE.md critical rule)
- After modifying `packages/types`, rebuild with `tsc -b packages/types/tsconfig.json`

## Testing Strategy
- **API tests (14 total):**
  - CSV: valid parse (3 questions), malformed rows (error collection), empty file, custom column mapping
  - QTI: valid single assessmentItem, invalid XML error handling, metadata extraction
  - Text: asterisk format, [CORRECT] format, edge cases (no correct answer, empty stem)
  - Factory: CSV auto-detect, QTI content sniffing, text auto-detect, file size limit
- **E2E:** Not applicable (no UI, no endpoints)

## NPM Dependencies (new)
| Package | Purpose |
|---------|---------|
| `papaparse` | CSV parsing with header detection |
| `@types/papaparse` | TS types (dev) |
| `fast-xml-parser` | QTI 2.1 XML parsing |

## Risks / Edge Cases
- **QTI format variation:** QTI 2.1 has many optional elements. Parser should handle minimal items (just itemBody + responseDeclaration) without failing on missing optional elements.
- **Text format ambiguity:** Two correct-answer marker styles (asterisk prefix `*C)` and suffix `[CORRECT]`). Parser needs to try both patterns.
- **papaparse typing:** `@types/papaparse` may need careful handling of the `Papa.parse` return type. Use explicit generic: `Papa.parse<Record<string, string>>()`.
- **Buffer encoding:** QTI XML may use various encodings. `fast-xml-parser` handles UTF-8 by default; document limitation for non-UTF-8 files.
- **Barrel file stripping:** PostToolUse hook may strip exports from barrel files. Must re-read after editing.

## Acceptance Criteria (from brief)
- AC-1: CSV parser handles standard CSV with configurable column mapping and produces correct `ParsedQuestion[]`
- AC-2: QTI parser supports QTI 2.1 XML format, extracts stem, options, and correct answer from `responseDeclaration`
- AC-3: Plain text parser uses regex to extract stem, lettered choices, and asterisk/[CORRECT]-marked answers
- AC-4: Parser factory auto-detects format from file extension (.csv, .xml, .txt) and content sniffing (QTI namespace in XML)
- AC-5: All parsers return standardized `ParsedQuestion[]` with normalized fields regardless of input format
- AC-6: Parser-level validation catches malformed input: missing stem, no correct answer, empty options
- AC-7: Non-fatal parse errors are collected per row/item with line number, severity, field name, and message
- AC-8: File size limit is configurable with default 10MB; exceeding it throws `FileSizeLimitError`
- AC-9: Custom error classes extend `JourneyOSError` with error codes
- AC-10: 14 vitest tests pass
- AC-11: TypeScript strict mode, zero `any`, named exports only
- AC-12: All parser classes implement `IParser` interface with OOP encapsulation
