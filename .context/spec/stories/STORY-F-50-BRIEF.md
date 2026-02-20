# STORY-F-50 Brief: ContextPanel Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-50
old_id: S-F-19-3
lane: faculty
lane_priority: 3
within_lane_order: 50
sprint: 7
size: M
depends_on:
  - STORY-F-43 (faculty) — Workbench SplitPane layout exists
blocks: []
personas_served: [faculty]
epic: E-19 (Workbench UI)
feature: F-09 (Generation Workbench)
```

## 1. Summary

Build a **ContextPanel** organism with three collapsible sections -- Source Material, Concept Graph, and Framework Tags -- that displays curriculum context alongside the generation workbench. Source Material lists uploaded documents filtered by selected course/SLO. Concept Graph renders a mini force-directed D3 graph of SubConcepts linked to the selected SLO. Framework Tags displays USMLE system, discipline, and Bloom's level tags. Data fetching is driven by course and SLO selection from URL params. Clicking a concept node in the graph adds it to the generation scope. Each section has skeleton loading states and empty states with action prompts.

Key constraints:
- Three collapsible sections, all default open
- Mini concept graph uses D3 force layout (simplified version of full graph in E-28)
- Framework tags read from Neo4j relationships
- Source material from Supabase `uploaded_documents` table
- Concept graph click dispatches to workbench state
- Named exports only, TypeScript strict, design tokens only, atomic design

## 2. Task Breakdown

1. **Types** -- Create `ContextPanelData`, `SourceMaterialItem`, `ConceptGraphNode`, `FrameworkTag` in `packages/types/src/workbench/`
2. **Atoms** -- `TagChip` and `DocumentCard` in `packages/ui/src/atoms/`
3. **Molecules** -- `CollapsibleSection` in `packages/ui/src/molecules/`
4. **Source material list** -- `SourceMaterialList` organism in web app
5. **Mini concept graph** -- `MiniConceptGraph` organism with D3 force layout
6. **Framework tags** -- `FrameworkTags` organism displaying USMLE tags
7. **ContextPanel** -- Parent organism composing all three sections
8. **useCourseContext hook** -- Fetches context data based on URL params
9. **API tests** -- 8-10 tests covering section rendering, data fetching, concept interaction, empty states, loading states
10. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/workbench/context.types.ts

/** Source material document for the context panel */
export interface SourceMaterialItem {
  readonly id: string;
  readonly name: string;
  readonly file_type: string;
  readonly file_size: number;
  readonly uploaded_at: string;
  readonly course_id: string;
  readonly slo_ids: readonly string[];
  readonly preview_url: string | null;
}

/** Node in the mini concept graph */
export interface ConceptGraphNode {
  readonly id: string;
  readonly name: string;
  readonly type: "concept" | "sub_concept";
  readonly depth: number;
}

/** Edge in the mini concept graph */
export interface ConceptGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly relationship: string;
}

/** Mini concept graph data */
export interface ConceptGraphData {
  readonly nodes: readonly ConceptGraphNode[];
  readonly edges: readonly ConceptGraphEdge[];
}

/** Framework tag for the context panel */
export interface FrameworkTag {
  readonly id: string;
  readonly label: string;
  readonly category: "usmle_system" | "usmle_discipline" | "bloom_level";
  readonly value: string;
}

/** Complete context panel data */
export interface ContextPanelData {
  readonly source_materials: readonly SourceMaterialItem[];
  readonly concept_graph: ConceptGraphData;
  readonly framework_tags: readonly FrameworkTag[];
}

/** Context panel section state */
export interface ContextSectionState {
  readonly is_open: boolean;
  readonly is_loading: boolean;
  readonly has_data: boolean;
}

/** Concept selection event from graph */
export interface ConceptSelectionEvent {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly action: "add" | "remove";
}
```

## 4. Database Schema (inline, complete)

