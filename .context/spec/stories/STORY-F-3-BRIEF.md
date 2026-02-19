# STORY-F-3 Brief: Import Parser

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-3
old_story_id: S-F-24-1
epic: E-24 (Legacy Import Pipeline)
feature: F-11 (Item Bank & Repository)
sprint: 17
lane: faculty
lane_priority: 3
within_lane_order: 3
size: M
depends_on: []
blocks:
  - STORY-F-15 (faculty) — Field Mapping UI
  - STORY-F-57 (faculty) — Import Pipeline
personas_served: [faculty, faculty_course_director]
```

---

## Section 1: Summary

**What to build:** Three file parsers (CSV, QTI 2.1 XML, plain text) and a parser factory that auto-detects file format. These parsers transform legacy question bank exports from external LMS systems into a standardized `ParsedQuestion[]` format that the downstream import pipeline (STORY-F-57) consumes. This is an in-memory processing layer with no database writes and no API endpoints.

**Parent context:**
- **Feature F-11** (Item Bank & Repository): "Legacy questions can be imported via Pipeline C, tagged, and integrated into the knowledge graph." [F-11 spec]
- **Epic E-24** (Legacy Import Pipeline): Encompasses the full import flow -- parse, map fields, run pipeline, generate report.
- **Architecture v10 Section 8.4** defines Pipeline C (Legacy Import) as a 10-step process: "Parse -> Normalize -> Hybrid Index -> Disambiguate -> Concept Map -> Competency Tag -> Dedup -> Validate -> Dual-Write -> Review Queue." This story implements Step 1 (Parse) and partially Step 2 (Normalize) by producing a standardized ParsedQuestion output.

**User story:** As a Faculty member, I need parsers for CSV, QTI, and plain text formats so that I can import legacy question banks from existing systems into Journey OS.

**User flows affected:** None directly -- parsers are internal services. They are consumed by the import pipeline UI (STORY-F-15 Field Mapping UI) and STORY-F-57 (Import Pipeline).

**Personas:** Faculty and Faculty Course Directors who import legacy content from systems like ExamSoft, Blackboard, Canvas, or custom spreadsheets.

---

## Section 2: Task Breakdown

Implementation order follows the project rule: Types -> Service -> Errors -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `ParsedQuestion` interface and related types | `packages/types/src/import/parsed-question.types.ts` | 30m |
| 2 | Define parser interfaces (`IParser`, `ParserOptions`, `ParseResult`, `ParseErrorDetail`) | `packages/types/src/import/parser.types.ts` | 30m |
| 3 | Create barrel export for import types | `packages/types/src/import/index.ts` | 5m |
| 4 | Implement custom error classes (`ParseError`, `UnsupportedFormatError`, `FileSizeLimitError`) extending `JourneyOSError` | `apps/server/src/errors/import.errors.ts` | 20m |
| 5 | Implement `CsvParser` class with papaparse, configurable column mapping, header detection | `apps/server/src/services/import/parsers/csv-parser.ts` | 90m |
| 6 | Implement `QtiParser` class with fast-xml-parser for QTI 2.1 XML | `apps/server/src/services/import/parsers/qti-parser.ts` | 90m |
| 7 | Implement `TextParser` class with regex-based extraction | `apps/server/src/services/import/parsers/text-parser.ts` | 60m |
| 8 | Implement `ParserFactory` class with format auto-detection (extension + content sniffing) | `apps/server/src/services/import/parser-factory.service.ts` | 45m |
| 9 | Write CSV parser tests (4 tests) | `apps/server/src/tests/import/csv-parser.test.ts` | 45m |
| 10 | Write QTI parser tests (3 tests) | `apps/server/src/tests/import/qti-parser.test.ts` | 45m |
| 11 | Write text parser tests (3 tests) | `apps/server/src/tests/import/text-parser.test.ts` | 30m |
| 12 | Write parser factory tests (4 tests) | `apps/server/src/tests/import/parser-factory.test.ts` | 30m |

**Total estimate:** ~8 hours (Size M)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/import/parsed-question.types.ts`

