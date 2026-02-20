# STORY-F-66 Brief: Item Detail View

## 0. Lane & Priority

```yaml
story_id: STORY-F-66
old_id: S-F-25-2
lane: faculty
lane_priority: 3
within_lane_order: 66
sprint: 18
size: M
depends_on:
  - STORY-F-64 (faculty) — Item Bank Browser Page (navigate from browser)
blocks: []
personas_served: [faculty]
epic: E-25 (Item Bank Browser & Export)
feature: F-11
user_flow: UF-17 (Item Bank Management)
```

## 1. Summary

Build an **item detail view** that shows complete information for a single question in the item bank: full question content, metadata, tags with confidence scores (editable), version history timeline, provenance chain (from Neo4j graph traversal), critic scores, and usage statistics. Faculty can inline-edit question fields, which creates a new version (preserving audit trail). Tag editing triggers DualWriteService to update both Supabase and Neo4j.

Key constraints:
- Version history stored in `question_versions` table with diff snapshots
- Provenance chain from Neo4j: Question -> Concept -> SLO -> Course
- Tag editing triggers DualWriteService (Supabase + Neo4j)
- Edit creates new version, not in-place update
- Usage statistics may be empty for new items (show placeholder)
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ItemDetail`, `ItemVersion`, `ItemUsageStats`, `TagEditRequest` in `packages/types/src/item-bank/`
2. **Service** -- `ItemDetailService` with `getDetail()`, `editQuestion()`, `editTags()`, `getVersionHistory()`
3. **Controller** -- `ItemDetailController` with GET detail, PUT edit, PUT tags, GET versions endpoints
4. **Routes** -- Register under `/api/v1/item-bank/:questionId`
5. **View -- ItemMetadataPanel** -- Metadata display with all fields
6. **View -- VersionTimeline** -- Timeline of changes (creation, edits, review actions, tag changes)
7. **View -- ItemTagEditor** -- Tag display with inline edit, confidence scores
8. **View -- Page** -- `page.tsx` for `/faculty/item-bank/[questionId]`
9. **API tests** -- 10 tests covering detail fetch, version history, tag editing, provenance
10. **Exports** -- Register types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/item-bank/detail.types.ts

/** Full item detail for the item bank */
export interface ItemDetail {
  readonly id: string;
  readonly vignette: string;
  readonly stem: string;
  readonly answer_choices: ItemAnswerChoice[];
  readonly correct_answer_index: number;
  readonly rationale: string;
  readonly question_type: string;
  readonly difficulty: number;
  readonly bloom_level: string;
  readonly usmle_system: string;
  readonly usmle_discipline: string;
  readonly course_id: string;
  readonly course_name: string;
  readonly tags: ItemTag[];
  readonly critic_scores: ItemCriticScores;
  readonly provenance: ItemProvenance;
  readonly usage_stats: ItemUsageStats;
  readonly version: number;
  readonly status: string;
  readonly generation_method: "ai_generated" | "imported" | "manual";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Answer choice */
export interface ItemAnswerChoice {
  readonly index: number;
  readonly text: string;
  readonly is_correct: boolean;
}

/** Tag with confidence and editability */
export interface ItemTag {
  readonly id: string;
  readonly tag: string;
  readonly confidence: number;
  readonly source: "auto" | "manual";
}

/** Critic scores summary */
export interface ItemCriticScores {
  readonly composite: number;
  readonly metrics: { name: string; score: number }[];
}

/** Provenance chain */
export interface ItemProvenance {
  readonly nodes: ItemProvenanceNode[];
  readonly generation_method: "ai_generated" | "imported" | "manual";
}

export interface ItemProvenanceNode {
  readonly type: string;
  readonly id: string;
  readonly name: string;
  readonly relationship: string;
}

/** Usage statistics */
export interface ItemUsageStats {
  readonly times_used_in_exams: number;
  readonly avg_correct_rate: number | null;
  readonly avg_time_seconds: number | null;
  readonly last_used_at: string | null;
}

/** Version history entry */
export interface ItemVersion {
  readonly version: number;
  readonly change_type: "created" | "edited" | "reviewed" | "tag_change" | "imported";
  readonly change_summary: string;
  readonly changed_by_id: string;
  readonly changed_by_name: string;
  readonly diff: Record<string, { old: unknown; new: unknown }> | null;
  readonly created_at: string;
}

/** Edit question request (creates new version) */
export interface EditQuestionRequest {
  readonly vignette?: string;
  readonly stem?: string;
  readonly answer_choices?: ItemAnswerChoice[];
  readonly correct_answer_index?: number;
  readonly rationale?: string;
  readonly change_summary: string;
}

/** Edit tags request */
export interface EditTagsRequest {
  readonly add?: string[];
  readonly remove?: string[];
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_question_versions_table

CREATE TABLE IF NOT EXISTS question_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'edited', 'reviewed', 'tag_change', 'imported')),
  change_summary TEXT NOT NULL DEFAULT '',
  changed_by UUID NOT NULL REFERENCES profiles(id),
  diff JSONB,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, version)
);

CREATE INDEX idx_question_versions_question ON question_versions(question_id, version DESC);
CREATE INDEX idx_question_versions_changed_by ON question_versions(changed_by);

-- Usage statistics table (may be empty for new questions)
CREATE TABLE IF NOT EXISTS question_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE UNIQUE,
  times_used_in_exams INTEGER NOT NULL DEFAULT 0,
  avg_correct_rate NUMERIC(5,4),
  avg_time_seconds NUMERIC(8,2),
  last_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_usage_question ON question_usage_stats(question_id);

-- RLS
ALTER TABLE question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view versions for accessible questions"
  ON question_versions FOR SELECT
  USING (
    question_id IN (
      SELECT id FROM questions WHERE course_id IN (
        SELECT course_id FROM course_assignments WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Faculty can view usage stats for accessible questions"
  ON question_usage_stats FOR SELECT
  USING (
    question_id IN (
      SELECT id FROM questions WHERE course_id IN (
        SELECT course_id FROM course_assignments WHERE user_id = auth.uid()
      )
    )
  );
```

