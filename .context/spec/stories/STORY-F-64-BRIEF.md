# STORY-F-64 Brief: Item Bank Browser Page

## 0. Lane & Priority

```yaml
story_id: STORY-F-64
old_id: S-F-25-1
lane: faculty
lane_priority: 3
within_lane_order: 64
sprint: 18
size: L
depends_on:
  - STORY-F-54 (faculty) — Auto-tagging (tags exist for filtering)
  - STORY-F-61 (faculty) — Review Actions (approved items exist in bank)
blocks:
  - STORY-F-65 — Blueprint Definition Model (needs item bank)
  - STORY-F-66 — Item Detail View (navigates from browser)
  - STORY-F-67 — Export Service (selects items from browser)
personas_served: [faculty]
epic: E-25 (Item Bank Browser & Export)
feature: F-11
user_flow: UF-17 (Item Bank Management)
```

## 1. Summary

Build a **searchable item bank browser** with advanced filtering that lets faculty find, review, and manage approved questions across their courses. The browser supports two search modes: full-text search via Supabase `tsvector` index on stem/vignette/rationale columns, and semantic search via pgvector cosine similarity on stored 1024-dim Voyage AI embeddings. The UI offers table/card view toggle, advanced filters (course, question type, Bloom level, difficulty, USMLE system, discipline, tags, date range, status), bulk selection for batch operations, quick preview via shadcn/ui Sheet, and bookmark/favorite functionality. Filter state is persisted in URL query params for shareable filtered views.