```typescript
/**
 * Format-agnostic parsed question output.
 * All three parsers (CSV, QTI, text) produce this same shape.
 * Downstream pipeline (STORY-F-57) consumes only this type.
 *
 * Fields map to assessment_items table columns:
 *   stem -> assessment_items.stem
 *   vignette -> assessment_items.vignette
 *   options -> options table rows
 *   bloom_level -> assessment_items.bloom_level
 *   difficulty -> assessment_items.difficulty
 * [SUPABASE_DDL_v1 Section Assessment Tables]
 */
export interface ParsedQuestionOption {
  /** Answer choice letter (A-E) */
  readonly letter: string;
  /** Answer choice text */
  readonly text: string;
  /** Whether this is the correct answer */
  readonly correct: boolean;
}

export interface ParsedQuestion {
  /** 1-based index of this question in the source file */
  readonly sourceIndex: number;
  /** Line number or XML path in original file (for error reporting) */
  readonly sourceLocation: string;
  /** Clinical vignette / lead-in text (may be empty for simple formats) */
  readonly vignette: string;
  /** Question stem */
  readonly stem: string;
  /** Answer options (typically 4-5) */
  readonly options: readonly ParsedQuestionOption[];
  /** Correct answer letter (e.g., "C") — derived from options for quick access */
  readonly correctAnswer: string;
  /** Bloom level if available in source (1-6), null if not specified */
  readonly bloomLevel: number | null;
  /** Difficulty rating if available in source, null if not specified */
  readonly difficulty: number | null;
  /** Topic/category/tag from source system, null if not specified */
  readonly topic: string | null;
  /** Explanation or rationale from source, null if not provided */
  readonly explanation: string | null;
  /** Raw metadata from the source format (column values, XML attributes, etc.) */
  readonly rawMetadata: Record<string, unknown>;
}
```

### `packages/types/src/import/parser.types.ts`

```typescript
import { ParsedQuestion } from './parsed-question.types';

/**
 * Supported import file formats.
 * Extensible for future formats (GIFT, Aiken, Moodle XML, etc.)
 */
export type ImportFormat = 'csv' | 'qti' | 'text';

/**
 * Non-fatal error detail collected during parsing.
 * Parsing continues; errors are reported in ParseResult.
 */
export interface ParseErrorDetail {
  /** 1-based row/item index in the source file */
  readonly index: number;
  /** Line number in original file (for user-facing error messages) */
  readonly line: number;
  /** Human-readable error message */
  readonly message: string;
  /** Error severity: 'warning' continues parsing, 'error' skips the item */
  readonly severity: 'warning' | 'error';
  /** Which field caused the issue */
  readonly field: string | null;
}

/**
 * Parser configuration options.
 * Passed to all parsers via constructor DI or per-parse call.
 */
export interface ParserOptions {
  /** Maximum file size in bytes. Default: 10 * 1024 * 1024 (10MB) */
  readonly maxFileSizeBytes: number;
  /** For CSV: column name -> ParsedQuestion field mapping */
  readonly columnMapping?: Readonly<CsvColumnMapping>;
  /** Whether to skip rows/items that have any error (default: false — include partial) */
  readonly strictMode?: boolean;
}

/**
 * CSV column mapping configuration.
 * Maps CSV header names to ParsedQuestion fields.
 * All fields are optional — unmapped columns go to rawMetadata.
 */
export interface CsvColumnMapping {
  readonly stem?: string;
  readonly vignette?: string;
  readonly optionA?: string;
  readonly optionB?: string;
  readonly optionC?: string;
  readonly optionD?: string;
  readonly optionE?: string;
  readonly correctAnswer?: string;
  readonly bloomLevel?: string;
  readonly difficulty?: string;
  readonly topic?: string;
  readonly explanation?: string;
}

/**
 * Result of a parse operation.
 * Contains both successfully parsed questions and collected errors.
 */
export interface ParseResult {
  /** Successfully parsed questions */
  readonly questions: readonly ParsedQuestion[];
  /** Non-fatal errors encountered during parsing */
  readonly errors: readonly ParseErrorDetail[];
  /** Total items found in source (including errored items) */
  readonly totalFound: number;
  /** Count of successfully parsed items */
  readonly successCount: number;
  /** Count of items skipped due to errors */
  readonly errorCount: number;
  /** Detected or specified format */
  readonly format: ImportFormat;
  /** Original filename */
  readonly filename: string;
  /** Parse duration in milliseconds */
  readonly durationMs: number;
}

/**
 * Parser interface — all format-specific parsers implement this.
 * OOP pattern: interface for DI, concrete classes per format.
 * [CODE_STANDARDS Section 3.1 — Depend on abstractions]
 */
export interface IParser {
  /** The format this parser handles */
  readonly format: ImportFormat;
  /** Parse a file buffer into standardized questions */
  parse(buffer: Buffer, filename: string, options: ParserOptions): Promise<ParseResult>;
  /** Check if this parser can handle the given content (content sniffing) */
  canParse(buffer: Buffer, filename: string): boolean;
}
```

