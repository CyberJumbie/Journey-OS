# STORY-IA-31 Brief: Visual Mapping Interface

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-31
old_id: S-IA-15-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 31
sprint: 5
size: L
depends_on:
  - STORY-IA-14 (institutional_admin) — FULFILLS Workflow Service
  - STORY-IA-10 (institutional_admin) — Framework Linking Service
blocks: []
personas_served: [institutional_admin]
epic: E-15 (Objective Mapping & Framework Linking)
feature: F-07 (Objective Mapping)
user_flow: UF-11 (Curriculum Alignment Mapping)
```

---

## 1. Summary

Build a **drag-and-drop Visual Mapping Interface** for mapping SLOs to ILOs and linking objectives to framework nodes. The interface uses a split-panel layout: SLOs on the left, ILOs on the right, and framework nodes in a collapsible third panel. Dragging an SLO onto an ILO creates a FULFILLS proposal. Dragging an objective onto a framework node creates a framework link. Visual connection lines show existing relationships with color-coding by type. Proposed links can be undone before batch submission.

Key constraints:
- **@dnd-kit/core** for drag-and-drop (not React DnD)
- **SVG connection lines** between related nodes
- **Color-coded relationships:** FULFILLS, AT_BLOOM, MAPS_TO_COMPETENCY, etc.
- **Batch submit** sends all proposed links at once
- **Responsive:** minimum 1024px viewport width
- **Lazy-load** framework panel to reduce initial payload

---

## 2. Task Breakdown

Implementation order follows: **Types -> Controller -> Route -> Atoms -> Molecules -> Organisms -> Page -> Tests -> E2E**

### Task 1: Create mapping types
- **File:** `packages/types/src/mapping/visual-mapping.types.ts`
- **Action:** Export `MappingNode`, `MappingLink`, `ProposedLink`, `BatchLinkRequest`, `RelationshipType`

### Task 2: Build MappingController
- **File:** `apps/server/src/controllers/mapping.controller.ts`
- **Action:** Class with `#fulfillsService` and `#frameworkService` private fields. Handlers: `batchCreateLinks(req, res)` for POST /mapping/batch, `deleteLink(req, res)` for DELETE /mapping/:id.

### Task 3: Register mapping routes
- **File:** `apps/server/src/routes/mapping.routes.ts`
- **Action:** Wire controller with auth + RBAC middleware (AuthRole.INSTITUTIONAL_ADMIN).

### Task 4: Build DraggableNode atom
- **File:** `apps/web/src/components/atoms/DraggableNode.tsx`
- **Action:** Named export `DraggableNode`. Wraps @dnd-kit `useDraggable`. Shows node code, title, and type indicator.

### Task 5: Build ConnectionLine atom
- **File:** `apps/web/src/components/atoms/ConnectionLine.tsx`
- **Action:** Named export `ConnectionLine`. SVG `<path>` connecting two nodes with color based on relationship type. Curved bezier path for visual clarity.

### Task 6: Build SLOPanel molecule
- **File:** `apps/web/src/components/molecules/SLOPanel.tsx`
- **Action:** Named export `SLOPanel`. Scrollable list of DraggableNode items representing SLOs. Grouped by course. Search filter.

### Task 7: Build ILOPanel molecule
- **File:** `apps/web/src/components/molecules/ILOPanel.tsx`
- **Action:** Named export `ILOPanel`. Drop targets for SLOs. Shows existing FULFILLS connections. Uses @dnd-kit `useDroppable`.

### Task 8: Build FrameworkPanel molecule
- **File:** `apps/web/src/components/molecules/FrameworkPanel.tsx`
- **Action:** Named export `FrameworkPanel`. Collapsible panel with framework nodes as drop targets. Lazy-loaded on expand.

### Task 9: Build ObjectiveMapper organism
- **File:** `apps/web/src/components/organisms/ObjectiveMapper/ObjectiveMapper.tsx`
- **Action:** Named export `ObjectiveMapper`. DndContext provider. Split-panel layout with SLOPanel (left), ILOPanel (right), FrameworkPanel (collapsible). SVG overlay for connection lines. Proposed links staging area with undo and batch submit.

### Task 10: Build mapping page
- **File:** `apps/web/src/app/(protected)/institution/mapping/page.tsx`
- **Action:** Default export page. Renders ObjectiveMapper with page header.