Key constraints:
- Full-text search: `tsvector` on stem + vignette + rationale
- Semantic search: pgvector cosine similarity, 1024-dim Voyage AI embeddings
- Table/card view toggle
- Bulk selection for export, tag, archive
- Quick preview via shadcn/ui Sheet (side panel)
- Bookmark stored in `user_bookmarks` table
- Filter state in URL query params
- Custom error class: `ItemBankQueryError`
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ItemBankItem`, `ItemBankFilters`, `ItemBankSearchMode`, `BookmarkRequest` in `packages/types/src/item-bank/`
2. **Error classes** -- `ItemBankQueryError` in `apps/server/src/errors/item-bank.errors.ts`
3. **Repository** -- `ItemBankRepository` with full-text and semantic search, filtered paginated queries
4. **Service -- ItemBankBrowserService** -- `list()`, `search()`, `bookmark()`, `unbookmark()`, bulk operations
5. **Service -- ItemSearchService** -- `textSearch()`, `semanticSearch()`, embedding query construction
6. **Controller** -- `ItemBankController` with GET list/search, POST bookmark, DELETE bookmark endpoints
7. **Routes** -- Register under `/api/v1/item-bank`
8. **View -- ItemBankTable** -- DataTable with sortable columns and bulk select
9. **View -- ItemBankFilters** -- Advanced filter panel with all filter types
10. **View -- ItemPreviewCard** -- shadcn/ui Sheet for quick preview
11. **View -- SemanticSearchInput** -- Search input with toggle between text/semantic mode
12. **View -- Page** -- `page.tsx` for `/faculty/item-bank`
13. **API tests** -- 15 tests covering text search, semantic search, filters, sorting, pagination, bulk, bookmark
14. **E2E tests** -- 2 tests: search flow, filter + export flow
15. **Exports** -- Register types and error class in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/item-bank/browser.types.ts

/** Item bank entry for list/search results */
export interface ItemBankItem {
  readonly id: string;
  readonly stem_preview: string;
  readonly vignette_preview: string;
  readonly question_type: string;
  readonly course_id: string;
  readonly course_name: string;
  readonly bloom_level: string;
  readonly difficulty: number;
  readonly usmle_system: string;
  readonly usmle_discipline: string;
  readonly tags: string[];
  readonly critic_composite_score: number;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly is_bookmarked: boolean;
  readonly import_batch_id: string | null;
}

/** Filters for item bank queries */
export interface ItemBankFilters {
  readonly course_id?: string;
  readonly question_type?: string;
  readonly bloom_level?: string;
  readonly difficulty_min?: number;
  readonly difficulty_max?: number;
  readonly usmle_system?: string;
  readonly usmle_discipline?: string;
  readonly tags?: string[];
  readonly date_from?: string;
  readonly date_to?: string;
  readonly status?: string;
  readonly import_batch_id?: string;
}

// packages/types/src/item-bank/search.types.ts

/** Search mode */
export type SearchMode = "text" | "semantic";

/** Search request */
export interface ItemBankSearchRequest {
  readonly query: string;
  readonly mode: SearchMode;
  readonly filters?: ItemBankFilters;
  readonly page?: number;
  readonly page_size?: number;
  readonly sort_by?: ItemBankSortField;
  readonly sort_dir?: "asc" | "desc";
}

/** Sort fields */
export type ItemBankSortField = "created_at" | "difficulty" | "bloom_level" | "critic_composite_score" | "course_name";

/** Search result with relevance */
export interface ItemBankSearchResult extends ItemBankItem {
  readonly relevance_score?: number;
  readonly similarity_score?: number;
}

/** Paginated search response */
export interface ItemBankListResponse {
  readonly items: ItemBankSearchResult[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
  readonly total_pages: number;
  readonly search_mode?: SearchMode;
}

/** Bookmark request */
export interface BookmarkRequest {
  readonly question_id: string;
}

/** Bulk operation request */
export interface BulkOperationRequest {
  readonly question_ids: string[];
  readonly operation: "export" | "tag" | "archive";
  readonly metadata?: Record<string, unknown>;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_item_bank_infrastructure

-- User bookmarks table
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_question ON user_bookmarks(question_id);

-- Full-text search index on questions
-- tsvector column for stem + vignette + rationale
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(stem, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(vignette, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(rationale, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_questions_search_vector
  ON questions USING GIN(search_vector);

-- pgvector index for semantic search (1024-dim Voyage AI)
-- Assumes embedding column already exists from prior story
CREATE INDEX IF NOT EXISTS idx_questions_embedding_hnsw
  ON questions USING hnsw(embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_questions_course_status
  ON questions(course_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_bloom_difficulty
  ON questions(bloom_level, difficulty);

CREATE INDEX IF NOT EXISTS idx_questions_usmle_system
  ON questions(usmle_system);

-- RLS
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookmarks"
  ON user_bookmarks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## 5. API Contract (complete request/response)

### GET /api/v1/item-bank (Auth: faculty, institutional_admin, superadmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | - | Search query (text or semantic) |
| mode | string | text | Search mode: text or semantic |
| page | number | 1 | Page number |
| page_size | number | 20 | Items per page (max 100) |
| course_id | string | - | Filter by course |
| question_type | string | - | Filter by type |
| bloom_level | string | - | Filter by Bloom level |
| difficulty_min | number | - | Min difficulty (0-1) |
| difficulty_max | number | - | Max difficulty (0-1) |
| usmle_system | string | - | USMLE system filter |
| usmle_discipline | string | - | USMLE discipline filter |
| tags | string | - | Comma-separated tag names |
| date_from | string | - | ISO date |
| date_to | string | - | ISO date |
| status | string | approved | Status filter |
| import_batch_id | string | - | Filter by import batch |
| sort_by | string | created_at | Sort field |
| sort_dir | string | desc | asc or desc |

**Success Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "q-uuid-1",
        "stem_preview": "Which of the following is the most appropriate initial diagnostic test?",
        "vignette_preview": "A 55-year-old male with a history of hypertension...",
        "question_type": "single_best_answer",
        "course_id": "course-uuid-1",
        "course_name": "Cardiology 201",
        "bloom_level": "Apply",
        "difficulty": 0.65,
        "usmle_system": "Cardiovascular",
        "usmle_discipline": "Medicine",
        "tags": ["acute_coronary_syndrome", "emergency_medicine"],
        "critic_composite_score": 3.8,
        "status": "approved",
        "created_at": "2026-02-18T10:00:00Z",
        "updated_at": "2026-02-18T10:00:00Z",
        "is_bookmarked": true,
        "import_batch_id": null,
        "relevance_score": 0.92,
        "similarity_score": null
      }
    ],
    "total": 245,
    "page": 1,
    "page_size": 20,
    "total_pages": 13,
    "search_mode": "text"
  },
  "error": null
}
```

### POST /api/v1/item-bank/bookmarks (Auth: faculty)