### `packages/types/src/import/index.ts`

```typescript
export type {
  ParsedQuestion,
  ParsedQuestionOption,
} from './parsed-question.types';

export type {
  ImportFormat,
  ParseErrorDetail,
  ParserOptions,
  CsvColumnMapping,
  ParseResult,
  IParser,
} from './parser.types';
```

---

## Section 4: Database Schema

**Not applicable.** This story implements in-memory file parsing only. No database reads or writes occur. The downstream Import Pipeline (STORY-F-57) handles dual-write of parsed questions to `assessment_items` (Supabase) and `(:AssessmentItem)` (Neo4j).

For reference, the target table that the pipeline will eventually write to is `assessment_items`:

```sql
-- From SUPABASE_DDL_v1 Section Assessment Tables
CREATE TABLE IF NOT EXISTS assessment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    vignette TEXT,
    stem TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    bloom_level INTEGER CHECK (bloom_level BETWEEN 1 AND 6),
    difficulty FLOAT,
    quality_score FLOAT,
    toulmin JSONB DEFAULT '{}',
    generation_session_id UUID,
    generation_reasoning TEXT,
    critic_scores JSONB,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The `ParsedQuestion` interface fields map to this table: `stem` -> `stem`, `vignette` -> `vignette`, `bloomLevel` -> `bloom_level`, `difficulty` -> `difficulty`. Options map to the `options` table rows (`letter`, `text`, `correct`). This mapping is handled by STORY-F-57, not this story.

---

## Section 5: API Contract

**Not applicable.** No REST endpoints are created in this story. Parsers are internal services consumed programmatically by the import pipeline service (STORY-F-57). The API contract for legacy import is defined in F-11 feature spec as `POST /api/v1/items/import` [F-11 spec, Data Domains section], but that endpoint is implemented in STORY-F-57.

---

## Section 6: Frontend Spec

**Not applicable.** No UI components in this story. The Field Mapping UI (STORY-F-15) will provide the frontend for configuring CSV column mappings and previewing parse results.

---

## Section 7: Files to Create (exact paths, implementation order)

```
# 1. Types (packages/types)
packages/types/src/import/parsed-question.types.ts
packages/types/src/import/parser.types.ts
packages/types/src/import/index.ts

# 2. Error classes (apps/server)
apps/server/src/errors/import.errors.ts

# 3. Parser services (apps/server)
apps/server/src/services/import/parsers/csv-parser.ts
apps/server/src/services/import/parsers/qti-parser.ts
apps/server/src/services/import/parsers/text-parser.ts
apps/server/src/services/import/parser-factory.service.ts