## 5. API Contract (complete request/response)

### GET /api/v1/item-bank/:questionId (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "id": "q-uuid-1",
    "vignette": "A 55-year-old male with a history of hypertension...",
    "stem": "Which of the following is the most appropriate initial diagnostic test?",
    "answer_choices": [
      { "index": 0, "text": "Chest X-ray", "is_correct": false },
      { "index": 1, "text": "12-lead ECG", "is_correct": true },
      { "index": 2, "text": "CT pulmonary angiography", "is_correct": false },
      { "index": 3, "text": "Troponin I level", "is_correct": false },
      { "index": 4, "text": "D-dimer assay", "is_correct": false }
    ],
    "correct_answer_index": 1,
    "rationale": "A 12-lead ECG is the most appropriate initial test...",
    "question_type": "single_best_answer",
    "difficulty": 0.65,
    "bloom_level": "Apply",
    "usmle_system": "Cardiovascular",
    "usmle_discipline": "Medicine",
    "course_id": "course-uuid-1",
    "course_name": "Cardiology 201",
    "tags": [
      { "id": "tag-uuid-1", "tag": "acute_coronary_syndrome", "confidence": 0.95, "source": "auto" },
      { "id": "tag-uuid-2", "tag": "emergency_medicine", "confidence": 0.88, "source": "auto" }
    ],
    "critic_scores": {
      "composite": 3.8,
      "metrics": [
        { "name": "clinical_accuracy", "score": 4.2 },
        { "name": "stem_clarity", "score": 3.5 }
      ]
    },
    "provenance": {
      "nodes": [
        { "type": "Question", "id": "q-uuid-1", "name": "Chest Pain Differential", "relationship": "root" },
        { "type": "Concept", "id": "concept-uuid-1", "name": "Acute Coronary Syndrome", "relationship": "TESTS_CONCEPT" },
        { "type": "SLO", "id": "slo-uuid-1", "name": "Diagnose ACS", "relationship": "MAPS_TO" },
        { "type": "Course", "id": "course-uuid-1", "name": "Cardiology 201", "relationship": "OFFERS" }
      ],
      "generation_method": "ai_generated"
    },
    "usage_stats": {
      "times_used_in_exams": 3,
      "avg_correct_rate": 0.72,
      "avg_time_seconds": 95.5,
      "last_used_at": "2026-02-10T14:00:00Z"
    },
    "version": 2,
    "status": "approved",
    "generation_method": "ai_generated",
    "created_at": "2026-02-15T10:00:00Z",
    "updated_at": "2026-02-18T10:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/item-bank/:questionId/versions (Auth: faculty)