**Request Body:**
```json
{ "question_id": "q-uuid-1" }
```

**Success Response (201):**
```json
{
  "data": { "question_id": "q-uuid-1", "bookmarked_at": "2026-02-19T14:30:00Z" },
  "error": null
}
```

### DELETE /api/v1/item-bank/bookmarks/:questionId (Auth: faculty)

**Success Response (200):**
```json
{
  "data": { "question_id": "q-uuid-1", "removed": true },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200/201 | - | Success |
| 400 | `VALIDATION_ERROR` | Invalid filter params or search query |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Question not found (for bookmark) |
| 500 | `ITEM_BANK_QUERY_ERROR` | Search or query failure |

## 6. Frontend Spec

### Page: `/faculty/item-bank`

**File:** `apps/web/src/app/(dashboard)/faculty/item-bank/page.tsx`

```
ItemBankBrowserPage
  ├── PageHeader ("Item Bank")
  ├── SearchBar (organism)
  │   ├── SemanticSearchInput (molecule)
  │   │   ├── TextInput (atom) — search query
  │   │   ├── ModeToggle (atom) — "Text" | "Semantic" toggle
  │   │   └── SearchButton (atom)
  │   └── ViewToggle (atom) — Table | Card view toggle
  ├── ItemBankFilters (organism)
  │   ├── CourseFilter (molecule)
  │   ├── QuestionTypeFilter (molecule)
  │   ├── BloomLevelFilter (molecule)
  │   ├── DifficultyRange (molecule) — slider min/max
  │   ├── USMLESystemFilter (molecule)
  │   ├── USMLEDisciplineFilter (molecule)
  │   ├── TagFilter (molecule) — multi-select
  │   ├── DateRangeFilter (molecule)
  │   ├── ActiveFilterChips (molecule) — with clear-all
  │   └── ResultCount (atom) — "245 items found"
  ├── BulkActionBar (molecule) — appears on selection
  │   ├── SelectionCount: "12 selected"
  │   ├── ExportButton (atom)
  │   ├── TagButton (atom)
  │   └── ArchiveButton (atom)
  ├── ItemBankTable (organism) — table view
  │   ├── DataTable (shadcn/ui) with sortable columns
  │   ├── BookmarkStar (atom) — toggle per row
  │   └── Pagination controls
  ├── ItemBankGrid (organism) — card view
  │   └── ItemCard (molecule) — stem preview, tags, score, bookmark
  └── ItemPreviewSheet (organism) — shadcn/ui Sheet
      └── Full question display in side panel
```

**Design tokens:**
- Semantic search mode indicator: `--color-primary-navy` (#002c76)
- Bookmark star active: `--color-warning` (amber)
- Card background: `--color-surface-white` (#ffffff)
- Page background: `--color-bg-cream` (#f5f3ef)
- Filter chip: `--color-primary-navy-light`

**States:**
1. **Loading** -- Skeleton table/cards while searching
2. **Results** -- Items displayed in chosen view mode
3. **Empty search** -- "No items match your search" with suggestions
4. **Semantic searching** -- Special loading indicator for embedding query
5. **Preview open** -- Side Sheet visible with full question
6. **Bulk selected** -- Bulk action bar visible at bottom

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/item-bank/browser.types.ts` | Types | Create |
| 2 | `packages/types/src/item-bank/search.types.ts` | Types | Create |
| 3 | `packages/types/src/item-bank/index.ts` | Types | Create |
| 4 | `packages/types/src/index.ts` | Types | Edit (add item-bank export) |
| 5 | `apps/server/src/errors/item-bank.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 7 | Supabase migration via MCP (bookmarks, tsvector, hnsw index) | Database | Apply |
| 8 | `apps/server/src/repositories/item-bank.repository.ts` | Repository | Create |
| 9 | `apps/server/src/services/item-bank/item-bank-browser.service.ts` | Service | Create |
| 10 | `apps/server/src/services/item-bank/item-search.service.ts` | Service | Create |
| 11 | `apps/server/src/controllers/item-bank/item-bank.controller.ts` | Controller | Create |
| 12 | `apps/server/src/routes/item-bank.routes.ts` | Routes | Create |
| 13 | `apps/server/src/routes/index.ts` | Routes | Edit (register item-bank routes) |
| 14 | `apps/web/src/components/item-bank/SemanticSearchInput.tsx` | Molecule | Create |
| 15 | `apps/web/src/components/item-bank/ItemBankFilters.tsx` | Organism | Create |
| 16 | `apps/web/src/components/item-bank/ItemBankTable.tsx` | Organism | Create |
| 17 | `apps/web/src/components/item-bank/ItemPreviewCard.tsx` | Organism | Create |
| 18 | `apps/web/src/app/(dashboard)/faculty/item-bank/page.tsx` | Page | Create |
| 19 | `apps/server/src/__tests__/item-bank/item-bank-browser.test.ts` | Tests | Create |
| 20 | `apps/server/src/__tests__/item-bank/item-search.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-54 | faculty | Pending | Auto-tags must exist for tag filtering |
| STORY-F-61 | faculty | Pending | Review actions must be complete (approved items in bank) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing |

### NPM Packages
- `@tanstack/react-table` -- DataTable foundation
- None additional for pgvector (uses Supabase RPC)

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/config/supabase.config.ts` -- Supabase client for full-text + pgvector queries
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class

## 9. Test Fixtures (inline)

```typescript
// Mock approved item bank items
export const APPROVED_QUESTION_1 = {
  id: "q-uuid-1",
  stem_preview: "Which of the following is the most appropriate initial diagnostic test?",
  vignette_preview: "A 55-year-old male with a history of hypertension...",
  question_type: "single_best_answer",
  course_id: "course-uuid-1",
  course_name: "Cardiology 201",
  bloom_level: "Apply",
  difficulty: 0.65,
  usmle_system: "Cardiovascular",
  usmle_discipline: "Medicine",
  tags: ["acute_coronary_syndrome", "emergency_medicine"],
  critic_composite_score: 3.8,
  status: "approved",
  created_at: "2026-02-18T10:00:00Z",
  updated_at: "2026-02-18T10:00:00Z",
  is_bookmarked: false,
  import_batch_id: null,
};

export const APPROVED_QUESTION_2 = {
  ...APPROVED_QUESTION_1,
  id: "q-uuid-2",
  stem_preview: "What is the mechanism of action of metformin?",
  vignette_preview: "A 45-year-old female newly diagnosed with T2DM...",
  course_name: "Pharmacology 301",
  bloom_level: "Understand",
  difficulty: 0.45,
  usmle_system: "Endocrine",
  tags: ["diabetes", "pharmacology"],
  is_bookmarked: true,
};

// Mock search results
export const TEXT_SEARCH_RESULTS = {
  items: [{ ...APPROVED_QUESTION_1, relevance_score: 0.92 }],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
  search_mode: "text" as const,
};

export const SEMANTIC_SEARCH_RESULTS = {
  items: [{ ...APPROVED_QUESTION_1, similarity_score: 0.89 }],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
  search_mode: "semantic" as const,
};

// Mock faculty user
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock embedding vector (truncated)
export const MOCK_QUERY_EMBEDDING = new Array(1024).fill(0).map(() => Math.random());
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/item-bank/item-bank-browser.test.ts`

```
describe("ItemBankController")
  describe("GET /api/v1/item-bank")
    > returns paginated list of approved questions
    > filters by course_id
    > filters by bloom_level
    > filters by difficulty range (min/max)
    > filters by usmle_system
    > filters by tags (multiple)
    > filters by date range
    > sorts by difficulty ascending
    > sorts by created_at descending (default)
    > returns is_bookmarked=true for bookmarked items
    > returns 401 for unauthenticated request

  describe("POST /api/v1/item-bank/bookmarks")
    > creates bookmark for a question
    > returns 409 if already bookmarked

  describe("DELETE /api/v1/item-bank/bookmarks/:questionId")
    > removes bookmark for a question
```

**File:** `apps/server/src/__tests__/item-bank/item-search.test.ts`

```
describe("ItemSearchService")
  describe("textSearch")
    > returns results matching stem text
    > returns results ordered by relevance score
    > applies filters alongside text search

  describe("semanticSearch")
    > returns results ordered by cosine similarity
    > applies filters alongside semantic search
    > handles empty embedding gracefully