No new tables. Reads from existing tables:
- `uploaded_documents` (Supabase) -- source materials
- `SubConcept`, `Concept` nodes (Neo4j) -- concept graph
- `USMLE_System`, `USMLE_Discipline`, `USMLE_Topic` nodes (Neo4j) -- framework tags

```sql
-- No new migration required.
-- Reads from existing:
-- uploaded_documents (id, name, file_type, file_size, course_id, slo_ids, preview_url, uploaded_at)
-- Neo4j: (SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_System)
-- Neo4j: (SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_Discipline)
-- Neo4j: (SLO)-[:COVERS]->(SubConcept)-[:PART_OF]->(Concept)
```

## 5. API Contract (complete request/response)

### GET /api/v1/workbench/context?course_id={courseId}&slo_id={sloId} (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "source_materials": [
      {
        "id": "doc-uuid-1",
        "name": "Cardiology Review Notes.pdf",
        "file_type": "application/pdf",
        "file_size": 2048000,
        "uploaded_at": "2026-02-01T10:00:00Z",
        "course_id": "course-uuid-1",
        "slo_ids": ["slo-uuid-1"],
        "preview_url": "/storage/docs/doc-uuid-1/preview.png"
      }
    ],
    "concept_graph": {
      "nodes": [
        { "id": "concept-uuid-1", "name": "Cardiac Physiology", "type": "concept", "depth": 0 },
        { "id": "sub-uuid-1", "name": "Action Potential", "type": "sub_concept", "depth": 1 },
        { "id": "sub-uuid-2", "name": "Contractility", "type": "sub_concept", "depth": 1 }
      ],
      "edges": [
        { "source": "concept-uuid-1", "target": "sub-uuid-1", "relationship": "HAS_SUB_CONCEPT" },
        { "source": "concept-uuid-1", "target": "sub-uuid-2", "relationship": "HAS_SUB_CONCEPT" }
      ]
    },
    "framework_tags": [
      { "id": "tag-1", "label": "Cardiovascular", "category": "usmle_system", "value": "Cardiovascular" },
      { "id": "tag-2", "label": "Internal Medicine", "category": "usmle_discipline", "value": "Internal Medicine" },
      { "id": "tag-3", "label": "Apply", "category": "bloom_level", "value": "Apply" }
    ]
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Missing course_id parameter |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |

## 6. Frontend Spec

### ContextPanel Component

**File:** `apps/web/src/components/workbench/context-panel.tsx`

```
ContextPanel (organism)
  ├── CollapsibleSection: "Source Material" (default open)
  │   ├── SourceMaterialList (organism)
  │   │   ├── DocumentCard[] (atoms) — name, type, size, preview
  │   │   └── Empty state: "Upload source material" link
  │   └── Skeleton loading state
  ├── CollapsibleSection: "Concept Graph" (default open)
  │   ├── MiniConceptGraph (organism)
  │   │   ├── D3 force-directed graph (smaller viewport ~300x200)
  │   │   ├── Clickable nodes → add concept to generation scope
  │   │   └── Empty state: "No concepts linked to this SLO"
  │   └── Skeleton loading state
  └── CollapsibleSection: "Framework Tags" (default open)
      ├── FrameworkTags (organism)
      │   ├── TagChip[] (atoms) — grouped by category
      │   └── Empty state: "No framework tags available"
      └── Skeleton loading state
```

**States:**
1. **Loading** -- Skeleton placeholders in each section
2. **Loaded** -- Data displayed in all three sections
3. **Partial** -- Some sections have data, others show empty state
4. **Empty** -- All sections empty with action prompts
5. **Error** -- Error message with retry button