**Success Response (200):**
```json
{
  "data": [
    {
      "version": 2,
      "change_type": "edited",
      "change_summary": "Updated vignette timeline for clarity",
      "changed_by_id": "faculty-uuid-1",
      "changed_by_name": "Dr. Jones",
      "diff": {
        "vignette": {
          "old": "A 55-year-old male presents...",
          "new": "A 55-year-old male with a 3-day history presents..."
        }
      },
      "created_at": "2026-02-18T10:00:00Z"
    },
    {
      "version": 1,
      "change_type": "created",
      "change_summary": "AI-generated question for Cardiology 201",
      "changed_by_id": "system",
      "changed_by_name": "System",
      "diff": null,
      "created_at": "2026-02-15T10:00:00Z"
    }
  ],
  "error": null
}
```

### PUT /api/v1/item-bank/:questionId (Auth: faculty)

**Request Body:**
```json
{
  "vignette": "A 55-year-old male with a 3-day history of chest pain...",
  "change_summary": "Updated vignette timeline for clarity"
}
```

**Success Response (200):** Returns updated `ItemDetail` with incremented version.

### PUT /api/v1/item-bank/:questionId/tags (Auth: faculty)

**Request Body:**
```json
{
  "add": ["cardiology_acute"],
  "remove": ["emergency_medicine"]
}
```

**Success Response (200):**
```json
{
  "data": {
    "question_id": "q-uuid-1",
    "tags": [
      { "id": "tag-uuid-1", "tag": "acute_coronary_syndrome", "confidence": 0.95, "source": "auto" },
      { "id": "tag-uuid-3", "tag": "cardiology_acute", "confidence": 1.0, "source": "manual" }
    ]
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 400 | `VALIDATION_ERROR` | Invalid edit fields |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not in question's course |
| 404 | `NOT_FOUND` | Question not found |
| 500 | `INTERNAL_ERROR` | Unexpected error |

## 6. Frontend Spec

### Page: `/faculty/item-bank/[questionId]`

**File:** `apps/web/src/app/(dashboard)/faculty/item-bank/[questionId]/page.tsx`

```
ItemDetailPage
  ├── Breadcrumb: "Item Bank > Cardiology 201 > Q-uuid-1"
  ├── PageHeader (question title + status badge + version badge)
  ├── MainContent (two-column layout)
  │   ├── LeftColumn (60%)
  │   │   ├── QuestionDisplay (organism) — vignette, stem, choices, rationale
  │   │   │   ├── EditButton (atom) — "Edit Question" toggles inline editing
  │   │   │   └── InlineEditForm (molecule) — textarea fields, save/cancel
  │   │   └── VersionTimeline (organism)
  │   │       └── TimelineItem (molecule) — version #, change type badge, summary, author, date
  │   └── RightColumn (40%)
  │       ├── ItemMetadataPanel (organism)
  │       │   ├── QuestionType, Difficulty, Bloom Level
  │       │   ├── USMLE System, Discipline
  │       │   └── Generation Method badge
  │       ├── ItemTagEditor (organism)
  │       │   ├── TagList (molecule) — tags with confidence, remove button
  │       │   └── AddTagInput (molecule) — autocomplete input
  │       ├── CriticScoresSummary (molecule) — composite + metric list
  │       ├── ProvenancePanel (organism) — chain display
  │       └── UsageStats (molecule) — times used, avg correct rate, avg time
  │           └── EmptyState: "No usage data yet" (for new items)
