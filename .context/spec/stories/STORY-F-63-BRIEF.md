# STORY-F-63 Brief: Question Detail Review View

## 0. Lane & Priority

```yaml
story_id: STORY-F-63
old_id: S-F-23-2
lane: faculty
lane_priority: 3
within_lane_order: 63
sprint: 13
size: L
depends_on:
  - STORY-F-58 (faculty) — Review Queue List Page (navigate from queue)
blocks: []
personas_served: [faculty]
epic: E-23 (Faculty Review UI)
feature: F-10
user_flow: UF-14 (Faculty Review Workflow)
```

## 1. Summary

Build a **question detail review view** that displays the full question content alongside Toulmin argumentation panels, provenance chain, critic score breakdowns, dedup results, and validation warnings. This is the primary decision-making screen for faculty reviewers. The Toulmin panel is the key differentiator -- it makes AI reasoning transparent and auditable by showing claim, evidence, warrant, backing, qualifier, and rebuttal for each critic metric. The provenance chain is built from Neo4j graph traversal (Question -> Concept -> SLO -> Course). The layout uses collapsible panels with the question + scores visible by default, and Toulmin + provenance expanded on demand. A side-by-side comparison mode shows flagged duplicates.

Key constraints:
- Toulmin argumentation panel with 6 components per metric
- Provenance chain from Neo4j graph traversal
- 6 critic metrics with individual scores, justifications, and composite
- Collapsible panels for information density management
- Color-code scores: green (4-5), yellow (3-3.9), red (1-2.9)
- Design tokens for all colors -- no hardcoded hex
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ReviewDetail`, `ToulminArgument`, `ProvenanceNode`, `CriticMetric`, `DedupResult`, `ValidationWarning` in `packages/types/src/review/`
2. **Error class** -- `ReviewDetailError` in `apps/server/src/errors/review.errors.ts`
3. **Service** -- `ReviewDetailService` with `getDetail()` assembling question, Toulmin, provenance, critic scores, dedup, validation from multiple sources
4. **Controller** -- `ReviewDetailController` with GET endpoint returning full detail payload
5. **Routes** -- Register under `/api/v1/review/questions/:questionId`
6. **View -- QuestionDisplay** -- Full question rendering (vignette, stem, choices, rationale)
7. **View -- ToulminPanel** -- Collapsible panel with 6 argumentation components per metric
8. **View -- ProvenancePanel** -- Graph-style provenance chain display
9. **View -- CriticScoreCard** -- Individual metric card with score, justification, color coding
10. **View -- DedupComparison** -- Side-by-side comparison with flagged duplicate
11. **View -- Page** -- `page.tsx` for `/faculty/review/[questionId]`
12. **API tests** -- 14 tests covering detail endpoint, Toulmin structure, provenance, metadata, dedup
13. **Exports** -- Register types and error class in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/detail.types.ts

/** Full question content for review */
export interface QuestionContent {
  readonly id: string;
  readonly vignette: string;
  readonly stem: string;
  readonly answer_choices: AnswerChoice[];
  readonly correct_answer_index: number;
  readonly rationale: string;
  readonly question_type: string;
  readonly difficulty: number;
  readonly bloom_level: string;
}

/** Single answer choice */
export interface AnswerChoice {
  readonly index: number;
  readonly text: string;
  readonly is_correct: boolean;
}

/** Toulmin argumentation for a single critic metric */
export interface ToulminArgument {
  readonly metric_name: string;
  readonly claim: string;
  readonly evidence: string;
  readonly warrant: string;
  readonly backing: string;
  readonly qualifier: string;
  readonly rebuttal: string;
}

/** A single critic metric score */
export interface CriticMetric {
  readonly name: string;
  readonly score: number;
  readonly justification: string;
  readonly toulmin: ToulminArgument;
}

/** Composite critic scores */
export interface CriticScores {
  readonly composite: number;
  readonly metrics: CriticMetric[];
}

/** Provenance chain node */
export interface ProvenanceNode {
  readonly type: "Question" | "Concept" | "SubConcept" | "SLO" | "ILO" | "Course";
  readonly id: string;
  readonly name: string;
  readonly relationship: string;
}

/** Full provenance chain */
export interface ProvenanceChain {
  readonly nodes: ProvenanceNode[];
  readonly generation_method: "ai_generated" | "imported" | "manual";
  readonly pipeline_trace: string[];
}

/** Dedup result for a flagged similar item */
export interface DedupResult {
  readonly similar_question_id: string;
  readonly similarity_score: number;
  readonly stem_preview: string;
  readonly flagged: boolean;
  readonly rejected: boolean;
}

/** Validation warning (non-blocking) */
export interface ValidationWarning {
  readonly rule: string;
  readonly message: string;
  readonly severity: "info" | "warning";
}

/** Metadata with auto-tag confidence */
export interface QuestionMetadata {
  readonly framework_tags: FrameworkTag[];
  readonly bloom_level: string;
  readonly bloom_confidence: number;
  readonly difficulty: number;
  readonly difficulty_confidence: number;
  readonly usmle_system: string;
  readonly usmle_discipline: string;
}

/** Framework tag with confidence */
export interface FrameworkTag {
  readonly tag: string;
  readonly confidence: number;
  readonly source: "auto" | "manual";
}

/** Full review detail response */
export interface ReviewDetail {
  readonly question: QuestionContent;
  readonly critic_scores: CriticScores;
  readonly provenance: ProvenanceChain;
  readonly metadata: QuestionMetadata;
  readonly dedup_results: DedupResult[];
  readonly validation_warnings: ValidationWarning[];
  readonly review_status: string;
  readonly assigned_reviewer_id: string | null;
  readonly generated_by_id: string;
  readonly generated_by_name: string;
  readonly created_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- No new tables needed. This story assembles data from existing tables:
-- questions (Supabase) — question content, status, metadata
-- critic_evaluations (Supabase) — critic scores and Toulmin argumentation
-- dedup_results (Supabase) — similarity flags
-- validation_results (Supabase) — validation warnings
-- Neo4j: Question → Concept → SLO → Course (provenance chain)

-- Migration: add_review_detail_indexes
-- Optimize detail assembly queries

CREATE INDEX IF NOT EXISTS idx_critic_evaluations_question_id
  ON critic_evaluations(question_id);

CREATE INDEX IF NOT EXISTS idx_dedup_results_question_id
  ON dedup_results(question_id);

CREATE INDEX IF NOT EXISTS idx_validation_results_question_id
  ON validation_results(question_id);
```

