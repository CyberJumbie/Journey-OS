# CP-EPIC-3.2 — USMLE Gap Detection (Weeks 19–20)
**Stories:** P3-007 · P3-008 · P3-009 · P3-010
**Auto-loaded by:** `/story P3-00N` where N = 7–10

---

## What This Epic Builds

Transforms the knowledge graph into institutional intelligence. Builds the 16×7 USMLE heatmap, adds automated gap priority scoring, computes weekly graph centrality (PageRank + betweenness), and closes the loop by letting faculty jump from a gap cell directly into the workbench.

**Exit gate:** Heatmap renders with real data. Click gap → pre-filled workbench generation. Gap alerts visible on dashboard.

---

## Prerequisites

- P3-003: All 9 courses ingested
- P3-004: SubConcepts deduplicated
- P1-015: MAPS_TO edges (SubConcept → USMLE_System/USMLE_Discipline) exist
- P1-006: All 16 USMLE_System + 7 USMLE_Discipline nodes seeded

---

## USMLE Systems (16) and Disciplines (7)

### 16 Systems (rows in heatmap)
```
Cardiovascular System, Pulmonary System, Renal/Urinary System,
Gastrointestinal System, Musculoskeletal System, Reproductive System,
Endocrine System, Hematology/Lymphoreticular System, Nervous System/Neurology,
Psychiatry/Behavioral Science, Dermatology, Immune System/Immunology,
Infectious Disease, Nutrition/Digestion, Multisystem, General Principles
```

### 7 Disciplines (columns in heatmap)
```
Pathology, Physiology, Biochemistry, Pharmacology,
Microbiology, Anatomy, Behavioral Science
```

---

## Heatmap Cypher Query

```cypher
// Full heatmap — returns all 112 cells (including empties)
MATCH (sys:USMLE_System)
MATCH (disc:USMLE_Discipline)
OPTIONAL MATCH (sc:SubConcept)-[:MAPS_TO]->(sys)
OPTIONAL MATCH (sc2:SubConcept)-[:MAPS_TO]->(disc)
WITH sys, disc,
     count(DISTINCT sc) AS system_concepts,
     count(DISTINCT sc2) AS discipline_concepts
OPTIONAL MATCH (ai:AssessmentItem {status: 'approved'})-[:TARGETS]->(sc3:SubConcept)-[:MAPS_TO]->(sys)
OPTIONAL MATCH (ai2:AssessmentItem {status: 'approved'})-[:TARGETS]->(sc4:SubConcept)-[:MAPS_TO]->(disc)
RETURN
  sys.name AS system,
  disc.name AS discipline,
  count(DISTINCT ai) AS item_count,
  count(DISTINCT sc3) AS covered_concepts,
  system_concepts AS total_system_concepts,
  discipline_concepts AS total_disc_concepts,
  CASE WHEN system_concepts = 0 THEN 0
       ELSE round(count(DISTINCT sc3) * 100.0 / system_concepts) END AS coverage_pct
ORDER BY sys.name, disc.name
```

> **Note:** A simplified approximation — perfect System × Discipline intersection requires a two-level MAPS_TO traversal if SubConcepts map to both. If performance is slow (> 3s), cache result in Redis for 30 minutes.

---

## USMLE Step 1 Weights (published content specification)

These are the official USMLE Step 1 content area weights used in P3-008 priority scoring:

```typescript
const USMLE_STEP1_WEIGHTS: Record<string, number> = {
  'General Principles':           0.12,
  'Immune System/Immunology':     0.06,
  'Hematology/Lymphoreticular System': 0.06,
  'Nervous System/Neurology':     0.11,
  'Psychiatry/Behavioral Science': 0.10,
  'Musculoskeletal System':       0.07,
  'Cardiovascular System':        0.09,
  'Pulmonary System':             0.07,
  'Gastrointestinal System':      0.06,
  'Renal/Urinary System':         0.05,
  'Reproductive System':          0.07,
  'Endocrine System':             0.06,
  'Dermatology':                  0.05,
  'Multisystem':                  0.03,
  'Infectious Disease':           0.06,  // distributed across systems on real exam
  'Nutrition/Digestion':          0.04,
};

const USMLE_DISCIPLINE_WEIGHTS: Record<string, number> = {
  'Pathology':          0.25,
  'Physiology':         0.20,
  'Pharmacology':       0.18,
  'Biochemistry':       0.12,
  'Microbiology':       0.10,
  'Anatomy':            0.08,
  'Behavioral Science': 0.07,
};
```

---

## Priority Scoring Formula (P3-008)