**Design tokens:**
- Section headers: text-foreground, font-semibold
- TagChip background by category: `usmle_system` Navy Deep `#002c76`, `usmle_discipline` Green `#69a338`, `bloom_level` Cream `#f5f3ef` with border
- DocumentCard: White `#ffffff` card with border, file type icon from Lucide
- Graph nodes: Navy Deep `#002c76` for concepts, Green `#69a338` for sub-concepts
- Graph edges: muted stroke
- Empty state text: text-muted-foreground
- Collapsible chevron: Lucide `ChevronDown` / `ChevronRight`

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/workbench/context.types.ts` | Types | Create |
| 2 | `packages/types/src/workbench/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add workbench export) |
| 4 | `packages/ui/src/atoms/tag-chip.tsx` | Atom | Create |
| 5 | `packages/ui/src/atoms/document-card.tsx` | Atom | Create |
| 6 | `packages/ui/src/molecules/collapsible-section.tsx` | Molecule | Create |
| 7 | `apps/web/src/components/workbench/source-material-list.tsx` | Organism | Create |
| 8 | `apps/web/src/components/workbench/mini-concept-graph.tsx` | Organism | Create |
| 9 | `apps/web/src/components/workbench/framework-tags.tsx` | Organism | Create |
| 10 | `apps/web/src/components/workbench/context-panel.tsx` | Organism | Create |
| 11 | `apps/web/src/hooks/use-course-context.ts` | Hook | Create |
| 12 | `apps/web/src/__tests__/workbench/context-panel.test.tsx` | Tests | Create |
| 13 | `apps/web/src/__tests__/workbench/mini-concept-graph.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-43 | faculty | Pending | Workbench SplitPane layout must exist |
| STORY-U-7 | universal | **DONE** | USMLE seed data (framework nodes in Neo4j) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- `d3` -- D3 force layout for mini concept graph
- `@types/d3` -- TypeScript types for D3

### Existing Files Needed
- `apps/web/src/components/workbench/` -- Workbench layout (from STORY-F-43)
- `apps/server/src/config/supabase.config.ts` -- Supabase client for uploaded documents
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for concept graph and framework tags

## 9. Test Fixtures (inline)

```typescript
// Mock source materials
export const SOURCE_MATERIALS: SourceMaterialItem[] = [
  {
    id: "doc-uuid-1",
    name: "Cardiology Review Notes.pdf",
    file_type: "application/pdf",
    file_size: 2048000,
    uploaded_at: "2026-02-01T10:00:00Z",
    course_id: "course-uuid-1",
    slo_ids: ["slo-uuid-1"],
    preview_url: "/storage/docs/doc-uuid-1/preview.png",
  },
  {
    id: "doc-uuid-2",
    name: "ECG Interpretation Guide.docx",
    file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_size: 512000,
    uploaded_at: "2026-02-05T14:00:00Z",
    course_id: "course-uuid-1",
    slo_ids: ["slo-uuid-1", "slo-uuid-2"],
    preview_url: null,
  },
];

// Mock concept graph
export const CONCEPT_GRAPH: ConceptGraphData = {
  nodes: [
    { id: "concept-uuid-1", name: "Cardiac Physiology", type: "concept", depth: 0 },
    { id: "sub-uuid-1", name: "Action Potential", type: "sub_concept", depth: 1 },
    { id: "sub-uuid-2", name: "Contractility", type: "sub_concept", depth: 1 },
    { id: "sub-uuid-3", name: "Cardiac Output", type: "sub_concept", depth: 1 },
  ],
  edges: [
    { source: "concept-uuid-1", target: "sub-uuid-1", relationship: "HAS_SUB_CONCEPT" },
    { source: "concept-uuid-1", target: "sub-uuid-2", relationship: "HAS_SUB_CONCEPT" },
    { source: "concept-uuid-1", target: "sub-uuid-3", relationship: "HAS_SUB_CONCEPT" },
  ],
};

// Mock framework tags
export const FRAMEWORK_TAGS: FrameworkTag[] = [
  { id: "tag-1", label: "Cardiovascular", category: "usmle_system", value: "Cardiovascular" },
  { id: "tag-2", label: "Internal Medicine", category: "usmle_discipline", value: "Internal Medicine" },
  { id: "tag-3", label: "Apply", category: "bloom_level", value: "Apply" },
];

// Empty context panel data
export const EMPTY_CONTEXT: ContextPanelData = {
  source_materials: [],
  concept_graph: { nodes: [], edges: [] },
  framework_tags: [],
};