# 4. Tests (apps/server)
apps/server/src/tests/import/csv-parser.test.ts
apps/server/src/tests/import/qti-parser.test.ts
apps/server/src/tests/import/text-parser.test.ts
apps/server/src/tests/import/parser-factory.test.ts
```

**Total files:** 12 (3 types + 1 errors + 4 services + 4 tests)

---

## Section 8: Dependencies

### NPM Packages (new)

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `papaparse` | ^5.4.x | CSV parsing with header detection, streaming support, type inference | ~50KB |
| `fast-xml-parser` | ^4.3.x | QTI 2.1 XML parsing — fast, zero-dependency XML parser | ~80KB |
| `@types/papaparse` | ^5.3.x | TypeScript types for papaparse | dev only |

### NPM Packages (existing, already in monorepo)

None required. This story has zero dependency on existing application code.

### Internal Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `packages/types` package | Must exist | Barrel export from `packages/types/src/index.ts` must re-export `./import` |
| `apps/server/src/errors/index.ts` | Must exist | Base `JourneyOSError` class must be defined. If not yet created by prior stories, create inline in `import.errors.ts` |

### What This Story Does NOT Depend On

- No Supabase client (no DB writes)
- No Neo4j driver (no graph writes)
- No auth/RBAC middleware (no endpoints)
- No other story (zero blockers)

---

## Section 9: Test Fixtures (inline)

### Fixture 1: Valid CSV (`valid-questions.csv`)

```csv
stem,optionA,optionB,optionC,optionD,correctAnswer,topic,explanation
"A 45-year-old patient presents with chest pain radiating to the left arm. Which of the following is the most likely diagnosis?","Acute myocardial infarction","Pulmonary embolism","Pneumothorax","Costochondritis","A","Cardiovascular","MI typically presents with chest pain radiating to the left arm, jaw, or shoulder."
"Which enzyme is most specific for myocardial damage?","AST","ALT","Troponin I","LDH","C","Cardiovascular","Troponin I is the gold standard biomarker for myocardial injury."
"A patient with type 2 diabetes presents with polyuria and polydipsia. Their fasting glucose is 280 mg/dL. Which medication should be initiated first?","Metformin","Insulin glargine","Glipizide","Sitagliptin","A","Endocrine","Metformin is first-line therapy for type 2 diabetes per ADA guidelines."
```

### Fixture 2: Malformed CSV (`malformed-questions.csv`)

```csv
stem,optionA,optionB,optionC,optionD,correctAnswer
"Valid question stem here?","Option A","Option B","Option C","Option D","B"
"Missing options question",,,,"A"
"No correct answer specified","Option A","Option B","Option C","Option D",""
,"Option A","Option B","Option C","Option D","C"
```

### Fixture 3: Empty CSV (`empty.csv`)

```csv
stem,optionA,optionB,optionC,optionD,correctAnswer
```

### Fixture 4: Valid QTI 2.1 XML (`valid-qti.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                identifier="item001"
                title="Cardiac Enzymes"
                adaptive="false"
                timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse>
      <value>C</value>
    </correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue>
      <value>0</value>
    </defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <p>Which of the following cardiac enzymes is released first after myocardial injury?</p>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
      <simpleChoice identifier="A">Troponin T</simpleChoice>
      <simpleChoice identifier="B">CK-MB</simpleChoice>
      <simpleChoice identifier="C">Myoglobin</simpleChoice>
      <simpleChoice identifier="D">LDH</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>
```

### Fixture 5: QTI 2.1 with Multiple Items (`multi-item-qti.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                identifier="test001"
                title="Sample Exam">
  <testPart identifier="part1" navigationMode="linear" submissionMode="individual">
    <assessmentSection identifier="section1" title="Cardiovascular" visible="true">
      <assessmentItemRef identifier="item001" href="item001.xml"/>
      <assessmentItemRef identifier="item002" href="item002.xml"/>
    </assessmentSection>
  </testPart>
</assessmentTest>
```

Note: QTI parser must handle both single `assessmentItem` documents and `assessmentTest` documents containing multiple `assessmentItemRef` elements. For multi-item tests where items are referenced by href, the parser should extract what metadata it can from the test structure and note that individual item files would need separate parsing.

### Fixture 6: Invalid XML (`invalid-qti.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                identifier="item001">
  <itemBody>
    <p>This XML is malformed — missing closing tags
    <choiceInteraction>
      <simpleChoice identifier="A">Option A</simpleChoice>
  </itemBody>