## 5. API Contract (complete request/response)

### GET /api/v1/review/questions/:questionId (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "question": {
      "id": "q-uuid-1",
      "vignette": "A 55-year-old male with a history of hypertension and type 2 diabetes presents to the emergency department with acute onset chest pain radiating to the left arm...",
      "stem": "Which of the following is the most appropriate initial diagnostic test?",
      "answer_choices": [
        { "index": 0, "text": "Chest X-ray", "is_correct": false },
        { "index": 1, "text": "12-lead ECG", "is_correct": true },
        { "index": 2, "text": "CT pulmonary angiography", "is_correct": false },
        { "index": 3, "text": "Troponin I level", "is_correct": false },
        { "index": 4, "text": "D-dimer assay", "is_correct": false }
      ],
      "correct_answer_index": 1,
      "rationale": "A 12-lead ECG is the most appropriate initial test for acute chest pain...",
      "question_type": "single_best_answer",
      "difficulty": 0.65,
      "bloom_level": "Apply"
    },
    "critic_scores": {
      "composite": 3.8,
      "metrics": [
        {
          "name": "clinical_accuracy",
          "score": 4.2,
          "justification": "The clinical scenario is medically accurate...",
          "toulmin": {
            "metric_name": "clinical_accuracy",
            "claim": "The question presents a clinically accurate scenario",
            "evidence": "Symptoms, history, and demographics are consistent with ACS presentation",
            "warrant": "ECG is guideline-recommended as initial test per AHA/ACC guidelines",
            "backing": "2023 ACC/AHA guidelines for acute coronary syndrome evaluation",
            "qualifier": "Assuming standard emergency department protocol",
            "rebuttal": "In resource-limited settings, point-of-care troponin might be prioritized"
          }
        }
      ]
    },
    "provenance": {
      "nodes": [
        { "type": "Question", "id": "q-uuid-1", "name": "Chest Pain Differential", "relationship": "root" },
        { "type": "Concept", "id": "concept-uuid-1", "name": "Acute Coronary Syndrome", "relationship": "TESTS_CONCEPT" },
        { "type": "SLO", "id": "slo-uuid-1", "name": "Diagnose ACS using initial workup", "relationship": "MAPS_TO" },
        { "type": "Course", "id": "course-uuid-1", "name": "Cardiology 201", "relationship": "OFFERS" }
      ],
      "generation_method": "ai_generated",
      "pipeline_trace": ["concept_selection", "vignette_generation", "stem_generation", "distractor_generation", "validation", "critic_evaluation"]
    },
    "metadata": {
      "framework_tags": [
        { "tag": "acute_coronary_syndrome", "confidence": 0.95, "source": "auto" },
        { "tag": "emergency_medicine", "confidence": 0.88, "source": "auto" }
      ],
      "bloom_level": "Apply",
      "bloom_confidence": 0.91,
      "difficulty": 0.65,
      "difficulty_confidence": 0.78,
      "usmle_system": "Cardiovascular",
      "usmle_discipline": "Medicine"
    },
    "dedup_results": [
      {
        "similar_question_id": "q-uuid-existing-1",
        "similarity_score": 0.87,
        "stem_preview": "A 60-year-old female presents with chest pain...",
        "flagged": true,
        "rejected": false
      }
    ],
    "validation_warnings": [
      {
        "rule": "distractor_homogeneity",
        "message": "Distractors vary in length; consider making them more uniform",
        "severity": "warning"
      }
    ],
    "review_status": "in_review",
    "assigned_reviewer_id": "faculty-uuid-1",
    "generated_by_id": "faculty-uuid-2",
    "generated_by_name": "Dr. Smith",
    "created_at": "2026-02-18T10:00:00Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Faculty not assigned to this question's course |