// Full context panel data
export const FULL_CONTEXT: ContextPanelData = {
  source_materials: SOURCE_MATERIALS,
  concept_graph: CONCEPT_GRAPH,
  framework_tags: FRAMEWORK_TAGS,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/web/src/__tests__/workbench/context-panel.test.tsx`

```
describe("ContextPanel")
  describe("rendering")
    > renders three collapsible sections with correct titles
    > all sections default to open
    > toggles section open/closed on header click
    > renders skeleton loading state when data is loading

  describe("source materials")
    > renders DocumentCard for each source material
    > shows empty state with upload link when no materials
    > filters materials by course and SLO

  describe("framework tags")
    > renders TagChip for each framework tag grouped by category
    > shows empty state when no tags available
```

**File:** `apps/web/src/__tests__/workbench/mini-concept-graph.test.tsx`

```
describe("MiniConceptGraph")
  > renders D3 force graph with nodes and edges
  > calls onConceptSelect when a node is clicked
  > shows empty state when no concepts
  > applies correct colors for concept vs sub_concept nodes
```

**Total: ~13 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The ContextPanel is a supporting component within the workbench. E2E coverage for the generation workflow will cover context panel interaction.

## 12. Acceptance Criteria

1. ContextPanel renders with three collapsible sections: Source Material, Concept Graph, Framework Tags
2. Source Material section lists uploaded documents filtered by selected course/SLO
3. Concept Graph section shows mini D3 force-directed graph of SubConcepts linked to selected SLO
4. Framework Tags section displays USMLE system, discipline, and Bloom's level tags
5. Data fetching loads context based on course and SLO from URL params
6. Clicking a concept node in the graph adds it to generation scope
7. Skeleton loading states for each section
8. Empty states with action prompts for each section
9. All 13 API tests pass
10. Named exports only, TypeScript strict, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| Three collapsible sections | S-F-19-3 Acceptance Criteria |
| D3 force-directed graph | S-F-19-3 Acceptance Criteria: "mini force-directed graph" |
| Framework tags from Neo4j | S-F-19-3 Notes: "(SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_System)" |
| Source material from uploaded_documents | S-F-19-3 Notes: "fetched from Supabase uploaded_documents table" |
| Concept click dispatches to workbench state | S-F-19-3 Notes |
| Sections default open | S-F-19-3 Notes: "default: Source Material open, Concept Graph open, Framework Tags open" |
| Simplified version of E-28 full graph | S-F-19-3 Notes |

## 14. Environment Prerequisites

- **Supabase:** Project running, `uploaded_documents` table exists
- **Neo4j:** Running with USMLE seed data (from STORY-U-7)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **D3:** `d3` and `@types/d3` installed in web app

## 15. Implementation Notes

- **MiniConceptGraph:** Use `d3-force` layout with `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter`. Render in an SVG element with viewport ~300x200px. Use `useRef` for SVG element and `useEffect` for D3 initialization. Cleanup simulation on unmount.
- **CollapsibleSection:** Use shadcn/ui `Collapsible` component. Animate with Lucide `ChevronDown` icon rotation. Pass `defaultOpen={true}` for all three sections.
- **useCourseContext hook:** Reads `course_id` and `slo_id` from URL search params via `useSearchParams()`. Fetches from `/api/v1/workbench/context`. Returns `{ data, isLoading, error }`.
- **Concept click handler:** `MiniConceptGraph` accepts an `onConceptSelect(event: ConceptSelectionEvent)` prop. Parent `ContextPanel` dispatches to workbench state store (context or zustand).
- **TagChip atom:** Small pill component with category-based color. Uses design tokens for background color per category.
- **DocumentCard atom:** Card with file type icon (Lucide `FileText`, `FileImage`, etc.), name, size formatted (e.g., "2.0 MB"), upload date.
- **No default exports:** All atoms, molecules, organisms, hooks, and types use named exports only.