```

### Fixture 7: Valid Plain Text (`valid-questions.txt`)

```
1. A 55-year-old man presents with sudden onset of severe chest pain. ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?
A) Left anterior descending
B) Left circumflex
*C) Right coronary artery
D) Left main coronary artery

2. Which of the following is a contraindication to thrombolytic therapy?
A) ST elevation MI
B) Symptom onset < 12 hours
*C) Active internal bleeding
D) Age > 65 years

3. A patient with heart failure has a B-type natriuretic peptide (BNP) level of 1200 pg/mL. This finding is most consistent with:
A) Normal cardiac function
B) Mild heart failure
C) Moderate heart failure
*D) Severe heart failure
```

### Fixture 8: Alternative Plain Text Format (`alt-format.txt`)

```
Question 1:
A 35-year-old woman presents with palpitations. Her ECG shows an irregularly irregular rhythm with no discernible P waves.

A. Atrial fibrillation [CORRECT]
B. Atrial flutter
C. Ventricular tachycardia
D. Sinus tachycardia

Question 2:
Which class of antiarrhythmic drugs blocks sodium channels?

A. Class I [CORRECT]
B. Class II
C. Class III
D. Class IV
```

### Fixture 9: Edge Case Plain Text (`edge-cases.txt`)

```
1. This question has no correct answer marked
A) Option A
B) Option B
C) Option C
D) Option D

2.
A) Option A
*B) Option B
C) Option C
D) Option D

3. This question has only two options
*A) Correct
B) Wrong
```

---

## Section 10: API Test Spec (vitest)

**Framework:** vitest
**Total tests:** 14
**Location:** `apps/server/src/tests/import/`

### `csv-parser.test.ts` (4 tests)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CsvParser } from '../../services/import/parsers/csv-parser';
import { ParserOptions, CsvColumnMapping } from '@journey-os/types/import';
import { ParseError, FileSizeLimitError } from '../../errors/import.errors';

describe('CsvParser', () => {
  let parser: CsvParser;
  const defaultOptions: ParserOptions = {
    maxFileSizeBytes: 10 * 1024 * 1024,
    columnMapping: {
      stem: 'stem',
      optionA: 'optionA',
      optionB: 'optionB',
      optionC: 'optionC',
      optionD: 'optionD',
      correctAnswer: 'correctAnswer',
      topic: 'topic',
      explanation: 'explanation',
    },
  };

  beforeEach(() => {
    parser = new CsvParser();
  });

  it('should parse valid CSV with 3 questions and correct column mapping', async () => {
    // Load valid-questions.csv fixture
    // Assert: result.questions.length === 3
    // Assert: result.successCount === 3
    // Assert: result.errorCount === 0
    // Assert: result.format === 'csv'
    // Assert: first question has stem, 4 options, correctAnswer === 'A'
    // Assert: each question has topic and explanation populated
  });

  it('should collect non-fatal errors for malformed rows without stopping', async () => {
    // Load malformed-questions.csv fixture
    // Assert: result.questions.length === 1 (only first row is valid)
    // Assert: result.errors.length >= 3 (missing options, empty correct, missing stem)
    // Assert: each error has index, line, message, severity, field
    // Assert: errors include 'stem' field for row 4, 'correctAnswer' for row 3
  });

  it('should return empty results for CSV with headers only', async () => {
    // Load empty.csv fixture
    // Assert: result.questions.length === 0
    // Assert: result.totalFound === 0
    // Assert: result.errors.length === 0
  });

  it('should handle custom column mapping (non-standard header names)', async () => {
    // Create CSV with headers: "Question Text,Choice 1,Choice 2,Choice 3,Choice 4,Answer"
    // Provide columnMapping: { stem: 'Question Text', optionA: 'Choice 1', ... }
    // Assert: parses correctly with mapped headers
    // Assert: unmapped columns appear in rawMetadata
  });
});
```

### `qti-parser.test.ts` (3 tests)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { QtiParser } from '../../services/import/parsers/qti-parser';
import { ParseError } from '../../errors/import.errors';