| 404 | `NOT_FOUND` | Question not found in review queue |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/faculty/review/[questionId]`

**File:** `apps/web/src/app/(dashboard)/faculty/review/[questionId]/page.tsx`

```
ReviewDetailPage
  ├── BackLink — "< Back to Review Queue"
  ├── PageHeader (question title + status badge + priority badge)
  ├── MainContent (two-column responsive layout)
  │   ├── LeftColumn (60%)
  │   │   ├── QuestionDisplay (organism)
  │   │   │   ├── VignetteSection (molecule) — clinical vignette text
  │   │   │   ├── StemSection (molecule) — question stem, bold
  │   │   │   ├── AnswerChoices (molecule) — radio-style list, correct highlighted green
  │   │   │   └── RationaleSection (molecule) — collapsible, explanation text
  │   │   ├── ToulminPanel (organism) — collapsible, expanded on click
  │   │   │   └── Per metric:
  │   │   │       ├── MetricHeader (molecule) — name + score badge
  │   │   │       ├── Claim (atom) — bold statement
  │   │   │       ├── Evidence (atom) — supporting data
  │   │   │       ├── Warrant (atom) — logical bridge
  │   │   │       ├── Backing (atom) — authority source
  │   │   │       ├── Qualifier (atom) — conditions/limitations
  │   │   │       └── Rebuttal (atom) — counter-arguments
  │   │   └── DedupComparison (organism) — side-by-side if flagged
  │   │       ├── CurrentQuestion (molecule)
  │   │       ├── SimilarQuestion (molecule)
  │   │       └── SimilarityScore badge
  │   └── RightColumn (40%)
  │       ├── CriticScoreCard (organism)
  │       │   ├── CompositeScore (molecule) — large number, color-coded
  │       │   └── MetricScores (molecule) — 6 individual scores with bars
  │       ├── MetadataPanel (organism) — collapsible
  │       │   ├── Tags with confidence scores
  │       │   ├── Bloom level + confidence
  │       │   ├── Difficulty + confidence
  │       │   ├── USMLE system + discipline
  │       │   └── Question type
  │       ├── ProvenancePanel (organism) — collapsible
  │       │   └── Chain: Question → Concept → SLO → Course (vertical flow)
  │       └── ValidationWarnings (molecule) — yellow alert list
  └── StickyFooter
      └── ReviewActionBar (from STORY-F-61) + CommentThread