```

**Design tokens:**
- Version badge: `--color-primary-navy` (#002c76)
- Tag chip: `--color-primary-navy-light`
- Manual tag chip: `--color-success` (green)
- Auto tag chip: `--color-info` (blue)
- Edit mode border: `--color-warning` (amber dashed)
- Panel background: `--color-surface-white` (#ffffff)
- Page background: `--color-bg-cream` (#f5f3ef)

**States:**
1. **Loading** -- Skeleton panels
2. **View mode** -- Read-only display of all panels
3. **Edit mode** -- Inline editing active, save/cancel buttons visible
4. **Tag editing** -- Add/remove tags with autocomplete
5. **Saving** -- Spinner on save button, optimistic version increment
6. **No usage data** -- Usage stats placeholder for new items

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/item-bank/detail.types.ts` | Types | Create |
| 2 | `packages/types/src/item-bank/index.ts` | Types | Edit (add detail export) |
| 3 | Supabase migration via MCP (question_versions + usage_stats tables) | Database | Apply |
| 4 | `apps/server/src/services/item-bank/item-detail.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/item-bank/item-detail.controller.ts` | Controller | Create |
| 6 | `apps/server/src/routes/item-bank.routes.ts` | Routes | Edit (add detail routes) |
| 7 | `apps/web/src/components/item-bank/ItemMetadataPanel.tsx` | Organism | Create |
| 8 | `apps/web/src/components/item-bank/VersionTimeline.tsx` | Organism | Create |
| 9 | `apps/web/src/components/item-bank/ItemTagEditor.tsx` | Organism | Create |
| 10 | `apps/web/src/app/(dashboard)/faculty/item-bank/[questionId]/page.tsx` | Page | Create |
| 11 | `apps/server/src/__tests__/item-bank/item-detail.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-64 | faculty | Pending | Item bank browser exists (navigate from browser to detail) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/services/dual-write.service.ts` -- DualWriteService for tag editing
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for provenance traversal
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class

## 9. Test Fixtures (inline)

```typescript
// Full item detail
export const ITEM_DETAIL = {
  id: "q-uuid-1",
  vignette: "A 55-year-old male with a history of hypertension...",
  stem: "Which of the following is the most appropriate initial diagnostic test?",
  answer_choices: [
    { index: 0, text: "Chest X-ray", is_correct: false },
    { index: 1, text: "12-lead ECG", is_correct: true },
  ],
  correct_answer_index: 1,
  rationale: "A 12-lead ECG is the most appropriate initial test...",
  question_type: "single_best_answer",
  difficulty: 0.65,
  bloom_level: "Apply",
  usmle_system: "Cardiovascular",
  usmle_discipline: "Medicine",
  course_id: "course-uuid-1",
  course_name: "Cardiology 201",
  tags: [
    { id: "tag-uuid-1", tag: "acute_coronary_syndrome", confidence: 0.95, source: "auto" as const },
  ],
  critic_scores: { composite: 3.8, metrics: [{ name: "clinical_accuracy", score: 4.2 }] },
  provenance: {
    nodes: [
      { type: "Question", id: "q-uuid-1", name: "Chest Pain", relationship: "root" },
      { type: "Concept", id: "c-uuid-1", name: "ACS", relationship: "TESTS_CONCEPT" },
    ],
    generation_method: "ai_generated" as const,
  },
  usage_stats: { times_used_in_exams: 3, avg_correct_rate: 0.72, avg_time_seconds: 95.5, last_used_at: "2026-02-10T14:00:00Z" },
  version: 2,
  status: "approved",
  generation_method: "ai_generated" as const,
  created_at: "2026-02-15T10:00:00Z",
  updated_at: "2026-02-18T10:00:00Z",
};

// Version history
export const VERSION_HISTORY = [
  {
    version: 2,
    change_type: "edited" as const,
    change_summary: "Updated vignette timeline",
    changed_by_id: "faculty-uuid-1",
    changed_by_name: "Dr. Jones",
    diff: { vignette: { old: "A 55-year-old male presents...", new: "A 55-year-old male with a 3-day history..." } },
    created_at: "2026-02-18T10:00:00Z",
  },
  {
    version: 1,
    change_type: "created" as const,
    change_summary: "AI-generated question",
    changed_by_id: "system",
    changed_by_name: "System",
    diff: null,
    created_at: "2026-02-15T10:00:00Z",
  },
];

// New item with no usage stats
export const NEW_ITEM_USAGE = {
  times_used_in_exams: 0,
  avg_correct_rate: null,
  avg_time_seconds: null,
  last_used_at: null,
};

// Faculty user
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/item-bank/item-detail.test.ts`

