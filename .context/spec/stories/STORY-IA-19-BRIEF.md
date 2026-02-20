# STORY-IA-19 Brief: Framework Search

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-19
old_id: S-IA-17-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 19
sprint: 3
size: S
depends_on:
  - STORY-IA-6 (institutional_admin) — Framework List Page
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-17 (Framework Browser UI)
feature: F-08 (Framework Browser)
user_flow: UF-13 (Framework Exploration)
```

---

## 1. Summary

Build a **framework search** feature that lets an Institutional Admin search across all framework nodes by name, description, or framework_id using a Neo4j full-text index. Results are grouped by framework with each result showing node name, framework, level, and parent path. Clicking a result navigates to the hierarchy tree view (STORY-IA-21) with that node expanded and highlighted. The search input is debounced (300ms) with a minimum of 2 characters.

Key constraints:
- **Neo4j full-text index** for performant search across framework node labels
- **Debounced input:** 300ms delay, minimum 2 characters
- **Results grouped by framework** with framework name as section header
- **Click result** navigates to tree view with node expanded and highlighted
- **Search across:** node name, description, framework_id

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create framework search types
- **File:** `packages/types/src/frameworks/framework-search.types.ts`
- **Action:** Export `FrameworkSearchQuery`, `FrameworkSearchResult`, `FrameworkSearchResponse`, `GroupedSearchResults`

### Task 2: Update frameworks barrel export
- **File:** `packages/types/src/frameworks/index.ts`
- **Action:** Re-export from `framework-search.types.ts`

### Task 3: Build FrameworkSearchService
- **File:** `apps/server/src/services/framework/framework-search.service.ts`
- **Action:** `search(query, institutionId)` method. Uses Neo4j full-text index. Groups results by framework. Includes parent path for each result.

### Task 4: Build FrameworkSearchController
- **File:** `apps/server/src/controllers/framework/framework-search.controller.ts`
- **Action:** `handleSearch(req, res)` method. Validates query length, calls service.

### Task 5: Register route
- **File:** `apps/server/src/index.ts`
- **Action:** Add `GET /api/v1/frameworks/search` with InstitutionalAdmin/SuperAdmin RBAC

### Task 6: Build FrameworkSearch component
- **File:** `apps/web/src/components/framework/framework-search.tsx`
- **Action:** Client component with debounced search input, grouped result list

### Task 7: Build SearchResultItem component
- **File:** `apps/web/src/components/framework/search-result-item.tsx`
- **Action:** Single result row: name (bold matching text), framework, level, parent path

### Task 8: Write service tests
- **File:** `apps/server/src/services/framework/__tests__/framework-search.service.test.ts`
- **Action:** 5 tests covering search, empty query, no results, cross-framework, auth

---

## 3. Data Model

```typescript
// packages/types/src/frameworks/framework-search.types.ts

/** Query parameters for framework search */
export interface FrameworkSearchQuery {
  readonly q: string;              // Search term (min 2 characters)
  readonly framework_id?: string;  // Optional: limit to specific framework
  readonly limit?: number;         // Default: 20, max: 50
}

/** A single search result */
export interface FrameworkSearchResult {
  readonly node_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly framework_id: string;
  readonly framework_name: string;
  readonly level: string;          // e.g., "System", "Discipline", "Topic", "SubConcept"
  readonly parent_path: string[];  // Breadcrumb from root to this node
  readonly match_field: "name" | "description" | "framework_id";
}

/** Results grouped by framework */
export interface GroupedSearchResults {
  readonly framework_id: string;
  readonly framework_name: string;
  readonly results: readonly FrameworkSearchResult[];
  readonly total_in_framework: number;
}

/** Paginated search response */
export interface FrameworkSearchResponse {
  readonly groups: readonly GroupedSearchResults[];
  readonly total_results: number;
  readonly query: string;
}
```

---

## 4. Database Schema

No new Supabase tables. Search uses Neo4j full-text index.

```cypher
// Create full-text index on framework nodes (run once as part of seeding)
CREATE FULLTEXT INDEX frameworkSearch IF NOT EXISTS
FOR (n:USMLE_System|USMLE_Discipline|USMLE_Topic|SubConcept|LCME_Standard|LCME_Element|EPANode|CompetencyNode|MilestoneNode|BloomLevel|MillerLevel|CLONode)
ON EACH [n.name, n.description]