```

**Design tokens:**
- Score green (4-5): `--color-score-high` (green #69a338)
- Score yellow (3-3.9): `--color-score-medium` (amber)
- Score red (1-2.9): `--color-score-low` (red)
- Correct answer highlight: `--color-success-bg` (light green)
- Collapsible header: `--color-surface-hover`
- Panel background: `--color-surface-white` (#ffffff)
- Page background: `--color-bg-cream` (#f5f3ef)
- Provenance chain line: `--color-primary-navy` (#002c76)

**States:**
1. **Loading** -- Skeleton panels while assembling data from multiple sources
2. **Populated** -- All panels rendered, collapsible sections in default state
3. **Expanded** -- User expanded Toulmin/provenance panels
4. **Dedup flagged** -- Side-by-side comparison mode visible
5. **No dedup** -- Dedup section hidden (no similar items)
6. **Error** -- Question not found or assembly failed, error page

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/detail.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Edit (add detail export) |
| 3 | `apps/server/src/errors/review.errors.ts` | Errors | Edit (add ReviewDetailError) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/services/review/review-detail.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/review/review-detail.controller.ts` | Controller | Create |
| 7 | `apps/server/src/routes/review.routes.ts` | Routes | Edit (add detail route) |
| 8 | `apps/web/src/components/review/QuestionDisplay.tsx` | Organism | Create |
| 9 | `apps/web/src/components/review/ToulminPanel.tsx` | Organism | Create |
| 10 | `apps/web/src/components/review/ProvenancePanel.tsx` | Organism | Create |
| 11 | `apps/web/src/components/review/CriticScoreCard.tsx` | Organism | Create |
| 12 | `apps/web/src/components/review/DedupComparison.tsx` | Organism | Create |
| 13 | `apps/web/src/components/review/MetadataPanel.tsx` | Organism | Create |
| 14 | `apps/web/src/components/review/ValidationWarnings.tsx` | Molecule | Create |
| 15 | `apps/web/src/app/(dashboard)/faculty/review/[questionId]/page.tsx` | Page | Create |
| 16 | `apps/server/src/__tests__/review/review-detail.controller.test.ts` | Tests | Create |
| 17 | `apps/server/src/__tests__/review/review-detail.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-58 | faculty | Pending | Review queue page (navigate from queue to detail) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing for faculty layout |

### Cross-Epic Dependencies
| Story | Epic | Why |
|-------|------|-----|
| S-F-22-1 | E-22 (Critic Agent) | Critic scores and Toulmin argumentation data |
| S-F-21-3 | E-21 (Validation) | Dedup results |
| S-F-21-4 | E-21 (Validation) | Auto-tags with confidence scores |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for provenance traversal
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Mock question content
export const QUESTION_CONTENT = {
  id: "q-uuid-1",
  vignette: "A 55-year-old male with a history of hypertension...",
  stem: "Which of the following is the most appropriate initial diagnostic test?",
  answer_choices: [
    { index: 0, text: "Chest X-ray", is_correct: false },
    { index: 1, text: "12-lead ECG", is_correct: true },
    { index: 2, text: "CT pulmonary angiography", is_correct: false },
    { index: 3, text: "Troponin I level", is_correct: false },
    { index: 4, text: "D-dimer assay", is_correct: false },
  ],
  correct_answer_index: 1,
  rationale: "A 12-lead ECG is the most appropriate initial test...",
  question_type: "single_best_answer",
  difficulty: 0.65,
  bloom_level: "Apply",
};

// Mock critic scores with Toulmin
export const CRITIC_SCORES = {
  composite: 3.8,
  metrics: [
    {
      name: "clinical_accuracy",
      score: 4.2,
      justification: "The clinical scenario is medically accurate.",
      toulmin: {
        metric_name: "clinical_accuracy",
        claim: "The question presents a clinically accurate scenario",
        evidence: "Symptoms, history, and demographics are consistent with ACS",
        warrant: "ECG is guideline-recommended per AHA/ACC",
        backing: "2023 ACC/AHA guidelines",
        qualifier: "Assuming standard ED protocol",
        rebuttal: "Resource-limited settings might prioritize troponin",
      },
    },
  ],
};

// Mock provenance chain
export const PROVENANCE_CHAIN = {
  nodes: [
    { type: "Question" as const, id: "q-uuid-1", name: "Chest Pain Differential", relationship: "root" },
    { type: "Concept" as const, id: "concept-uuid-1", name: "Acute Coronary Syndrome", relationship: "TESTS_CONCEPT" },
    { type: "SLO" as const, id: "slo-uuid-1", name: "Diagnose ACS using initial workup", relationship: "MAPS_TO" },
    { type: "Course" as const, id: "course-uuid-1", name: "Cardiology 201", relationship: "OFFERS" },
  ],
  generation_method: "ai_generated" as const,
  pipeline_trace: ["concept_selection", "vignette_generation", "stem_generation"],
};

// Mock dedup result
export const DEDUP_FLAGGED = {
  similar_question_id: "q-uuid-existing-1",
  similarity_score: 0.87,
  stem_preview: "A 60-year-old female presents with chest pain...",
  flagged: true,
  rejected: false,
};

// Mock validation warning
export const VALIDATION_WARNING = {
  rule: "distractor_homogeneity",
  message: "Distractors vary in length; consider making them more uniform",
  severity: "warning" as const,
};

// Mock faculty user
export const REVIEWER_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/review-detail.controller.test.ts`