```
describe("ItemDetailController")
  describe("GET /api/v1/item-bank/:questionId")
    > returns full item detail with all panels
    > includes provenance chain from Neo4j traversal
    > includes tags with confidence scores
    > returns usage_stats with null values for new items
    > returns 404 for non-existent question

  describe("PUT /api/v1/item-bank/:questionId")
    > creates new version on edit (does not overwrite)
    > increments version number
    > stores diff between old and new values
    > returns 403 for faculty not in question's course

  describe("GET /api/v1/item-bank/:questionId/versions")
    > returns version history ordered by version desc

  describe("PUT /api/v1/item-bank/:questionId/tags")
    > adds new tags with manual source
    > removes existing tags
    > triggers DualWriteService for Neo4j sync
```

**Total: ~12 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Item detail is navigable from the browser page; E2E will be part of the item bank browser E2E (STORY-F-64).

## 12. Acceptance Criteria

1. Full question display: vignette, stem, answer choices, correct answer, rationale
2. Metadata panel: question type, difficulty, Bloom level, USMLE system, discipline
3. Tags panel with confidence scores, editable (add/remove)
4. Version history timeline showing all changes
5. Provenance panel from Neo4j graph traversal
6. Critic scores with composite and per-metric
7. Usage statistics (or placeholder for new items)
8. Inline editing creates new version (preserves audit trail)
9. Tag editing triggers DualWriteService
10. All 12 API tests pass
11. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Provenance from Neo4j | S-F-25-2 SS Notes: "Provenance chain fetched from Neo4j graph traversal: Question -> Concept -> SLO -> Course" |
| Version history in question_versions | S-F-25-2 SS Notes: "Version history stored in Supabase question_versions table with diff snapshots" |
| Tag editing DualWrite | S-F-25-2 SS Notes: "Tag editing triggers DualWriteService to update both Supabase and Neo4j" |
| Edit creates new version | S-F-25-2 SS Notes: "Edit creates a new version, not an in-place update -- preserves audit trail" |
| Usage stats placeholder | S-F-25-2 SS Notes: "Usage statistics may be empty for newly created items -- show placeholder" |
| Breadcrumb navigation | S-F-25-2 SS Notes: "Consider breadcrumb navigation: Item Bank > [Course] > [Question ID]" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `profiles`, `courses` tables exist
- **Neo4j:** Running for provenance chain traversal
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-64 (Item Bank Browser):** Must be complete (navigate from browser)
- **DualWriteService:** Must exist for tag editing sync

## 15. Figma Make Prototype

```
Frame: Item Detail Page (1440x1100)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content (1200px, cream #f5f3ef)
  │   ├── Breadcrumb: "Item Bank > Cardiology 201 > Q-uuid-1"
  │   ├── Header: Title + StatusBadge("approved") + VersionBadge("v2")
  │   ├── Two-Column Layout
  │   │   ├── Left Column (60%)
  │   │   │   ├── QuestionDisplay Card (white)
  │   │   │   │   ├── Vignette (italic)
  │   │   │   │   ├── Stem (bold)
  │   │   │   │   ├── Choices (correct = green highlight)
  │   │   │   │   ├── Rationale (collapsible)
  │   │   │   │   └── EditButton: "Edit Question" (top right)
  │   │   │   └── VersionTimeline Card (white)
  │   │   │       ├── v2: "Edited — Updated vignette timeline — Dr. Jones — Feb 18"
  │   │   │       └── v1: "Created — AI-generated question — System — Feb 15"
  │   │   └── Right Column (40%)
  │   │       ├── Metadata Card (white)
  │   │       ├── Tags Card (white) — chips with confidence %, add input
  │   │       ├── Critic Scores Card (white) — composite + bars
  │   │       ├── Provenance Card (white) — vertical chain
  │   │       └── Usage Stats Card (white) — or "No usage data yet"
```