describe('QtiParser', () => {
  let parser: QtiParser;

  beforeEach(() => {
    parser = new QtiParser();
  });

  it('should parse valid QTI 2.1 single assessmentItem with correct answer extraction', async () => {
    // Load valid-qti.xml fixture
    // Assert: result.questions.length === 1
    // Assert: question.stem contains 'cardiac enzymes'
    // Assert: question.options.length === 4
    // Assert: question.correctAnswer === 'C'
    // Assert: question.options[2].correct === true (Myoglobin)
    // Assert: result.format === 'qti'
  });

  it('should handle invalid XML gracefully with collected errors', async () => {
    // Load invalid-qti.xml fixture
    // Assert: throws ParseError OR result.errors.length > 0
    // Assert: error message references XML parsing failure
    // Assert: does not throw unhandled exception
  });

  it('should extract metadata from QTI attributes (identifier, title, adaptive)', async () => {
    // Load valid-qti.xml fixture
    // Assert: question.rawMetadata includes { identifier: 'item001', title: 'Cardiac Enzymes' }
    // Assert: rawMetadata.adaptive === 'false'
  });
});
```

### `text-parser.test.ts` (3 tests)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TextParser } from '../../services/import/parsers/text-parser';

describe('TextParser', () => {
  let parser: TextParser;

  beforeEach(() => {
    parser = new TextParser();
  });

  it('should parse standard format with asterisk-marked correct answers', async () => {
    // Load valid-questions.txt fixture (asterisk format: *C) Right coronary artery)
    // Assert: result.questions.length === 3
    // Assert: question 1 correctAnswer === 'C'
    // Assert: question 1 stem contains 'ST elevation'
    // Assert: each question has 4 options
    // Assert: result.format === 'text'
  });

  it('should parse alternative format with [CORRECT] marker', async () => {
    // Load alt-format.txt fixture
    // Assert: result.questions.length === 2
    // Assert: question 1 correctAnswer === 'A'
    // Assert: question 1 stem includes vignette text about palpitations
    // Assert: supports "Question N:" prefix format
  });

  it('should collect errors for questions with no correct answer or missing stem', async () => {
    // Load edge-cases.txt fixture
    // Assert: result.errors.length >= 1 (question 1 has no correct answer marked)
    // Assert: result.errors.length >= 2 (question 2 has empty stem)
    // Assert: question 3 parses successfully despite only 2 options (warning, not error)
  });
});
```

### `parser-factory.test.ts` (4 tests)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ParserFactory } from '../../services/import/parser-factory.service';
import { UnsupportedFormatError, FileSizeLimitError } from '../../errors/import.errors';