```
describe("ReviewDetailController")
  describe("GET /api/v1/review/questions/:questionId")
    > returns full review detail with question content
    > returns critic scores with composite and per-metric breakdown
    > returns Toulmin argumentation for each critic metric
    > returns provenance chain from Neo4j traversal
    > returns metadata with framework tags and confidence scores
    > returns dedup results when similar items flagged
    > returns empty dedup array when no similar items
    > returns validation warnings (non-blocking)
    > returns 404 for non-existent question
    > returns 403 for faculty not assigned to the course
    > returns 401 for unauthenticated request
```

**File:** `apps/server/src/__tests__/review/review-detail.service.test.ts`

```
describe("ReviewDetailService")
  describe("getDetail")
    > assembles data from Supabase questions table
    > fetches critic evaluations and maps to Toulmin structure
    > traverses Neo4j graph for provenance chain
    > handles missing dedup results gracefully
    > handles missing validation results gracefully
    > throws ReviewDetailError when question not found
```

**Total: ~17 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required individually. E2E for review workflow (queue -> detail -> action) will be 1 test when all review stories complete.

## 12. Acceptance Criteria

1. Full question display: vignette, stem, answer choices (correct highlighted), rationale
2. Toulmin argumentation panel with claim, evidence, warrant, backing, qualifier, rebuttal per metric
3. Critic score breakdown: 6 metrics with individual scores, justifications, and composite
4. Provenance panel shows chain: Question -> Concept -> SLO -> Course
5. Metadata panel with framework tags, Bloom level, difficulty, auto-tag confidence scores
6. Dedup results show similar items with similarity scores (side-by-side comparison if flagged)
7. Validation warnings displayed as non-blocking alerts
8. Responsive layout with collapsible panels
9. Scores color-coded: green (4-5), yellow (3-3.9), red (1-2.9)
10. All 17 API tests pass
11. TypeScript strict, named exports only, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| Toulmin argumentation key differentiator | S-F-23-2 SS Notes: "Toulmin panel is the key differentiator -- makes AI reasoning transparent and auditable" |
| Provenance from Neo4j traversal | S-F-23-2 SS Notes: "Provenance chain built from Neo4j graph traversal: Question -> Concept -> SLO -> Course" |
| Collapsible default state | S-F-23-2 SS Notes: "default state shows question + scores, expanded shows Toulmin + provenance" |
| Score color coding | S-F-23-2 SS Notes: "green (4-5), yellow (3-3.9), red (1-2.9)" |
| No hardcoded hex | ARCHITECTURE rules: "Design tokens only. No hardcoded hex/font/spacing values." |
| Cross-epic dependencies | S-F-23-2 SS Dependencies: "S-F-22-1 (critic scores), S-F-21-3 (dedup results), S-F-21-4 (tags)" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `critic_evaluations`, `dedup_results`, `validation_results` tables exist
- **Neo4j:** Running for provenance chain traversal
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-58 (Review Queue):** Must be complete (navigate from queue)
- **Critic Agent data:** `critic_evaluations` table populated with Toulmin data (from E-22)

## 15. Figma Make Prototype

```
Frame: Review Detail Page (1440x1200)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content (1200px, cream #f5f3ef)
  │   ├── Back Link: "< Back to Review Queue"
  │   ├── Header: Question title + StatusBadge + PriorityBadge
  │   ├── Two-Column Layout
  │   │   ├── Left Column (60%, vertical stack)
  │   │   │   ├── QuestionDisplay Card (white)
  │   │   │   │   ├── Vignette (italic, gray-700)
  │   │   │   │   ├── Stem (bold, navy deep)
  │   │   │   │   ├── Answer Choices (radio list, correct = green highlight)
  │   │   │   │   └── Rationale (collapsible, gray-600)
  │   │   │   ├── ToulminPanel Card (white, collapsible)
  │   │   │   │   ├── Header: "Toulmin Argumentation" + chevron
  │   │   │   │   └── Per metric: 6 labeled sections (Claim, Evidence, etc.)
  │   │   │   └── DedupComparison Card (white, conditional)
  │   │   │       ├── "Similar Item Found (87% match)"
  │   │   │       └── Side-by-side: current vs. similar
  │   │   └── Right Column (40%, vertical stack)
  │   │       ├── CriticScoreCard (white)
  │   │       │   ├── Composite: "3.8" (large, color-coded yellow)
  │   │       │   └── 6 metric bars with scores
  │   │       ├── MetadataPanel (white, collapsible)
  │   │       │   └── Tags, Bloom, Difficulty, USMLE fields
  │   │       ├── ProvenancePanel (white, collapsible)
  │   │       │   └── Vertical chain: Q → Concept → SLO → Course
  │   │       └── ValidationWarnings (amber alert box)
  │   └── Sticky Footer: ReviewActionBar + CommentThread
```
