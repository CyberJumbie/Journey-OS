# STORY-F-50: ContextPanel Component

**Epic:** E-19 (Workbench UI)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 7
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-19-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a context panel showing source material, concept graph, and framework tags so that I can reference curriculum context while generating questions and ensure alignment with learning objectives.

## Acceptance Criteria
- [ ] ContextPanel organism with three collapsible sections: Source Material, Concept Graph, Framework Tags
- [ ] Source Material section: lists uploaded documents with preview, filtered by selected course/SLO
- [ ] Concept Graph section: mini force-directed graph of SubConcepts linked to selected SLO (D3 or react-force-graph)
- [ ] Framework Tags section: displays USMLE system, discipline, and Bloom's level tags for the current generation scope
- [ ] Data fetching: loads context based on selected course and SLO from URL params
- [ ] Clickable concepts: clicking a concept node in the graph adds it to generation scope
- [ ] Skeleton loading states for each section
- [ ] Empty states with action prompts ("Upload source material" links to content upload)
- [ ] 8-10 component tests: section rendering, data fetching, concept interaction, empty states, loading states
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/faculty/QuestWorkbench.tsx` (right panel) | `apps/web/src/components/workbench/context-panel.tsx` | Extract ContextPanel organism with CollapsibleSection molecules; extract MiniConceptGraph, SourceMaterialList, FrameworkTags as sub-organisms; replace inline styles with Tailwind design tokens; use D3 force layout or react-force-graph for concept graph; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/workbench/context.types.ts` |
| Atoms | packages/ui | `src/atoms/tag-chip.tsx`, `src/atoms/document-card.tsx` |
| Molecules | packages/ui | `src/molecules/collapsible-section.tsx` |
| Organisms | apps/web | `src/components/workbench/context-panel.tsx`, `src/components/workbench/mini-concept-graph.tsx`, `src/components/workbench/source-material-list.tsx`, `src/components/workbench/framework-tags.tsx` |
| Hooks | apps/web | `src/hooks/use-course-context.ts` |
| Tests | apps/web | `src/components/workbench/__tests__/context-panel.test.tsx`, `src/components/workbench/__tests__/mini-concept-graph.test.tsx` |

## Database Schema
No new tables. Reads from existing tables:
- `contents` / `uploaded_documents` — source materials filtered by course_id
- `subconcepts` — concepts linked to selected SLO
- Neo4j traversal: `(SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_System)` and `(SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_Discipline)`

## API Endpoints

### GET /api/v1/workbench/context
**Auth:** JWT required (faculty role)
**Query Params:** `courseId` (required), `sloId` (optional)
**Success Response (200):**
```json
{
  "data": {
    "sourceMaterials": [{ "id": "uuid", "title": "Cardiology Lecture 3", "type": "pdf", "uploadedAt": "..." }],
    "concepts": [{ "id": "uuid", "name": "Aortic Stenosis", "status": "verified", "connections": 5 }],
    "frameworkTags": {
      "usmleSystems": ["Cardiovascular"],
      "usmleDisciplines": ["Pathology"],
      "bloomLevels": ["Apply", "Analyze"]
    }
  },
  "error": null
}
```

## Dependencies
- **Blocked by:** STORY-F-43 (SplitPane layout)
- **Blocks:** none
- **Cross-lane:** STORY-F-31 (concepts), STORY-U-SLOs (SLOs exist), STORY-U-Frameworks (USMLE frameworks)

## Testing Requirements
- 8-10 component tests: ContextPanel renders three sections, Source Material section lists documents, Concept Graph section renders force layout, Framework Tags section displays tags, loading skeleton states, empty states with action prompts, concept click adds to scope, course context hook data fetching, collapsed/expanded section toggle
- 0 E2E tests
- Use `afterEach(() => cleanup())` in component tests since `globals: false`.
- Mock `@journey-os/ui` with stub components in jsdom tests.
- Do not test D3 force layout interactions in jsdom — test data flow and callback behavior only.

## Implementation Notes
- Mini concept graph is a simplified version of the full concept graph — reuse D3 force layout but smaller viewport.
- Framework tags are read from Neo4j: `(SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_System)` and `(SLO)-[:MAPS_TO]->(USMLE_Topic)-[:BELONGS_TO]->(USMLE_Discipline)`.
- Source material fetched from Supabase, filtered by `course_id`.
- Collapsible sections default: all three open.
- Concept graph interaction: clicking a node dispatches to workbench state, updating the generation scope parameters.
- Use `Promise.all` for the three independent data fetches (materials, concepts, framework tags).
- In client `fetch().json()`, cast response with `as` for strict TypeScript.
- Never use inline `style={{}}` — use Tailwind arbitrary values for any non-token static values.
- Wrap async fetch calls in `useEffect` with async IIFE pattern for React 19 compliance.