```

**Total: ~20 tests**

## 11. E2E Test Spec (Playwright)

**File:** `apps/web/e2e/item-bank.spec.ts`

```
describe("Item Bank Browser E2E")
  test("search and preview flow")
    > Navigate to /faculty/item-bank
    > Type search query in text search input
    > Verify results appear in table
    > Click a row to open preview Sheet
    > Verify question content in preview

  test("filter and bulk select flow")
    > Navigate to /faculty/item-bank
    > Apply course filter
    > Apply Bloom level filter
    > Verify filter chips appear
    > Select multiple items with checkbox
    > Verify bulk action bar appears
```

**Total: 2 E2E tests**

## 12. Acceptance Criteria

1. Paginated table/card view toggle for browsing approved questions
2. Full-text search on stem, vignette, rationale using tsvector
3. Semantic search using pgvector cosine similarity (1024-dim Voyage AI)
4. All filters work: course, question type, Bloom level, difficulty, USMLE system, discipline, tags, date range, status
5. Sort by: date created, difficulty, Bloom level, composite score, course
6. Bulk selection enables batch export, tag, archive
7. Quick preview via shadcn/ui Sheet side panel
8. Bookmark/favorite functionality works
9. Result count and active filter chips with clear-all
10. Filter state persisted in URL query params
11. Custom `ItemBankQueryError` error class
12. All 20 API tests pass
13. Both E2E tests pass
14. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| tsvector full-text search | S-F-25-1 SS Notes: "Full-text search uses Supabase tsvector index on stem + vignette + rationale" |
| pgvector semantic search | S-F-25-1 SS Notes: "Semantic search uses pgvector cosine similarity on stored embeddings (1024-dim Voyage AI)" |
| Table/card toggle | S-F-25-1 SS Notes: "table for dense scanning, cards for visual browsing" |
| Quick preview via Sheet | S-F-25-1 SS Notes: "shadcn/ui Sheet (side panel) with full question display" |
| Bookmark in user_bookmarks | S-F-25-1 SS Notes: "Bookmark stored in Supabase user_bookmarks table" |
| URL query params | S-F-25-1 SS Notes: "Filter state persisted in URL query params for shareable filtered views" |
| Embeddings 1024-dim | ARCHITECTURE rules: "All embeddings are 1024-dim (Voyage AI voyage-3-large)" |
| pgvector HNSW | Shared context: "pgvector HNSW" |
| Blocks detail/export/blueprint | FULL-DEPENDENCY-GRAPH: S-F-25-1 -> S-F-25-2, S-F-25-3, S-F-25-4 |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions` table with `search_vector` tsvector column and `embedding` vector(1024) column
- **pgvector extension:** Enabled in Supabase
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-54 (Auto-tagging):** Complete -- tags exist for filtering
- **STORY-F-61 (Review Actions):** Complete -- approved items exist
- **No Neo4j needed** for this story (queries are Supabase-only)

## 15. Figma Make Prototype

```
Frame: Item Bank Browser Page (1440x900)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content Area (1200px, cream #f5f3ef)
  │   ├── Header Row (flex, space-between)
  │   │   ├── "Item Bank" (24px, bold, navy deep)
  │   │   └── ViewToggle: [Table] [Cards]
  │   ├── Search Bar (full width, white card)
  │   │   ├── Search Input (icon + text field)
  │   │   ├── Mode Toggle: [Text Search] | [Semantic Search]
  │   │   └── Search Button (navy deep)
  │   ├── Filter Bar (full width, collapsible)
  │   │   ├── Filter dropdowns row
  │   │   ├── Active filter chips
  │   │   └── "245 items found" + "Clear all"
  │   ├── DataTable (full width, white card) -- TABLE VIEW
  │   │   ├── Columns: Bookmark star, Stem preview, Type, Course, Bloom, Difficulty, System, Score, Date
  │   │   ├── Checkbox column for bulk select
  │   │   └── Pagination
  │   ├── Card Grid (3-col, gap-16) -- CARD VIEW (alternate)
  │   │   └── ItemCard: stem preview, tags, score badge, bookmark star
  │   ├── Bulk Action Bar (sticky bottom, navy deep bg)
  │   │   └── "12 selected" + Export + Tag + Archive buttons
  │   └── Preview Sheet (right side panel, 480px)
  │       └── Full question display
```