// Search query using the full-text index
CALL db.index.fulltext.queryNodes('frameworkSearch', $searchTerm + '~')
YIELD node, score
WHERE score > 0.5
RETURN node.id AS node_id,
       node.name AS name,
       node.description AS description,
       labels(node)[0] AS level,
       score
ORDER BY score DESC
LIMIT $limit
```

**Parent path query (per result):**
```cypher
// Get parent path from root to node
MATCH path = (root)-[:CONTAINS|HAS_ELEMENT*]->(target {id: $nodeId})
WHERE NOT ()-[:CONTAINS|HAS_ELEMENT]->(root)
RETURN [n IN nodes(path) | n.name] AS parent_path
```

---

## 5. API Contract

### GET /api/v1/frameworks/search (Auth: InstitutionalAdmin or SuperAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | -- | Search term (min 2 chars, required) |
| `framework_id` | string | -- | Filter to specific framework |
| `limit` | number | 20 | Max results (max 50) |

**Success Response (200):**
```json
{
  "data": {
    "groups": [
      {
        "framework_id": "usmle",
        "framework_name": "USMLE Content Outline",
        "results": [
          {
            "node_id": "sc-uuid-1",
            "name": "Myocardial Infarction",
            "description": "Pathophysiology of acute MI including...",
            "framework_id": "usmle",
            "framework_name": "USMLE Content Outline",
            "level": "SubConcept",
            "parent_path": ["Cardiovascular", "Pathology", "Ischemic Heart Disease"],
            "match_field": "name"
          }
        ],
        "total_in_framework": 3
      }
    ],
    "total_results": 5,
    "query": "myocardial"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin/SuperAdmin |
| 400 | `VALIDATION_ERROR` | Query less than 2 characters or missing |

---

## 6. Frontend Spec

### Component: FrameworkSearch

**File:** `apps/web/src/components/framework/framework-search.tsx`

**Component hierarchy:**
```
FrameworkSearch (client component)
  ├── SearchInput (text input with search icon, debounced 300ms)
  ├── SearchResults (conditional, shown when results exist)
  │     ├── FrameworkGroup (for each framework)
  │     │     ├── FrameworkGroupHeader (framework name + result count)
  │     │     └── SearchResultItem[] (each result)
  │     │           ├── NodeName (bold matching substring)
  │     │           ├── LevelBadge (System, Topic, etc.)
  │     │           └── ParentPath (breadcrumb text)
  │     └── LoadMoreButton (if results truncated)
  ├── EmptyState ("No results found for...")
  └── MinCharsHint ("Type at least 2 characters to search")
```

**States:**
1. **Idle** -- Search input empty, hint text shown
2. **Typing** -- Input has text, debounce timer active
3. **Loading** -- Spinner in input field while API call pending
4. **Results** -- Grouped results displayed
5. **Empty** -- "No results found" message
6. **Error** -- Error message with retry option

**Design tokens:**
- Search input: `--radius-md`, `--color-border-input`, Lucide `Search` icon
- Group header: `--font-weight-semibold`, `--color-text-secondary`
- Match highlight: `<mark>` tag with `--color-highlight-bg`
- Level badge: `--badge-variant-outline`, sized to content
- Parent path: `--color-text-muted`, `--font-size-sm`

**Behavior:**
- Debounce: 300ms after last keystroke
- Minimum 2 characters to trigger search
- Click result: navigate to `/institution/frameworks/[frameworkId]?highlight=[nodeId]`
- Keyboard: Enter on result navigates, Escape clears search

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/frameworks/framework-search.types.ts` | Types | Create |
| 2 | `packages/types/src/frameworks/index.ts` | Types | Edit (add search export) |
| 3 | `apps/server/src/services/framework/framework-search.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/framework/framework-search.controller.ts` | Controller | Create |
| 5 | `apps/server/src/index.ts` | Routes | Edit (add search route) |
| 6 | `apps/web/src/components/framework/framework-search.tsx` | Component | Create |
| 7 | `apps/web/src/components/framework/search-result-item.tsx` | Component | Create |
| 8 | `apps/server/src/services/framework/__tests__/framework-search.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-6 | institutional_admin | **PENDING** | Framework list page provides the context where search appears |

### NPM Packages (already installed)
- `neo4j-driver` -- Neo4j driver for full-text search queries
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `apps/server/src/services/framework/framework.service.ts` -- framework metadata (from IA-6)

---

## 9. Test Fixtures

```typescript
import { FrameworkSearchResult, FrameworkSearchResponse } from "@journey-os/types";

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock search results
export const MOCK_SEARCH_RESULTS: FrameworkSearchResult[] = [
  {
    node_id: "sc-uuid-1",
    name: "Myocardial Infarction",
    description: "Pathophysiology of acute MI",
    framework_id: "usmle",
    framework_name: "USMLE Content Outline",
    level: "SubConcept",
    parent_path: ["Cardiovascular", "Pathology", "Ischemic Heart Disease"],
    match_field: "name",
  },
  {
    node_id: "topic-uuid-1",
    name: "Ischemic Heart Disease",
    description: "Including myocardial infarction and angina",
    framework_id: "usmle",
    framework_name: "USMLE Content Outline",
    level: "USMLE_Topic",
    parent_path: ["Cardiovascular", "Pathology"],
    match_field: "description",
  },
];

// Mock full response
export const MOCK_SEARCH_RESPONSE: FrameworkSearchResponse = {
  groups: [
    {
      framework_id: "usmle",
      framework_name: "USMLE Content Outline",
      results: MOCK_SEARCH_RESULTS,
      total_in_framework: 2,
    },
  ],
  total_results: 2,
  query: "myocardial",
};

// Empty search response
export const MOCK_EMPTY_RESPONSE: FrameworkSearchResponse = {
  groups: [],
  total_results: 0,
  query: "xyznonexistent",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/framework/__tests__/framework-search.service.test.ts`

```
describe("FrameworkSearchService")
  describe("search")
    it("returns results matching by node name using full-text index")
    it("returns results matching by description")
    it("groups results by framework with framework name header")
    it("includes parent path for each result")
    it("returns empty groups array when no results match")
    it("limits results to specified limit (default 20)")
    it("filters by framework_id when provided")
    it("rejects queries shorter than 2 characters with validation error")
```

**Total: ~8 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/framework-search.spec.ts`

```
describe("Framework Search")
  it("InstitutionalAdmin can search for framework nodes and navigate to results")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/frameworks
    3. Type "cardio" in search input
    4. Wait for debounced results to appear
    5. Verify results are grouped by framework
    6. Click on a search result
    7. Verify navigation to tree view with node highlighted
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Search input available on framework list page and tree view page
2. Search queries Neo4j full-text index across name and description
3. Results grouped by framework with framework name as section header
4. Each result shows node name, framework, level, and parent path
5. Click result navigates to tree view with node expanded and highlighted
6. Debounced input: 300ms delay before query fires
7. Minimum 2 characters required to trigger search
8. Empty results state with clear messaging
9. All 8 API tests pass
10. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Full-text index for search | S-IA-17-3 Notes |
| Debounced 300ms input | S-IA-17-3 Acceptance Criteria |
| Results grouped by framework | S-IA-17-3 Acceptance Criteria |
| Parent path display | S-IA-17-3 Notes |
| Match highlight in results | S-IA-17-3 Notes |

---

## 14. Environment Prerequisites

- **Neo4j:** Instance running with framework nodes seeded and full-text index created
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-IA-6 must be complete** -- framework list page provides the search context

---

## 15. Implementation Notes

- **Full-text index creation:** The full-text index `frameworkSearch` should be created during seeding (STORY-U-7 or U-12), not in this story. If it does not exist, the service should throw a descriptive error.
- **Fuzzy matching:** Append `~` to the search term for fuzzy matching in Neo4j: `CALL db.index.fulltext.queryNodes('frameworkSearch', $term + '~')`. This allows typo tolerance.
- **Parent path performance:** The parent path query (`MATCH path = ...`) can be slow for deep hierarchies. Consider caching parent paths in the search results or limiting path depth to 5 levels.
- **Result grouping:** Group results in the service layer (not the database). Collect all results, then group by `framework_id` using a Map.
- **Highlight matching text:** The frontend should bold the matching substring in the result name/description. Use a simple string replacement: `name.replace(new RegExp(query, 'gi'), '<mark>$&</mark>')`.
- **Navigation on click:** The tree view (STORY-IA-21) should accept a `?highlight=nodeId` query parameter and auto-expand the tree to show that node.
- **Private fields pattern:** `FrameworkSearchService` uses `readonly #neo4jClient` with constructor DI.
- **No Supabase needed:** This story is Neo4j-only. No DualWrite.
