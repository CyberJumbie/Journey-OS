# STORY-F-71 Brief: Exam Builder UI

## 0. Lane & Priority

```yaml
story_id: STORY-F-71
old_id: S-F-26-3
lane: faculty
lane_priority: 3
within_lane_order: 71
sprint: 29
size: L
depends_on:
  - STORY-F-65 (faculty) — Blueprint Definition Model (blueprint model)
  - STORY-F-70 (faculty) — Item Recommendation Engine (recommendations for left panel)
blocks:
  - STORY-F-73 — Cohort Assignment (exam must be built before assignment)
personas_served: [faculty]
epic: E-26 (Blueprint & Assembly Engine)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
```

## 1. Summary

Build a **drag-and-drop exam builder** at `/exams/builder/:blueprintId` with a live blueprint compliance meter. Faculty interactively assemble exams by dragging recommended items from a left panel into an exam sequence on the right panel. A live compliance meter shows real-time coverage percentage per dimension (USMLE system, discipline, Bloom level) with green/yellow/red indicators. The builder includes exam metadata form (title, time limit, passing score), autosave, undo/redo, and keyboard-accessible drag-and-drop.

This is the third story in E-26 (Blueprint & Assembly Engine): F-65 (blueprint) -> F-70 (recommendation) -> **F-71 (builder UI)** -> F-73 (assignment).

Key constraints:
- **@dnd-kit** for drag-and-drop (accessible, performant)
- Live compliance meter recalculates on every item add/remove (debounced)
- Autosave every 30 seconds with optimistic updates
- Undo/redo for item additions and removals
- Performance: smooth drag with 200+ items loaded
- Exam state stored in Supabase `exams` table with status = 'draft'
- DualWriteService: (Exam)-[:INCLUDES]->(Item) relationships in Neo4j

## 2. Task Breakdown

1. **Types** — Create `ExamDraft`, `ExamItem`, `ExamMetadata`, `ComplianceStatus`, `BuilderState` in `packages/types/src/exam/exam-builder.types.ts`
2. **Migration** — Create `exams` and `exam_items` tables in Supabase via MCP
3. **Error classes** — `ExamBuilderError`, `ExamDraftNotFoundError` in `apps/server/src/modules/exam/errors/builder.errors.ts`
4. **Service** — `ExamBuilderService` with `createDraft()`, `saveDraft()`, `getDraft()`, `addItem()`, `removeItem()`, `reorderItems()` methods
5. **Controller** — `ExamBuilderController` with `handleCreateDraft()`, `handleSaveDraft()`, `handleGetDraft()` methods
6. **Routes** — Protected CRUD routes under `/api/v1/exams/builder/` with RBAC
7. **Frontend page** — `/exams/builder/[blueprintId]/page.tsx`
8. **Frontend components** — `ItemRecommendationPanel`, `ExamSequencePanel`, `ComplianceMeter`, `ExamMetadataForm`
9. **Template** — `ExamBuilderTemplate` composing all panels
10. **API tests** — 12 tests covering draft CRUD, item add/remove/reorder, autosave
11. **E2E test** — 1 test for builder drag-and-drop flow

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/exam-builder.types.ts

/** Exam status in lifecycle */
export type ExamStatus = "draft" | "assigned" | "active" | "completed" | "archived";

/** Exam draft metadata */
export interface ExamMetadata {
  readonly title: string;
  readonly description?: string;
  readonly time_limit_minutes: number;
  readonly passing_score: number;            // percentage, e.g., 70
  readonly blueprint_id: string;
}

/** Item in exam sequence */
export interface ExamItem {
  readonly id: string;                       // exam_items.id
  readonly item_id: string;                  // reference to item bank item
  readonly position: number;                 // 1-based sequence order
  readonly stem_preview: string;
  readonly usmle_system: string;
  readonly discipline: string;
  readonly bloom_level: string;
  readonly difficulty: string;
}