describe('ParserFactory', () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  it('should auto-detect CSV format from .csv extension', () => {
    const buffer = Buffer.from('stem,optionA\n"test","a"');
    // Assert: factory.detectFormat(buffer, 'questions.csv') === 'csv'
    // Assert: factory.getParser('questions.csv', buffer) instanceof CsvParser
  });

  it('should auto-detect QTI format from .xml extension with QTI content sniffing', () => {
    const qtiBuffer = Buffer.from('<?xml version="1.0"?><assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">');
    const nonQtiXml = Buffer.from('<?xml version="1.0"?><root><data/></root>');
    // Assert: factory.detectFormat(qtiBuffer, 'export.xml') === 'qti'
    // Assert: factory.detectFormat(nonQtiXml, 'data.xml') throws UnsupportedFormatError
    //         (XML but not QTI)
  });

  it('should auto-detect text format from .txt extension', () => {
    const buffer = Buffer.from('1. Question stem\nA) Option A\n*B) Option B');
    // Assert: factory.detectFormat(buffer, 'questions.txt') === 'text'
  });

  it('should throw FileSizeLimitError when buffer exceeds maxFileSizeBytes', async () => {
    const options = { maxFileSizeBytes: 100 }; // 100 bytes
    const largeBuffer = Buffer.alloc(200, 'x');
    // Assert: factory.parse(largeBuffer, 'test.csv', options) throws FileSizeLimitError
    // Assert: error.message includes file size and limit
  });
});
```

---

## Section 11: E2E Test Spec

**Not applicable.** This story has no UI and no API endpoints. All testing is via vitest unit/integration tests. E2E testing of the full import flow will be covered by STORY-F-57 (Import Pipeline) which wires parsers to UI and API.

---

## Section 12: Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | CSV parser handles standard CSV with configurable column mapping and produces correct `ParsedQuestion[]` | `csv-parser.test.ts` test 1, test 4 |
| AC-2 | QTI parser supports QTI 2.1 XML format, extracts stem, options, and correct answer from `responseDeclaration` | `qti-parser.test.ts` test 1 |
| AC-3 | Plain text parser uses regex to extract stem, lettered choices, and asterisk/[CORRECT]-marked answers | `text-parser.test.ts` test 1, test 2 |
| AC-4 | Parser factory auto-detects format from file extension (.csv, .xml, .txt) and content sniffing (QTI namespace in XML) | `parser-factory.test.ts` test 1, test 2, test 3 |
| AC-5 | All parsers return standardized `ParsedQuestion[]` with normalized fields regardless of input format | All parser tests — same output interface |
| AC-6 | Parser-level validation catches malformed input: missing stem, no correct answer, empty options | `csv-parser.test.ts` test 2, `text-parser.test.ts` test 3 |
| AC-7 | Non-fatal parse errors are collected per row/item with line number, severity, field name, and message | `csv-parser.test.ts` test 2 (errors array assertions) |
| AC-8 | File size limit is configurable with default 10MB; exceeding it throws `FileSizeLimitError` | `parser-factory.test.ts` test 4 |
| AC-9 | Custom error classes `ParseError`, `UnsupportedFormatError`, `FileSizeLimitError` extend `JourneyOSError` with error codes | Error class implementation + factory test 2, test 4 |
| AC-10 | 14 vitest tests pass covering all three formats, auto-detection, malformed input, edge cases, and size limits | All 4 test files |
| AC-11 | TypeScript strict mode with zero `any` usage. Named exports only. No default exports. | Code review / tsc --noEmit |
| AC-12 | All parser classes implement `IParser` interface with OOP encapsulation (private fields, public getters, constructor DI) | Code review |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Pipeline C steps: Parse -> Normalize -> ... -> Review Queue | [ARCHITECTURE_v10 Section 8.4] |
| Content ingestion chunking: 800 tokens, 100-token overlap | [ARCHITECTURE_v10 Section 8.2] |
| Embedding: Voyage AI voyage-large-2, 1024 dimensions | [ARCHITECTURE_v10 Section 2.1] |
| File storage via Supabase Storage | [ARCHITECTURE_v10 Section 3.1, Row: File Storage] |
| assessment_items table DDL (target of import pipeline) | [SUPABASE_DDL_v1 Section Assessment Tables] |
| options table DDL (letter, text, correct, misconception, evidence_rule) | [SUPABASE_DDL_v1 Section Assessment Tables] |
| OOP: private fields, public getters, constructor DI | [CODE_STANDARDS Section 3.1] |
| Custom error classes extending JourneyOSError with code | [CODE_STANDARDS Section 3.4] |
| Named exports only, no default exports | [CODE_STANDARDS Section 4.4] |
| Service pattern: classes with constructor DI | [CODE_STANDARDS Section 3.2, Row: Service] |
| Test framework: vitest for unit/integration | [CODE_STANDARDS Section 6.1] |
| Coverage targets: services 90%, domain models 95% | [CODE_STANDARDS Section 6.2] |
| F-11 feature: legacy import via Pipeline C | [F-11 spec, Description] |
| F-11 data domain: Pipeline C parse -> tag -> embed -> dual-write | [F-11 spec, Data Domains] |
| API endpoint POST /api/v1/items/import (implemented in STORY-F-57, not this story) | [F-11 spec, Data Domains] |
| Upload endpoint: POST /api/v1/courses/:courseId/upload | [API_CONTRACT_v1 Section Content Upload] |
| uploads table with document_type including 'exam_export' | [SUPABASE_DDL_v1 Section File Storage Tables] |
| MVC: Model layer contains services, repositories. Controllers handle HTTP. | [CODE_STANDARDS Section 2.2] |
| Monorepo: apps/server (Express), packages/shared-types | [ARCHITECTURE_v10 Section 3.7] |
| DualWriteService pattern: Supabase first, Neo4j second, sync_status | [ARCHITECTURE_v10 Section 15.1] |

---

## Section 14: Environment Prerequisites

| Prerequisite | Required? | Notes |
|-------------|-----------|-------|
| Supabase | No | No DB operations in this story |
| Neo4j | No | No graph operations in this story |
| Redis | No | No caching in this story |
| Inngest | No | No background jobs in this story |
| External APIs | No | No LLM or embedding calls |
| Docker | No | Pure TypeScript unit tests |
| Node.js | Yes | >= 18.x (for Buffer API) |
| vitest | Yes | Test framework |
| papaparse | Yes | CSV parsing (install: `npm install papaparse @types/papaparse`) |
| fast-xml-parser | Yes | QTI XML parsing (install: `npm install fast-xml-parser`) |

**Setup steps:**
1. `cd apps/server && npm install papaparse fast-xml-parser`
2. `cd apps/server && npm install -D @types/papaparse`
3. Run tests: `cd apps/server && npx vitest run src/tests/import/`

---

## Section 15: Figma / Make Prototype

**Not applicable.** No UI in this story.

---

## Implementation Notes

### Error Class Hierarchy

```
JourneyOSError (base — from CODE_STANDARDS Section 3.4)
  └── ImportError (code: 'IMPORT_ERROR')
        ├── ParseError (code: 'PARSE_ERROR')
        │     Properties: format, filename, line, details
        ├── UnsupportedFormatError (code: 'UNSUPPORTED_FORMAT')
        │     Properties: filename, detectedType
        └── FileSizeLimitError (code: 'FILE_SIZE_LIMIT')
              Properties: fileSize, maxSize
