# STORY-IA-23 Brief: ILO Management UI

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-23
old_id: S-IA-14-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 23
sprint: 5
size: M
depends_on:
  - STORY-IA-4 (institutional_admin) — ILO Model & Repository
blocks: []
personas_served: [institutional_admin]
epic: E-14 (ILO & SLO CRUD)
feature: F-07 (Learning Objectives)
user_flow: UF-11 (ILO Management & Framework Mapping)
```

---

## 1. Summary

Build the **ILO Management UI** -- a full CRUD interface for Institutional Learning Objectives. The page displays a table with columns for code, title, Bloom level, status, FULFILLS count, and created date. Supports search by title/code, filtering by Bloom level and status, and sorting. Includes a create/edit form, inline editing, and soft-delete (archive) with confirmation. The controller layer connects the ILO service (from IA-4) to API endpoints.

Key constraints:
- **ILOManagement** is an Organism containing ILOTable and ILOForm Molecules (atomic design)
- **FULFILLS count** column shows how many SLOs map to each ILO
- **Bloom level selector** uses a dropdown with the 6 taxonomy levels
- **Custom error class:** `DuplicateILOCodeError` for uniqueness violations
- **Soft-delete** via archive (not hard delete)
- **Design tokens** for all styling

---

## 2. Task Breakdown

Implementation order follows: **Validation -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create ILO validation middleware
- **File:** `apps/server/src/middleware/ilo.validation.ts`
- **Action:** Zod schemas for create, update, and query params. Validate code format, title length, bloom_level enum.

### Task 2: Build ILOController
- **File:** `apps/server/src/controllers/ilo.controller.ts`
- **Action:** `handleList(req, res)`, `handleCreate(req, res)`, `handleUpdate(req, res)`, `handleArchive(req, res)`. Uses ILOService from IA-4.

### Task 3: Create ILO routes
- **File:** `apps/server/src/routes/ilo.routes.ts`
- **Action:** `GET /api/v1/ilos`, `POST /api/v1/ilos`, `PATCH /api/v1/ilos/:id`, `DELETE /api/v1/ilos/:id` with InstitutionalAdmin RBAC

### Task 4: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Mount ILO routes

### Task 5: Build ILOManagement organism
- **File:** `apps/web/src/components/organisms/ILOManagement/ILOManagement.tsx`
- **Action:** Container component managing state, coordinating table and form

### Task 6: Build ILOTable molecule
- **File:** `apps/web/src/components/molecules/ILOTable.tsx`
- **Action:** Table with sortable headers, search, filters, pagination

### Task 7: Build ILOForm molecule
- **File:** `apps/web/src/components/molecules/ILOForm.tsx`
- **Action:** Create/edit form with code, title, description, Bloom level selector

### Task 8: Build ILO list page
- **File:** `apps/web/src/app/(protected)/institution/ilos/page.tsx`
- **Action:** Default export page rendering ILOManagement organism

### Task 9: Write controller tests
- **File:** `apps/server/src/tests/ilo.controller.test.ts`
- **Action:** 8-10 tests for CRUD endpoints, validation, search, permissions

---

## 3. Data Model

Uses `ILO`, `CreateILORequest`, `UpdateILORequest`, `ILOListQuery`, `ILOListResponse` types from STORY-IA-4 (`packages/types/src/objective/ilo.types.ts`).

Additional UI-specific types:

```typescript
// Extended for the table display (includes FULFILLS count)
export interface ILOTableRow {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly bloom_level: BloomLevel;
  readonly status: ObjectiveStatus;
  readonly fulfills_count: number;    // Count of approved FULFILLS from SLOs
  readonly created_at: string;
}

/** Query for ILO list with FULFILLS count */
export interface ILOListWithCountsQuery extends ILOListQuery {
  readonly sort_by?: "code" | "title" | "bloom_level" | "status" | "fulfills_count" | "created_at";
  readonly sort_dir?: "asc" | "desc";
}
```

---

## 4. Database Schema

No new tables. Uses `student_learning_objectives` (from IA-4) with aggregation for FULFILLS count.

**Query for ILO list with FULFILLS count:**
```sql
SELECT
  slo.id,
  slo.code,
  slo.title,
  slo.description,
  slo.bloom_level,
  slo.status,
  slo.created_at,
  slo.updated_at,
  COUNT(fl.id) FILTER (WHERE fl.status = 'approved') AS fulfills_count
