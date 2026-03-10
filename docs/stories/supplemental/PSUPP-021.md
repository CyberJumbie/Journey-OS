# PSUPP-021: Section Sequence Modeler (/institution/sequence)
**Group:** New Institutional Screens
**Component:** `SectionSequenceModeler` | `pages/institution/SectionSequenceModeler.tsx`
**Priority:** P1 — NEW screen added this session; enables prerequisite-aware curriculum planning
**Depends:** P3-006 (SLO→ILO linking), GRAPH_SCHEMA (PREREQUISITE_OF relationships exist in P5)
**Specialist:** @frontend-specialist + @coverage-specialist

**As an** Institution Admin or Curriculum Committee Chair
**I want** to model the sequence of course sections and define prerequisite relationships between them
**So that** the platform knows which concepts must be mastered before others, enabling proper BKT prerequisite chains and LCME sequence compliance

## What This Enables
- Defines `PREREQUISITE_OF` edges in Neo4j between `SubConcept` nodes
- These edges are used by Phase 5 BKT engine for prerequisite-aware mastery tracking
- Also used by Advisor at-risk drill-down (PSUPP-022 / P5-016) to identify root-cause gaps

## Acceptance Criteria
- Route: `/institution/sequence`
- Two views (toggle):
  1. **Table/List View** — each course listed with its weeks, each week with SubConcepts; drag to set week order
  2. **Prerequisite Graph View** — D3 DAG (directed acyclic graph) of SubConcept → PREREQUISITE_OF → SubConcept; add/remove edges visually

### Table View
- Courses listed in curriculum sequence order (drag courses to reorder)
- Per course: weeks in order, SubConcepts per week
- "Add Prerequisite" on any SubConcept → opens search modal to select the concept that must come first
- Prerequisite shown as arrow between SubConcept rows

### Graph View
- D3 force DAG: nodes = SubConcepts, directed edges = PREREQUISITE_OF
- Filter by USMLE system or course
- Click node: shows its prereqs and what depends on it
- Drag-to-connect creates new PREREQUISITE_OF edge
- Delete edge by clicking it + "Remove Prerequisite"

### Backend
- `GET /api/v1/institution/sequence` — list all PREREQUISITE_OF edges
- `POST /api/v1/institution/sequence/prerequisites` — create edge: `{ fromConceptId, toConceptId }`
- `DELETE /api/v1/institution/sequence/prerequisites/:id` — remove edge
- Cypher for create:
```cypher
MATCH (sc1:SubConcept {uuid: $fromId}), (sc2:SubConcept {uuid: $toId})
MERGE (sc1)-[r:PREREQUISITE_OF]->(sc2)
RETURN r
```
- Cycle detection: before creating edge, run BFS from `toConceptId` — if `fromConceptId` is reachable, reject (would create cycle)
- Neo4j only — no Supabase table needed for prerequisites (relationship exists in graph)

## Files to Create
- `frontend/src/app/(institution)/institution/sequence/page.tsx`
- `frontend/src/components/organisms/PrerequisiteDAG/PrerequisiteDAG.tsx`
- `frontend/src/hooks/useSequenceModeler.ts`
- `backend/src/controllers/sequence.controller.ts`
- `backend/src/routes/sequence.routes.ts`

## Smoke Test
```bash
# Add a prerequisite
curl -X POST "localhost:3001/api/v1/institution/sequence/prerequisites" \
  -H "Authorization: Bearer $INST_ADMIN_JWT" \
  -d '{"fromConceptId":"action-potential-uuid","toConceptId":"cardiac-contractility-uuid"}'
# Expected: 200, PREREQUISITE_OF edge created

# Try to create cycle
curl -X POST "localhost:3001/api/v1/institution/sequence/prerequisites" \
  -H "Authorization: Bearer $INST_ADMIN_JWT" \
  -d '{"fromConceptId":"cardiac-contractility-uuid","toConceptId":"action-potential-uuid"}'
# Expected: 400, "Would create a cycle in prerequisite graph"
```