```

If `JourneyOSError` base class does not yet exist (no prior stories implemented), create it inline in `apps/server/src/errors/import.errors.ts` following the exact pattern from CODE_STANDARDS Section 3.4:

```typescript
export class JourneyOSError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

### CSV Parser — papaparse Integration

```typescript
import Papa from 'papaparse';

// Use Papa.parse(csvString, {
//   header: true,        // auto-detect headers
//   skipEmptyLines: true,
//   dynamicTyping: true, // infer number types
//   transformHeader: (h) => h.trim(),
// });
```

### QTI Parser — fast-xml-parser Integration

```typescript
import { XMLParser } from 'fast-xml-parser';

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '@_',
//   isArray: (name) => ['simpleChoice', 'value'].includes(name),
// });
// const parsed = parser.parse(xmlString);
```

Key QTI 2.1 structure to navigate:
- `assessmentItem.itemBody.choiceInteraction.simpleChoice[]` -> options
- `assessmentItem.responseDeclaration.correctResponse.value` -> correct answer
- `simpleChoice['@_identifier']` -> option letter
- `simpleChoice['#text']` -> option text

### Text Parser — Regex Patterns

```typescript
// Primary pattern: numbered questions with lettered options
// Question: /^(\d+)\.\s+(.+?)(?=\n[A-E][\.\)])/s
// Option: /^([*]?)([A-E])[\.\)]\s+(.+)$/gm
// Correct marker: asterisk prefix (*C) or [CORRECT] suffix

// Alternative pattern: "Question N:" prefix
// Question: /^Question\s+\d+:\s*\n(.+?)(?=\n[A-E][\.\)])/s
```

### Streaming Consideration

For files approaching the 10MB limit, consider using papaparse's streaming mode:
```typescript
Papa.parse(readableStream, {
  step: (results, parser) => { /* process row */ },
  complete: () => { /* finalize */ },
});
```

This is an optimization, not a requirement for this story. The default buffer-based approach handles files up to 10MB without memory issues in Node.js.
