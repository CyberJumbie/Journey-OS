# STORY-F-54 Brief: Auto-Tagging Service

## 0. Lane & Priority

```yaml
story_id: STORY-F-54
old_id: S-F-21-4
lane: faculty
lane_priority: 3
within_lane_order: 54
sprint: 12
size: M
depends_on:
  - STORY-F-48 (faculty) — Validation Rule Engine exists
blocks:
  - STORY-F-57 — Import Pipeline (needs auto-tagging)
personas_served: [faculty]
epic: E-21 (Validation & Dedup Engine)
feature: F-10 (Quality Assurance Pipeline)
```

## 1. Summary

Build an **auto-tagging service** that automatically assigns framework mappings (USMLE system, discipline, competency), Bloom's taxonomy level, and difficulty to generated questions. Bloom's level is derived from stem verb analysis combined with LLM classification. Difficulty is assigned based on concept depth, distractor quality, and clinical reasoning level. Tags are written to both Supabase (question metadata) and Neo4j (relationship edges) using the DualWriteService pattern. Each tag includes a confidence score (0-1). Tags with confidence below 0.7 receive a `low_confidence_tag` warning for reviewer attention. Faculty can manually override auto-assigned tags. Tagging runs after the validation + dedup pass in the pipeline.

Key constraints:
- DualWriteService: Supabase first, Neo4j second, sync_status = 'synced'
- Neo4j relationships: `(Question)-[:TAGGED_WITH]->(FrameworkNode)`, `(Question)-[:AT_BLOOM_LEVEL]->(BloomLevel)`
- SCREAMING_SNAKE_CASE for Neo4j labels (e.g., `USMLE_System`)
- Confidence score 0-1 per tag; less than 0.7 triggers `low_confidence_tag` warning
- Custom error class: `TaggingServiceError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `AutoTagResult`, `FrameworkTag`, `BloomAssignment`, `DifficultyAssignment`, `TagConfidence` in `packages/types/src/validation/`
2. **Error class** -- `TaggingServiceError` in `apps/server/src/errors/tagging.errors.ts`
3. **Bloom classifier service** -- `BloomClassifierService` with stem verb analysis + LLM classification
4. **Question tag repository** -- `QuestionTagRepository` for dual-write tag persistence
5. **Auto-tagging service** -- `AutoTaggingService` orchestrates framework, Bloom, and difficulty tagging
6. **API tests** -- 10-14 tests covering framework tagging, Bloom assignment, difficulty, dual-write, confidence, override
7. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/validation/tagging.types.ts

import { BloomLevel, DifficultyLevel } from "../generation/spec.types";

/** Tag category for framework mapping */
export type TagCategory = "usmle_system" | "usmle_discipline" | "competency" | "bloom_level" | "difficulty";

/** A single auto-assigned tag with confidence */
export interface AutoTag {
  readonly tag_id: string;
  readonly category: TagCategory;
  readonly value: string;
  readonly confidence: number; // 0-1
  readonly source: "verb_analysis" | "llm_classification" | "heuristic" | "manual_override";
  readonly is_low_confidence: boolean; // true if confidence < 0.7
}

/** Bloom's taxonomy verb mapping */
export interface BloomVerbMapping {
  readonly level: BloomLevel;
  readonly verbs: readonly string[];
}

/** Bloom level assignment result */
export interface BloomAssignment {
  readonly level: BloomLevel;
  readonly confidence: number;
  readonly matched_verb: string | null;
  readonly source: "verb_analysis" | "llm_classification";
}

/** Difficulty assignment result */
export interface DifficultyAssignment {
  readonly level: DifficultyLevel;
  readonly confidence: number;
  readonly factors: DifficultyFactors;
}

/** Factors used in difficulty heuristic */
export interface DifficultyFactors {
  readonly reasoning_steps: number;
  readonly is_clinical: boolean;
  readonly distractor_similarity: number; // 0-1, higher = more similar/harder
  readonly concept_depth: number; // 1-5
}

/** Complete auto-tagging result for a question */
export interface AutoTagResult {
  readonly question_id: string;
  readonly tags: readonly AutoTag[];
  readonly bloom_assignment: BloomAssignment;
  readonly difficulty_assignment: DifficultyAssignment;
  readonly low_confidence_count: number;
  readonly sync_status: "synced" | "supabase_only" | "failed";
  readonly tagged_at: string;
}

/** Manual tag override request */
export interface TagOverrideRequest {
  readonly question_id: string;
  readonly tag_id: string;
  readonly new_value: string;
  readonly override_reason: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_question_tags_table

CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'heuristic',
  is_low_confidence BOOLEAN NOT NULL DEFAULT false,
  overridden_by UUID REFERENCES profiles(id),
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, category, value)
);

-- Indexes
CREATE INDEX idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX idx_question_tags_category ON question_tags(category);
CREATE INDEX idx_question_tags_low_confidence ON question_tags(question_id) WHERE is_low_confidence = true;

-- RLS
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view tags for their questions"
  ON question_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_tags.question_id
      AND q.created_by = auth.uid()
    )
  );

CREATE POLICY "Faculty can update tags for their questions"
  ON question_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_tags.question_id
      AND q.created_by = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/questions/:questionId/auto-tag (Auth: faculty)

Triggers auto-tagging for a question.

**Success Response (200):**
```json
{
  "data": {
    "question_id": "question-uuid-1",
    "tags": [
      { "tag_id": "tag-uuid-1", "category": "usmle_system", "value": "Cardiovascular", "confidence": 0.95, "source": "llm_classification", "is_low_confidence": false },
      { "tag_id": "tag-uuid-2", "category": "usmle_discipline", "value": "Internal Medicine", "confidence": 0.88, "source": "llm_classification", "is_low_confidence": false },
      { "tag_id": "tag-uuid-3", "category": "competency", "value": "Patient Care", "confidence": 0.72, "source": "llm_classification", "is_low_confidence": false }
    ],
    "bloom_assignment": {
      "level": "Apply",
      "confidence": 0.92,
      "matched_verb": "manage",
      "source": "verb_analysis"
    },
    "difficulty_assignment": {
      "level": "medium",
      "confidence": 0.80,
      "factors": {
        "reasoning_steps": 2,
        "is_clinical": true,
        "distractor_similarity": 0.45,
        "concept_depth": 3
      }
    },
    "low_confidence_count": 0,
    "sync_status": "synced",
    "tagged_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/questions/:questionId/tags/:tagId (Auth: faculty)

Manual tag override.

**Request Body:**
```json
{
  "new_value": "Pharmacology",
  "override_reason": "Primary focus is drug interactions, not cardiology"
}
```

**Success Response (200):**
```json
{
  "data": {
    "tag_id": "tag-uuid-1",
    "category": "usmle_discipline",
    "value": "Pharmacology",
    "confidence": 1.0,
    "source": "manual_override",
    "is_low_confidence": false
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not question owner |
| 404 | `NOT_FOUND` | Question or tag not found |
| 500 | `TAGGING_SERVICE_ERROR` | Auto-tagging failed |

## 6. Frontend Spec

No frontend components in this story. Tags will be displayed in the question detail view and review UI in later stories.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/validation/tagging.types.ts` | Types | Create |
| 2 | `packages/types/src/validation/index.ts` | Types | Edit (add tagging exports) |
| 3 | `apps/server/src/errors/tagging.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 5 | Supabase migration: `question_tags` table | Database | Apply via MCP |
| 6 | `apps/server/src/repositories/question-tag.repository.ts` | Repository | Create |
| 7 | `apps/server/src/services/validation/bloom-classifier.service.ts` | Service | Create |
| 8 | `apps/server/src/services/validation/auto-tagging.service.ts` | Service | Create |
| 9 | `apps/server/src/__tests__/validation/auto-tagging.test.ts` | Tests | Create |
| 10 | `apps/server/src/__tests__/validation/bloom-classifier.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-48 | faculty | Pending | Validation engine must exist (tagging runs after validation) |
| STORY-U-7 | universal | **DONE** | USMLE seed data (framework nodes in Neo4j for tagging targets) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- No new packages required. Uses existing Anthropic SDK for LLM classification.

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for relationship creation
- `apps/server/src/services/validation/validation-engine.service.ts` -- Validation (from STORY-F-48)

## 9. Test Fixtures (inline)

```typescript
import type { AutoTagResult, BloomAssignment, DifficultyAssignment, AutoTag } from "@journey-os/types";

// Mock framework tags
export const CARDIOLOGY_SYSTEM_TAG: AutoTag = {
  tag_id: "tag-uuid-1",
  category: "usmle_system",
  value: "Cardiovascular",
  confidence: 0.95,
  source: "llm_classification",
  is_low_confidence: false,
};

export const LOW_CONFIDENCE_TAG: AutoTag = {
  tag_id: "tag-uuid-4",
  category: "competency",
  value: "Medical Knowledge",
  confidence: 0.55,
  source: "llm_classification",
  is_low_confidence: true,
};

// Mock Bloom assignment
export const APPLY_BLOOM: BloomAssignment = {
  level: "Apply",
  confidence: 0.92,
  matched_verb: "manage",
  source: "verb_analysis",
};

export const LLM_BLOOM: BloomAssignment = {
  level: "Analyze",
  confidence: 0.78,
  matched_verb: null,
  source: "llm_classification",
};

// Mock difficulty assignment
export const MEDIUM_DIFFICULTY: DifficultyAssignment = {
  level: "medium",
  confidence: 0.80,
  factors: {
    reasoning_steps: 2,
    is_clinical: true,
    distractor_similarity: 0.45,
    concept_depth: 3,
  },
};

// Mock complete result
export const MOCK_AUTO_TAG_RESULT: AutoTagResult = {
  question_id: "question-uuid-1",
  tags: [
    CARDIOLOGY_SYSTEM_TAG,
    { tag_id: "tag-uuid-2", category: "usmle_discipline", value: "Internal Medicine", confidence: 0.88, source: "llm_classification", is_low_confidence: false },
  ],
  bloom_assignment: APPLY_BLOOM,
  difficulty_assignment: MEDIUM_DIFFICULTY,
  low_confidence_count: 0,
  sync_status: "synced",
  tagged_at: "2026-02-19T14:30:00Z",
};

// Result with low confidence tags
export const RESULT_WITH_LOW_CONFIDENCE: AutoTagResult = {
  ...MOCK_AUTO_TAG_RESULT,
  tags: [CARDIOLOGY_SYSTEM_TAG, LOW_CONFIDENCE_TAG],
  low_confidence_count: 1,
};

// Bloom verb mapping fixture
export const BLOOM_VERB_MAP = {
  Remember: ["define", "list", "recall", "identify", "name"],
  Understand: ["explain", "describe", "summarize", "interpret", "classify"],
  Apply: ["calculate", "demonstrate", "manage", "administer", "prescribe"],
  Analyze: ["differentiate", "compare", "distinguish", "examine", "investigate"],
  Evaluate: ["critique", "justify", "assess", "judge", "recommend"],
  Create: ["design", "construct", "develop", "formulate", "propose"],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/validation/auto-tagging.test.ts`

```
describe("AutoTaggingService")
  describe("tagQuestion")
    > assigns USMLE system, discipline, and competency tags
    > includes confidence score for each tag
    > flags tags with confidence < 0.7 as low_confidence
    > writes tags to Supabase via QuestionTagRepository
    > writes relationships to Neo4j (TAGGED_WITH, AT_BLOOM_LEVEL)
    > sets sync_status to 'synced' on successful dual-write
    > sets sync_status to 'supabase_only' when Neo4j write fails
    > throws TaggingServiceError on complete failure

  describe("manual override")
    > updates tag value and sets source to 'manual_override'
    > sets confidence to 1.0 on manual override
    > records override_reason and overridden_by
```

**File:** `apps/server/src/__tests__/validation/bloom-classifier.test.ts`

```
describe("BloomClassifierService")
  describe("classify")
    > assigns Bloom level from stem verb analysis when verb matches
    > falls back to LLM classification when no verb match
    > returns high confidence for verb-matched assignments
    > returns lower confidence for LLM-based assignments
    > maps common medical verbs to correct Bloom levels
```

**Total: ~16 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Auto-tagging is a server-side service. E2E coverage will be added with the question detail UI.

## 12. Acceptance Criteria

1. Auto-tag assigns USMLE system, discipline, and competency framework tags
2. Bloom's taxonomy level derived from stem verb analysis + LLM classification fallback
3. Difficulty assigned based on concept depth, distractor quality, clinical reasoning level
4. Tags written to both Supabase and Neo4j via DualWriteService pattern
5. Tag confidence score (0-1) included for each tag
6. Tags with confidence less than 0.7 flagged as `low_confidence_tag` for review
7. Faculty can manually override auto-assigned tags
8. Neo4j relationships: `(Question)-[:TAGGED_WITH]->(FrameworkNode)`, `(Question)-[:AT_BLOOM_LEVEL]->(BloomLevel)`
9. `TaggingServiceError` extends `JourneyOSError`
10. All 16 API tests pass
11. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| USMLE system, discipline, competency tags | S-F-21-4 Acceptance Criteria |
| Bloom verb analysis + LLM | S-F-21-4 Acceptance Criteria: "stem verb analysis + LLM classification" |
| Difficulty heuristic factors | S-F-21-4 Notes: "number of reasoning steps, clinical vs. basic science, distractor similarity" |
| DualWriteService pattern | S-F-21-4 Acceptance Criteria: "Supabase first, Neo4j second, sync_status" |
| Confidence < 0.7 warning | S-F-21-4 Notes: "Tag confidence < 0.7 should add low_confidence_tag warning" |
| SCREAMING_SNAKE_CASE Neo4j labels | CLAUDE.md Architecture Rules |
| Neo4j relationships | S-F-21-4 Notes: "(Question)-[:TAGGED_WITH]->(FrameworkNode)" |
| Bloom verb mapping | S-F-21-4 Notes: "Remember (define, list), Understand (explain, describe), ..." |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions` table exists
- **Neo4j:** Running with USMLE seed data (from STORY-U-7) for framework nodes
- **Express:** Server running on port 3001
- **Anthropic API key:** For LLM classification fallback
- **No new NPM packages required**

## 15. Implementation Notes

- **AutoTaggingService:** OOP class with `#supabaseClient`, `#neo4jClient`, `#bloomClassifier`, `#questionTagRepo` injected via constructor DI. `tagQuestion(questionId)` method: (1) fetches question, (2) classifies Bloom level, (3) assigns difficulty, (4) assigns framework tags via LLM, (5) dual-writes all tags.
- **BloomClassifierService:** Two-phase classification. Phase 1: regex-match stem verbs against `BLOOM_VERB_MAP`. If a verb matches with high certainty, return that level. Phase 2: If no match or ambiguous, call LLM with the full question for classification. Return confidence based on source (verb_analysis: 0.85-0.95, llm_classification: 0.65-0.85).
- **Difficulty heuristic:** `reasoning_steps` = count of logical jumps from vignette to answer. `is_clinical` = true if vignette contains patient scenario. `distractor_similarity` = cosine similarity between correct answer and nearest distractor (via embeddings). `concept_depth` = depth of deepest concept in the knowledge graph path.
- **DualWriteService pattern:** Write tags to `question_tags` table first. Then create Neo4j relationships. If Neo4j fails, set `sync_status = 'supabase_only'` and log for retry. Do NOT roll back Supabase write.
- **Neo4j Cypher for tagging:** `MATCH (q:Question {id: $questionId}), (f:USMLE_System {name: $tagValue}) MERGE (q)-[:TAGGED_WITH {confidence: $confidence}]->(f)`
- **vi.hoisted() for mocks:** Neo4j and Supabase client mocks must use `vi.hoisted()`.
- **No default exports:** All services, repositories, types, and error classes use named exports only.