### Task 11: Write controller tests
- **File:** `apps/server/src/tests/mapping.controller.test.ts`
- **Action:** 12-15 tests for batch creation, validation, link deletion.

### Task 12: Write E2E test
- **File:** `apps/web/e2e/objective-mapping.spec.ts`
- **Action:** 1 E2E test: drag SLO onto ILO, submit, verify FULFILLS proposal created.

---

## 3. Data Model

```typescript
// packages/types/src/mapping/visual-mapping.types.ts

export type MappingRelationshipType =
  | 'FULFILLS'
  | 'AT_BLOOM'
  | 'MAPS_TO_COMPETENCY'
  | 'MAPS_TO_FRAMEWORK';

export type MappingNodeType = 'slo' | 'ilo' | 'framework_node';

/** A node in the mapping interface */
export interface MappingNode {
  readonly id: string;
  readonly type: MappingNodeType;
  readonly code: string;
  readonly title: string;
  readonly course_id?: string;           // for SLOs
  readonly course_name?: string;         // for SLOs
  readonly framework_id?: string;        // for framework nodes
}

/** An existing link between nodes */
export interface MappingLink {
  readonly id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly relationship_type: MappingRelationshipType;
  readonly created_at: string;
}

/** A proposed (not yet submitted) link */
export interface ProposedLink {
  readonly temp_id: string;              // client-side temp ID for undo
  readonly source_id: string;
  readonly source_type: MappingNodeType;
  readonly target_id: string;
  readonly target_type: MappingNodeType;
  readonly relationship_type: MappingRelationshipType;
}

/** Batch link creation request */
export interface BatchLinkRequest {
  readonly links: readonly {
    readonly source_id: string;
    readonly target_id: string;
    readonly relationship_type: MappingRelationshipType;
    readonly justification?: string;     // for FULFILLS proposals
  }[];
}

/** Batch link creation response */
export interface BatchLinkResponse {
  readonly created: number;
  readonly proposals: number;            // FULFILLS goes through proposal workflow
  readonly errors: readonly {
    readonly index: number;
    readonly message: string;
  }[];
}
```

---

## 4. Database Schema

No new tables. Uses existing tables:
- `fulfills_proposals` (from STORY-IA-14) -- for SLO-to-ILO FULFILLS proposals
- Framework links stored via Framework Linking Service (STORY-IA-10)
- Neo4j relationships created for AT_BLOOM, MAPS_TO_COMPETENCY, MAPS_TO_FRAMEWORK

**Data queries:**
```sql
-- Get SLOs for institution
SELECT s.id, s.code, s.title, c.id AS course_id, c.name AS course_name
FROM slos s JOIN courses c ON s.course_id = c.id
WHERE c.institution_id = $institutionId;

-- Get ILOs for institution
SELECT i.id, i.code, i.title
FROM ilos i WHERE i.institution_id = $institutionId;

-- Get existing links
SELECT fl.id, fl.source_id, fl.target_id, fl.relationship_type, fl.created_at
FROM framework_links fl WHERE fl.institution_id = $institutionId;
```

---

## 5. API Contract

### POST /api/v1/mapping/batch (Auth: InstitutionalAdmin)

**Request Body:**
```json
{
  "links": [
    {
      "source_id": "slo-uuid-1",
      "target_id": "ilo-uuid-1",
      "relationship_type": "FULFILLS",
      "justification": "SLO directly supports ILO learning goals"
    },
    {
      "source_id": "ilo-uuid-1",
      "target_id": "framework-node-uuid-1",
      "relationship_type": "MAPS_TO_COMPETENCY"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "data": {
    "created": 1,
    "proposals": 1,
    "errors": []
  },
  "error": null
}
```

### DELETE /api/v1/mapping/:id (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": { "deleted": true },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin |
| 400 | `VALIDATION_ERROR` | Invalid link data, missing required fields |
| 404 | `NOT_FOUND` | Link not found (delete) |

---

## 6. Frontend Spec

### Page: `/institution/mapping`