/** Exam draft record */
export interface ExamDraft {
  readonly id: string;
  readonly blueprint_id: string;
  readonly created_by: string;
  readonly metadata: ExamMetadata;
  readonly items: readonly ExamItem[];
  readonly status: ExamStatus;
  readonly item_count: number;
  readonly estimated_time_minutes: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Compliance status per dimension */
export interface DimensionCompliance {
  readonly dimension: string;
  readonly label: string;
  readonly target_percentage: number;
  readonly actual_percentage: number;
  readonly status: "on_target" | "below" | "critical";  // green / yellow / red
}

/** Overall compliance meter data */
export interface ComplianceStatus {
  readonly overall_score: number;            // 0-100
  readonly dimensions: readonly DimensionCompliance[];
  readonly item_count: number;
  readonly target_count: number;
}

/** Builder state for undo/redo */
export interface BuilderAction {
  readonly type: "add" | "remove" | "reorder";
  readonly item_id: string;
  readonly position?: number;
  readonly previous_position?: number;
  readonly timestamp: string;
}

/** Save draft request */
export interface SaveDraftRequest {
  readonly metadata?: Partial<ExamMetadata>;
  readonly item_ids?: readonly string[];     // ordered list of item IDs
}

/** Create draft request */
export interface CreateDraftRequest {
  readonly blueprint_id: string;
  readonly title: string;
  readonly description?: string;
  readonly time_limit_minutes: number;
  readonly passing_score: number;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_exams_tables

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL,                -- references blueprints table (F-65)
  created_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
  passing_score INTEGER NOT NULL CHECK (passing_score BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'assigned', 'active', 'completed', 'archived')),
  item_count INTEGER NOT NULL DEFAULT 0,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_blueprint
  ON exams(blueprint_id);

CREATE INDEX IF NOT EXISTS idx_exams_created_by
  ON exams(created_by);

CREATE INDEX IF NOT EXISTS idx_exams_status
  ON exams(status);

CREATE INDEX IF NOT EXISTS idx_exams_institution
  ON exams(institution_id);

CREATE TABLE IF NOT EXISTS exam_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,                     -- references item bank items
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_items_exam_position
  ON exam_items(exam_id, position);

CREATE INDEX IF NOT EXISTS idx_exam_items_item
  ON exam_items(item_id);

-- RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can manage own exams"
  ON exams FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Faculty can manage exam items for own exams"
  ON exam_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exams WHERE exams.id = exam_items.exam_id AND exams.created_by = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/exams/builder (Auth: Faculty) — Create Draft

**Request Body:**
```json
{
  "blueprint_id": "bp-uuid-1",
  "title": "USMLE Step 1 Practice Exam",
  "description": "Spring 2026 practice exam",
  "time_limit_minutes": 180,
  "passing_score": 70
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "exam-uuid-1",
    "blueprint_id": "bp-uuid-1",
    "created_by": "faculty-uuid-1",
    "metadata": {
      "title": "USMLE Step 1 Practice Exam",
      "description": "Spring 2026 practice exam",
      "time_limit_minutes": 180,
      "passing_score": 70,
      "blueprint_id": "bp-uuid-1"
    },
    "items": [],
    "status": "draft",
    "item_count": 0,
    "estimated_time_minutes": 0,
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/exams/builder/:examId (Auth: Faculty) — Get Draft

**Success Response (200):**
```json
{
  "data": {
    "id": "exam-uuid-1",
    "blueprint_id": "bp-uuid-1",
    "metadata": { "title": "USMLE Step 1 Practice Exam", "time_limit_minutes": 180, "passing_score": 70, "blueprint_id": "bp-uuid-1" },
    "items": [
      { "id": "ei-1", "item_id": "item-uuid-5", "position": 1, "stem_preview": "A 65-year-old man...", "usmle_system": "Cardiovascular", "discipline": "Pathology", "bloom_level": "Apply", "difficulty": "medium" }
    ],
    "status": "draft",
    "item_count": 1,
    "estimated_time_minutes": 2,
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:05:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/exams/builder/:examId (Auth: Faculty) — Save Draft (autosave)

**Request Body:**
```json
{
  "metadata": { "title": "Updated Title" },
  "item_ids": ["item-uuid-5", "item-uuid-3", "item-uuid-8"]
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "exam-uuid-1",
    "status": "draft",
    "item_count": 3,
    "updated_at": "2026-02-19T12:10:00Z"
  },
  "error": null
}
```

### GET /api/v1/exams/builder/:examId/compliance (Auth: Faculty) — Live Compliance

**Success Response (200):**
```json
{
  "data": {
    "overall_score": 72.5,
    "dimensions": [
      { "dimension": "usmle_system", "label": "Cardiovascular", "target_percentage": 20, "actual_percentage": 18, "status": "below" },
      { "dimension": "usmle_system", "label": "Respiratory", "target_percentage": 15, "actual_percentage": 16, "status": "on_target" }
    ],
    "item_count": 50,
    "target_count": 100
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not exam owner |
| 400 | `VALIDATION_ERROR` | Invalid metadata, negative time limit, etc. |
| 404 | `NOT_FOUND` | Exam or blueprint not found |
| 409 | `CONFLICT` | Exam is not in 'draft' status |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/exams/builder/[blueprintId]` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/exams/builder/[blueprintId]/page.tsx`

**Component hierarchy:**
```
ExamBuilderPage (page.tsx — default export)
  └── ExamBuilderTemplate (template — DndContext provider)
        ├── ExamMetadataForm (top bar)
        │     ├── TitleInput
        │     ├── TimeLimitInput
        │     ├── PassingScoreInput
        │     └── SaveStatusIndicator ("Saved 30s ago" / "Saving...")
        ├── SplitPaneLayout (two-column)
        │     ├── ItemRecommendationPanel (left — droppable source)
        │     │     ├── SearchInput (text search for items)
        │     │     ├── FilterBar (system, discipline, Bloom, difficulty)
        │     │     └── RecommendedItemList (sortable, draggable cards)
        │     │           └── RecommendedItemCard (stem preview, badges, drag handle)
        │     └── ExamSequencePanel (right — droppable target)
        │           ├── ItemCountBadge ("50 / 100 items")
        │           ├── ExamItemList (sortable, draggable, reorderable)
        │           │     └── ExamItemRow (position, stem, system, remove button)
        │           └── EmptyState ("Drag items here to build your exam")
        └── ComplianceMeter (bottom bar — sticky)
              ├── OverallScoreBadge (0-100% with color)
              ├── DimensionBars (per-dimension progress bars)
              │     └── DimensionBar (label, target vs actual, green/yellow/red)
              └── UndoRedoButtons
```

**States:**
1. **Loading** — Skeleton layout while fetching blueprint and recommendations
2. **Empty** — Right panel empty, compliance at 0%, recommendation panel populated
3. **Building** — Items in both panels, live compliance updating
4. **Saving** — Autosave indicator active
5. **Compliant** — All dimensions green (>= 80% of target)
6. **Error** — Error toast with retry

**Drag-and-drop behavior:**
- Drag from left (recommendations) to right (exam sequence) to add
- Drag within right panel to reorder
- Drag from right panel to remove (or click X button)
- Keyboard: Tab to item, Space to pick up, Arrow keys to move, Space to drop

**Design tokens:**
- Compliance: Green `#69a338` (on target), Yellow `#f5a623` (below 80%), Red `#d32f2f` (below 60%)
- Drag overlay: Navy Deep `#002c76` border, slight shadow
- Surface: White `#ffffff` panels on Cream `#f5f3ef`
- Active drag item: elevated with shadow, slight scale
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/exam-builder.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add exam-builder export) |
| 3 | Supabase migration via MCP (exams + exam_items tables) | Database | Apply |
| 4 | `apps/server/src/modules/exam/errors/builder.errors.ts` | Errors | Create |
| 5 | `apps/server/src/modules/exam/services/exam-builder.service.ts` | Service | Create |
| 6 | `apps/server/src/modules/exam/controllers/exam-builder.controller.ts` | Controller | Create |
| 7 | `apps/server/src/modules/exam/routes/exam-builder.routes.ts` | Routes | Create |
| 8 | `apps/web/src/app/(dashboard)/exams/builder/[blueprintId]/page.tsx` | View | Create |
| 9 | `apps/web/src/components/exam/item-recommendation-panel.tsx` | Component | Create |
| 10 | `apps/web/src/components/exam/exam-sequence-panel.tsx` | Component | Create |
| 11 | `apps/web/src/components/exam/compliance-meter.tsx` | Component | Create |
| 12 | `apps/web/src/components/exam/exam-metadata-form.tsx` | Component | Create |
| 13 | `apps/web/src/components/templates/exam-builder-template.tsx` | Template | Create |
| 14 | `apps/server/src/modules/exam/__tests__/exam-builder.service.test.ts` | Tests | Create |
| 15 | `apps/server/src/modules/exam/__tests__/exam-builder.controller.test.ts` | Tests | Create |
| 16 | `apps/web/e2e/exam-builder.spec.ts` | E2E | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-65 | faculty | pending | Blueprint Definition Model — blueprint with targets for compliance meter |
| STORY-F-70 | faculty | pending | Item Recommendation Engine — recommendation API for left panel |

### NPM Packages
- `@dnd-kit/core` — Drag-and-drop core — **NEW, must install**
- `@dnd-kit/sortable` — Sortable preset — **NEW, must install**
- `@dnd-kit/utilities` — DnD utilities — **NEW, must install**
- `@supabase/supabase-js` — Supabase client (installed)
- `express` — Server framework (installed)
- `vitest` — Testing (installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Blueprint model from F-65
- Recommendation API from F-70

### Neo4j
- DualWriteService creates `(Exam)-[:INCLUDES]->(Item)` relationships in Neo4j after Supabase write.

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock blueprint
export const MOCK_BLUEPRINT = {
  id: "bp-uuid-1",
  name: "USMLE Step 1 Exam",
  total_question_count: 100,
  time_limit_minutes: 180,
  passing_score: 70,
};

// Mock exam draft
export const MOCK_EXAM_DRAFT = {
  id: "exam-uuid-1",
  blueprint_id: "bp-uuid-1",
  created_by: "faculty-uuid-1",
  title: "Spring 2026 Practice Exam",
  description: "",
  time_limit_minutes: 180,
  passing_score: 70,
  status: "draft" as const,
  item_count: 3,
  institution_id: "inst-uuid-1",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:05:00Z",
};

// Mock exam items
export const MOCK_EXAM_ITEMS = [
  { id: "ei-1", exam_id: "exam-uuid-1", item_id: "item-uuid-5", position: 1 },
  { id: "ei-2", exam_id: "exam-uuid-1", item_id: "item-uuid-3", position: 2 },
  { id: "ei-3", exam_id: "exam-uuid-1", item_id: "item-uuid-8", position: 3 },
];

// Valid create draft request
export const VALID_CREATE_DRAFT = {
  blueprint_id: "bp-uuid-1",
  title: "Spring 2026 Practice Exam",
  time_limit_minutes: 180,
  passing_score: 70,
};

// Valid save draft request (reorder)
export const VALID_SAVE_DRAFT = {
  item_ids: ["item-uuid-3", "item-uuid-5", "item-uuid-8"],
};

// Invalid: negative time limit
export const INVALID_CREATE_DRAFT = {
  blueprint_id: "bp-uuid-1",
  title: "",
  time_limit_minutes: -10,
  passing_score: 150,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/exam-builder.service.test.ts`

```
describe("ExamBuilderService")
  describe("createDraft")
    - creates exam draft with status 'draft'
    - stores blueprint_id and metadata
    - rejects missing title (validation)
    - rejects invalid time limit or passing score
  describe("saveDraft")
    - updates metadata fields
    - replaces item list with new ordered item_ids
    - updates item_count after save
    - rejects save on non-draft exam (409 CONFLICT)
  describe("getDraft")
    - returns exam with items in position order
    - throws ExamDraftNotFoundError for non-existent ID
  describe("addItem")
    - adds item at end of sequence
    - increments item_count
  describe("removeItem")
    - removes item and reorders remaining positions
    - decrements item_count
  describe("reorderItems")
    - updates positions for all items in new order
```

**File:** `apps/server/src/modules/exam/__tests__/exam-builder.controller.test.ts`

```
describe("ExamBuilderController")
  describe("handleCreateDraft")
    - creates draft and returns 201
    - rejects unauthenticated request (401)
    - rejects non-faculty role (403)
  describe("handleSaveDraft")
    - saves draft and returns 200
    - rejects save by non-owner (403)
  describe("handleGetDraft")
    - returns draft with items (200)
    - returns 404 for non-existent exam
```

**Total: ~18 tests** (12 service + 6 controller)

## 11. E2E Test Spec (Playwright -- YES)

**File:** `apps/web/e2e/exam-builder.spec.ts`

```
describe("Exam Builder")
  - faculty can create an exam draft from a blueprint
  - faculty can drag items from recommendations to exam sequence
  - compliance meter updates when items are added
  - faculty can reorder items via drag-and-drop
  - faculty can remove items from exam sequence
  - autosave triggers after 30 seconds of inactivity
```

**Total: ~6 E2E tests** (this is a critical user journey)

## 12. Acceptance Criteria

1. Exam builder page loads at `/exams/builder/:blueprintId`
2. Left panel shows recommended items with search and filter
3. Right panel shows exam item sequence with drag-and-drop reorder
4. Items can be dragged from recommendations to exam sequence
5. Live compliance meter shows real-time coverage per dimension
6. Visual indicators: green (on target), yellow (below), red (critical)
7. Exam metadata form: title, description, time limit, passing score
8. Save as draft functionality works
9. Item count and total time estimate displayed
10. Undo/redo for item additions and removals
11. Keyboard accessible drag-and-drop (a11y)
12. Performance: smooth drag with 200+ items loaded
13. Autosave every 30 seconds
14. All ~18 API tests pass
15. All ~6 E2E tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Drag-and-drop exam builder with compliance meter | S-F-26-3 § User Story |
| @dnd-kit for DnD | S-F-26-3 § Notes: "accessible, performant" |
| Compliance meter with green/yellow/red | S-F-26-3 § Acceptance Criteria |
| Autosave every 30 seconds | S-F-26-3 § Acceptance Criteria |
| Undo/redo | S-F-26-3 § Acceptance Criteria |
| DualWriteService for Exam-Item relationships | S-F-26-3 § Notes: "(Exam)-[:INCLUDES]->(Item)" |
| Exam state in Supabase exams table | S-F-26-3 § Notes: "status = 'draft'" |
| Blocks F-73 (cohort assignment) | S-F-26-3 § Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, blueprint table (from F-65), item bank tables (from F-64), `exams` and `exam_items` tables created by migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Optional — DualWrite creates Exam-Item relationships if available

## 15. Figma / Make Prototype

No Figma designs available. Build from component hierarchy above:
- Two-column split pane layout (40% left / 60% right)
- Bottom sticky compliance meter bar
- Top metadata form bar
- Use @dnd-kit examples for drag overlay styling
- shadcn/ui Card, Badge, Input, Button, Progress components