```typescript
function computePriorityScore(cell: HeatmapCell, pagerank: Record<string, number>): number {
  const coverageFactor = 1 - (cell.coveragePct / 100);     // 0=covered, 1=empty
  const usmleWeight = (
    (USMLE_STEP1_WEIGHTS[cell.system] || 0.05) +
    (USMLE_DISCIPLINE_WEIGHTS[cell.discipline] || 0.07)
  ) / 2;
  const centralityFactor = pagerank[`${cell.system}:${cell.discipline}`] || 0.5;
  const recencyFactor = computeRecency(cell.lastChunkDate);   // newer = higher

  return (
    coverageFactor   * 0.35 +
    usmleWeight      * 0.30 +
    centralityFactor * 0.20 +
    recencyFactor    * 0.15
  );
}
```

---

## PageRank: GDS vs Fallback Cypher

### Option A: Neo4j GDS (Aura Professional)
```cypher
CALL gds.pageRank.write('subConceptGraph', {
  maxIterations: 20, dampingFactor: 0.85,
  writeProperty: 'pagerank',
  relationshipWeightProperty: 'confidence'
})
YIELD nodePropertiesWritten
```

### Option B: Manual Cypher Fallback (Aura Free)
```cypher
// Simplified PageRank via APOC (if available) or iterative Cypher
// Initialize
MATCH (sc:SubConcept) SET sc.pagerank = 1.0;

// Iterate 10 times
UNWIND range(1, 10) AS iteration
MATCH (sc:SubConcept)
OPTIONAL MATCH (sc)<-[:TEACHES]-(cc:ContentChunk)
WITH sc, count(DISTINCT cc) AS inDegree
SET sc.pagerank = 0.15 + 0.85 * (inDegree * 1.0 / 10);
```

Check Aura tier at startup:
```typescript
// In graph-analytics.function.ts
const hasGDS = await neo4j.run(`CALL gds.list() YIELD name RETURN count(*) AS n`);
const useGDS = hasGDS.records[0].get('n') > 0;
```

---

## Gap-to-Generation URL Pattern

```
/workbench?system=Cardiovascular+System&discipline=Pharmacology&courseId=medi-531

// Workbench reads params and auto-sends:
// "Generate a Pharmacology question on the Cardiovascular System for MEDI 531 Organ Systems I"
```

In `page.tsx`:
```typescript
const { system, discipline, courseId } = searchParams;
const gapPrompt = system && discipline
  ? `Generate a ${discipline} question covering ${system}` + (courseId ? ` for ${courseName}` : '')
  : null;
```

In `useCopilotReadable`:
```typescript
useCopilotReadable({ description: 'gap_prefill', value: gapPrompt });
```

CopilotKit auto-action on mount:
```typescript
useCopilotAction({
  name: 'auto_generate_from_gap',
  available: gapPrompt ? 'enabled' : 'disabled',
  handler: async () => { /* auto-send gapPrompt on mount */ },
});
```

---

## New Files (Epic 3.2)

```
backend/src/controllers/analytics.controller.ts
backend/src/repositories/analytics.repository.ts
backend/src/routes/analytics.routes.ts
backend/src/inngest/graph-analytics.function.ts
frontend/src/hooks/useUSMLEHeatmap.ts
frontend/src/hooks/useGapPriorities.ts
frontend/src/hooks/useGapPreFill.ts
frontend/src/components/organisms/USMLEHeatmap/USMLEHeatmap.tsx
frontend/src/app/(faculty)/analytics/usmle-heatmap/page.tsx
frontend/src/app/(faculty)/analytics/gaps/page.tsx
backend/supabase/migrations/20260102000000_analytics_tables.sql
```

---

## Smoke Tests

```bash
# 1. Heatmap data (112 cells)
curl "localhost:3001/api/v1/analytics/usmle-heatmap" -H "Authorization: Bearer $JWT" | \
  jq '.cells | length'
# Expected: 112

# 2. Some cells are 0 (gaps exist)
curl "localhost:3001/api/v1/analytics/usmle-heatmap" -H "Authorization: Bearer $JWT" | \
  jq '[.cells[] | select(.itemCount == 0)] | length'
# Expected: > 50 (many gaps initially)

# 3. Gap priorities
curl "localhost:3001/api/v1/analytics/gap-priorities?limit=5" -H "Authorization: Bearer $JWT"
# Expected: 5 gaps with priorityScore 0.0–1.0

# 4. PageRank computed
curl -X POST "localhost:3001/api/v1/admin/graph-analytics-run" -H "Authorization: Bearer $ADMIN_JWT"
# MATCH (sc:SubConcept) WHERE sc.pagerank IS NOT NULL RETURN count(sc) → > 0

# 5. Gap-to-generation flow
# Navigate to /analytics/usmle-heatmap → click gap cell → verify workbench URL has params
# Check workbench auto-sends message (check CopilotKit chat log)
```