**Component hierarchy:**
```
MappingPage (page.tsx -- default export)
  ├── PageHeader ("Objective Mapping")
  └── ObjectiveMapper (Organism, DndContext provider)
        ├── SLOPanel (Molecule, left panel, 33% width)
        │     ├── SearchInput
        │     ├── CourseGroup × N
        │     │     └── DraggableNode × N (Atom)
        ├── ILOPanel (Molecule, right panel, 33% width)
        │     └── DroppableILO × N (with useDroppable)
        ├── FrameworkPanel (Molecule, collapsible, 33% width)
        │     ├── ExpandToggle
        │     └── FrameworkNode × N (lazy-loaded)
        ├── SVG Overlay (full width, pointer-events: none)
        │     └── ConnectionLine × N (Atom, existing + proposed)
        └── ProposedLinksBar (bottom sticky bar)
              ├── ProposedLink × N (with undo button)
              └── BatchSubmitButton
```

**States:**
1. **Loading** -- Skeleton panels for SLO and ILO lists
2. **Ready** -- All panels populated, drag-and-drop enabled
3. **Dragging** -- Active drag overlay, valid drop targets highlighted
4. **Proposed** -- New connection line appears as dashed, proposed links bar shows count
5. **Submitting** -- Spinner on batch submit, all interactions disabled
6. **Success** -- Proposed links converted to solid lines, toast notification
7. **Error** -- Error toast with details

**Design tokens:**
- FULFILLS connection: `#2563eb` (blue)
- AT_BLOOM connection: `#7c3aed` (purple)
- MAPS_TO_COMPETENCY connection: `#69a338` (green)
- MAPS_TO_FRAMEWORK connection: `#eab308` (yellow)
- Proposed link: dashed stroke, same color as type
- Drop target highlight: `--color-surface-accent` with 2px border
- Panel dividers: `--color-border-primary`, 1px solid
- Min viewport: 1024px width enforced with horizontal scroll below

**SVG Connection Lines:**
- Bezier curves: `M startX,startY C cp1X,cp1Y cp2X,cp2Y endX,endY`
- Control points offset by panel gap distance
- Line width: 2px for existing, 1.5px dashed for proposed

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/mapping/visual-mapping.types.ts` | Types | Create |
| 2 | `packages/types/src/mapping/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/controllers/mapping.controller.ts` | Controller | Create |
| 4 | `apps/server/src/routes/mapping.routes.ts` | Route | Create |
| 5 | `apps/web/src/components/atoms/DraggableNode.tsx` | Atom | Create |
| 6 | `apps/web/src/components/atoms/ConnectionLine.tsx` | Atom | Create |
| 7 | `apps/web/src/components/molecules/SLOPanel.tsx` | Molecule | Create |
| 8 | `apps/web/src/components/molecules/ILOPanel.tsx` | Molecule | Create |
| 9 | `apps/web/src/components/molecules/FrameworkPanel.tsx` | Molecule | Create |
| 10 | `apps/web/src/components/organisms/ObjectiveMapper/ObjectiveMapper.tsx` | Organism | Create |
| 11 | `apps/web/src/app/(protected)/institution/mapping/page.tsx` | Page | Create |
| 12 | `apps/server/src/tests/mapping.controller.test.ts` | Tests | Create |
| 13 | `apps/web/e2e/objective-mapping.spec.ts` | E2E | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-14 | institutional_admin | **PENDING** | FULFILLS Workflow Service for creating FULFILLS proposals |
| STORY-IA-10 | institutional_admin | **PENDING** | Framework Linking Service for creating framework links |

### NPM Packages
- `@dnd-kit/core` -- drag-and-drop library (**needs install** in apps/web)
- `@dnd-kit/sortable` -- sortable utilities (**needs install** in apps/web)
- `@dnd-kit/utilities` -- CSS utilities (**needs install** in apps/web)

### Existing Files Needed
- `apps/server/src/services/fulfills.service.ts` -- FULFILLS workflow (from STORY-IA-14)
- `apps/server/src/services/framework-linking.service.ts` -- Framework links (from STORY-IA-10)
- `apps/server/src/middleware/auth.middleware.ts` -- JWT authentication
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC enforcement
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button
- `apps/web/src/components/ui/input.tsx` -- shadcn/ui Input

---

## 9. Test Fixtures

```typescript
export const MOCK_SLOS: MappingNode[] = [
  { id: "slo-uuid-1", type: "slo", code: "SLO-101", title: "Describe cardiac physiology", course_id: "course-uuid-1", course_name: "Anatomy I" },
  { id: "slo-uuid-2", type: "slo", code: "SLO-102", title: "Explain neural pathways", course_id: "course-uuid-1", course_name: "Anatomy I" },
  { id: "slo-uuid-3", type: "slo", code: "SLO-201", title: "Apply pharmacokinetics", course_id: "course-uuid-2", course_name: "Pharmacology I" },
];