FROM student_learning_objectives slo
LEFT JOIN fulfills_links fl ON fl.ilo_id = slo.id AND fl.status = 'approved'
WHERE slo.institution_id = $institution_id
  AND slo.scope = 'institutional'
  AND ($search IS NULL OR slo.title ILIKE '%' || $search || '%' OR slo.code ILIKE '%' || $search || '%')
  AND ($bloom_level IS NULL OR slo.bloom_level = $bloom_level)
  AND ($status IS NULL OR slo.status = $status)
GROUP BY slo.id
ORDER BY $sort_by $sort_dir
LIMIT $limit OFFSET ($page - 1) * $limit;
```

---

## 5. API Contract

### GET /api/v1/ilos (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `sort_by` | string | `code` | Sort field |
| `sort_dir` | string | `asc` | Sort direction |
| `search` | string | -- | Search title/code (ILIKE) |
| `bloom_level` | string | -- | Filter by Bloom level |
| `status` | string | -- | Filter by status (draft, active, archived) |

**Success Response (200):**
```json
{
  "data": {
    "objectives": [
      {
        "id": "ilo-uuid-1",
        "code": "ILO-MSM-01",
        "title": "Demonstrate patient-centered communication",
        "description": "Graduates will demonstrate effective...",
        "bloom_level": "apply",
        "status": "active",
        "fulfills_count": 5,
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 50,
      "total": 12,
      "total_pages": 1
    }
  },
  "error": null
}
```

### POST /api/v1/ilos (Auth: InstitutionalAdmin)

**Request Body:**
```json
{
  "code": "ILO-MSM-03",
  "title": "Integrate clinical reasoning with evidence-based practice",
  "description": "Graduates will systematically integrate...",
  "bloom_level": "analyze"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "ilo-uuid-3",
    "code": "ILO-MSM-03",
    "title": "Integrate clinical reasoning with evidence-based practice",
    "bloom_level": "analyze",
    "status": "draft",
    "sync_status": "synced",
    "created_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/ilos/:id (Auth: InstitutionalAdmin)

**Request Body:**
```json
{
  "title": "Updated title",
  "bloom_level": "evaluate",
  "status": "active"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "ilo-uuid-1",
    "title": "Updated title",
    "bloom_level": "evaluate",
    "status": "active",
    "updated_at": "2026-02-19T10:05:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/ilos/:id (Auth: InstitutionalAdmin)

Soft-delete (archives the ILO).

**Success Response (200):**
```json
{
  "data": { "id": "ilo-uuid-1", "status": "archived" },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin |
| 400 | `VALIDATION_ERROR` | Invalid bloom_level, missing required fields |
| 404 | `NOT_FOUND` | ILO not found |
| 409 | `DUPLICATE_CODE` | ILO code already exists in institution |

---

## 6. Frontend Spec

### Page: `/institution/ilos` (ILO Management)

**Route:** `apps/web/src/app/(protected)/institution/ilos/page.tsx`

**Component hierarchy:**
```
ILOListPage (page.tsx -- default export)
  └── ILOManagement (organism, client component)
        ├── PageHeader ("Institutional Learning Objectives" + Create button)
        ├── SearchBar (debounced 300ms, searches code + title)
        ├── FilterBar
        │     ├── BloomLevelFilter (dropdown: 6 levels + "All")
        │     └── StatusFilter (dropdown: draft, active, archived, all)
        ├── ILOTable (molecule)
        │     ├── SortableHeader (code, title, bloom_level, status, fulfills_count, created_at)
        │     └── ILORow (for each ILO)
        │           ├── CodeCell (monospace font)
        │           ├── TitleCell
        │           ├── BloomBadge (colored by level)
        │           ├── StatusBadge (draft=gray, active=green, archived=muted)
        │           ├── FulfillsCount (numeric badge)
        │           ├── DateCell (formatted date)
        │           └── ActionMenu (edit, archive)
        ├── Pagination
        ├── ILOForm (molecule -- modal or slide-out)
        │     ├── CodeInput (text, pattern validation)
        │     ├── TitleInput (text, required)
        │     ├── DescriptionTextarea
        │     ├── BloomLevelSelect (dropdown with 6 levels)
        │     └── SubmitButton
        └── ArchiveConfirmDialog
              ├── ImpactWarning (shows FULFILLS count that will be affected)
              ├── ConfirmButton (destructive variant)
              └── CancelButton
```

**States:**
1. **Loading** -- Skeleton table rows
2. **Empty** -- "No ILOs created yet" with Create button
3. **Data** -- Table with ILOs, filters, sorting
4. **Creating** -- Form modal open for new ILO
5. **Editing** -- Form modal open with existing ILO data
6. **Archiving** -- Confirmation dialog open
7. **Error** -- Error toast or inline message

**Design tokens:**
- Surface: `--color-surface-primary` white card on parchment
- Bloom badges: remember=`--color-slate`, understand=`--color-blue`, apply=`--color-green`, analyze=`--color-amber`, evaluate=`--color-orange`, create=`--color-purple`
- Status badges: draft=`--color-muted`, active=`--color-success`, archived=`--color-muted-foreground`
- Code cell: `--font-mono` DM Mono
- Spacing: `--spacing-4` cell padding, `--spacing-6` section gap

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `apps/server/src/middleware/ilo.validation.ts` | Validation | Create |
| 2 | `apps/server/src/controllers/ilo.controller.ts` | Controller | Create |
| 3 | `apps/server/src/routes/ilo.routes.ts` | Routes | Create |
| 4 | `apps/server/src/index.ts` | Routes | Edit (mount ILO routes) |
| 5 | `apps/web/src/app/(protected)/institution/ilos/page.tsx` | View | Create |
| 6 | `apps/web/src/components/organisms/ILOManagement/ILOManagement.tsx` | Organism | Create |
| 7 | `apps/web/src/components/molecules/ILOTable.tsx` | Molecule | Create |
| 8 | `apps/web/src/components/molecules/ILOForm.tsx` | Molecule | Create |
| 9 | `apps/server/src/tests/ilo.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-4 | institutional_admin | **PENDING** | ILO model, repository, and service must exist |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing
- `zod` -- Request validation

### Existing Files Needed
- `apps/server/src/services/objective/ilo.service.ts` -- ILOService (from IA-4)
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `apps/server/src/errors/objective.error.ts` -- `DuplicateObjectiveCodeError` (from IA-4)
- `packages/types/src/objective/ilo.types.ts` -- ILO types (from IA-4)

---

## 9. Test Fixtures

```typescript
import { ILO, CreateILORequest, BloomLevel } from "@journey-os/types";

// Mock InstitutionalAdmin
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock ILOs for table display
export const MOCK_ILO_LIST = [
  {
    id: "ilo-uuid-1",
    code: "ILO-MSM-01",
    title: "Demonstrate patient-centered communication",
    description: "Graduates will demonstrate effective communication...",
    bloom_level: "apply" as BloomLevel,
    status: "active" as const,
    fulfills_count: 5,
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "ilo-uuid-2",
    code: "ILO-MSM-02",
    title: "Apply foundational biomedical sciences",
    description: "Graduates will apply biomedical sciences...",
    bloom_level: "apply" as BloomLevel,
    status: "active" as const,
    fulfills_count: 3,
    created_at: "2026-02-02T10:00:00Z",
  },
  {
    id: "ilo-uuid-3",
    code: "ILO-MSM-03",
    title: "Integrate clinical reasoning",
    description: "Draft ILO...",
    bloom_level: "analyze" as BloomLevel,
    status: "draft" as const,
    fulfills_count: 0,
    created_at: "2026-02-19T10:00:00Z",
  },
];

// Valid create request
export const VALID_CREATE_REQUEST: CreateILORequest = {
  code: "ILO-MSM-04",
  title: "Evaluate healthcare delivery systems",
  description: "Graduates will critically evaluate...",
  bloom_level: "evaluate" as BloomLevel,
};

// Invalid: missing title
export const INVALID_CREATE_REQUEST = {
  code: "ILO-MSM-05",
  bloom_level: "remember",
};

// Duplicate code request
export const DUPLICATE_CODE_REQUEST: CreateILORequest = {
  code: "ILO-MSM-01", // Already exists
  title: "Duplicate code test",
  description: "Should fail",
  bloom_level: "remember" as BloomLevel,
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/ilo.controller.test.ts`

```
describe("ILOController")
  describe("GET /api/v1/ilos")
    it("returns paginated ILO list with FULFILLS count for InstitutionalAdmin")
    it("filters by bloom_level when provided")
    it("filters by status when provided")
    it("searches by title and code (case-insensitive)")
    it("sorts by any valid sort field")
    it("returns 403 for non-InstitutionalAdmin")
  describe("POST /api/v1/ilos")
    it("creates ILO with valid request and returns 201")
    it("returns 400 for missing required fields")
    it("returns 409 for duplicate code within institution")
    it("returns 400 for invalid bloom_level")
  describe("PATCH /api/v1/ilos/:id")
    it("updates ILO fields and returns 200")
    it("returns 404 for non-existent ILO")
  describe("DELETE /api/v1/ilos/:id")
    it("archives ILO (soft delete) and returns 200")
    it("returns 404 for non-existent ILO")
```

**Total: ~14 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/ilo-management.spec.ts`

```
describe("ILO Management")
  it("InstitutionalAdmin can create, view, edit, and archive an ILO")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/ilos
    3. Click "Create ILO" button
    4. Fill form: code, title, description, bloom level
    5. Submit and verify new ILO appears in table
    6. Click edit on the new ILO
    7. Change title and save
    8. Verify updated title in table
    9. Click archive and confirm
    10. Verify ILO shows archived status
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. ILO list page with table: code, title, Bloom level, status, FULFILLS count, created date
2. Search by title or code works (case-insensitive)
3. Filter by Bloom level and status
4. Create ILO form with code, title, description, Bloom level selection
5. Edit ILO inline or via modal
6. Soft-delete with confirmation dialog (archive, not destroy)
7. FULFILLS count column shows SLOs mapped to each ILO
8. Bloom level selector with 6 taxonomy levels
9. Duplicate ILO code returns 409
10. All 14 API tests pass
11. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| ILO table columns | S-IA-14-3 Acceptance Criteria |
| ILOManagement is an Organism | S-IA-14-3 Notes |
| Bloom level 6 levels | Anderson & Krathwohl (2001) |
| DuplicateILOCodeError | S-IA-14-3 Notes |
| Soft-delete via archive | S-IA-14-3 Acceptance Criteria |
| Design tokens | CLAUDE.md Architecture Rules |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives` and `fulfills_links` tables exist
- **Neo4j:** Instance running with ILO nodes
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-IA-4 must be complete** -- ILO service, model, repository exist

---

## 15. Implementation Notes

- **ILOManagement as Organism:** Following atomic design, `ILOManagement` is an organism that composes `ILOTable` (molecule) and `ILOForm` (molecule). It manages the state (list data, selected ILO, modal open/close) and passes callbacks down.
- **FULFILLS count query:** Use a LEFT JOIN with `fulfills_links` table (filtered to `status='approved'`) to count how many SLOs map to each ILO. If the `fulfills_links` table does not exist yet (IA-22 not complete), return 0 for all rows.
- **Bloom level badge colors:** Assign distinct colors to each Bloom level for visual differentiation. The 6 levels map to a color gradient from cool (remember) to warm (create).
- **Controller delegates to service:** The ILOController does NOT contain business logic. It validates the request, extracts `institution_id` from `req.user`, calls `ILOService` methods, and formats the response.
- **Validation middleware:** Use zod schemas for request body and query parameter validation. Export as Express middleware that runs before the controller.
- **Private fields pattern:** `ILOController` uses `readonly #iloService: ILOService` with constructor DI.
- **Archive confirmation:** The frontend shows a confirmation dialog with the FULFILLS count. If the ILO has linked SLOs, warn: "Archiving this ILO will affect N linked SLOs."