export const MOCK_ILOS: MappingNode[] = [
  { id: "ilo-uuid-1", type: "ilo", code: "ILO-1", title: "Apply biomedical sciences" },
  { id: "ilo-uuid-2", type: "ilo", code: "ILO-2", title: "Apply pharmacological principles" },
];

export const MOCK_FRAMEWORK_NODES: MappingNode[] = [
  { id: "fw-uuid-1", type: "framework_node", code: "EPA-1", title: "Gather history and physical", framework_id: "aamc-epa" },
];

export const MOCK_EXISTING_LINKS: MappingLink[] = [
  { id: "link-uuid-1", source_id: "slo-uuid-1", target_id: "ilo-uuid-1", relationship_type: "FULFILLS", created_at: "2026-02-15T10:00:00Z" },
];

export const MOCK_PROPOSED_LINKS: ProposedLink[] = [
  { temp_id: "temp-1", source_id: "slo-uuid-2", source_type: "slo", target_id: "ilo-uuid-1", target_type: "ilo", relationship_type: "FULFILLS" },
];

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/mapping.controller.test.ts`

```
describe("POST /api/v1/mapping/batch")
  it("creates FULFILLS proposal when SLO dragged to ILO")
  it("creates framework link when objective dragged to framework node")
  it("handles mixed batch of FULFILLS and framework links")
  it("validates source_id and target_id exist")
  it("validates relationship_type is valid enum value")
  it("requires justification for FULFILLS relationship type")
  it("returns partial success with errors for invalid links in batch")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")

describe("DELETE /api/v1/mapping/:id")
  it("deletes an existing link successfully")
  it("returns 404 for non-existent link")
  it("prevents deletion of links from other institutions")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
```

**Total: ~14 API tests**

---

## 11. E2E Test Spec (Playwright)

**File:** `apps/web/e2e/objective-mapping.spec.ts`

```
describe("Objective Mapping")
  it("InstitutionalAdmin can drag SLO onto ILO and submit FULFILLS proposal")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/mapping
    3. Verify SLO panel shows SLOs grouped by course
    4. Verify ILO panel shows institution ILOs
    5. Drag SLO-101 onto ILO-1
    6. Verify proposed link appears in staging bar
    7. Click "Submit All" button
    8. Verify success toast appears
    9. Verify connection line rendered between SLO-101 and ILO-1
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Split-panel layout: SLOs on left, ILOs on right, framework nodes in collapsible panel
2. Drag SLO onto ILO creates FULFILLS proposal
3. Drag objective onto framework node creates framework link
4. Visual connection lines show existing relationships
5. Color-coded relationship types (FULFILLS blue, AT_BLOOM purple, etc.)
6. Undo removes a proposed link before submitting
7. Bulk submit sends all proposed links as a batch
8. Responsive: minimum 1024px viewport width
9. All ~14 API tests pass
10. 1 E2E test passes
11. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Visual mapping interface concept | S-IA-15-3 User Story |
| Split-panel layout | S-IA-15-3 Acceptance Criteria |
| @dnd-kit/core library | S-IA-15-3 Notes |
| SVG connection lines | S-IA-15-3 Notes |
| Color-coded relationships | S-IA-15-3 Acceptance Criteria |
| Batch submit via services | S-IA-15-3 Notes |
| Lazy-load framework panel | S-IA-15-3 Notes |
| 1024px min viewport | S-IA-15-3 Acceptance Criteria |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with mapping routes
- **Supabase:** SLOs, ILOs, courses, framework_links tables populated
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **@dnd-kit:** Must be installed (`pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` in apps/web)

---

## 15. Figma Make Prototype

No Figma prototype for this story. Reference @dnd-kit examples for drag-and-drop interaction patterns. Use Figma's connector-style SVG paths for connection lines.
