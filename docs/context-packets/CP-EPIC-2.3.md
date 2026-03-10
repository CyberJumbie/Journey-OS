# CP-EPIC-2.3 — ECD + TaskShells (Weeks 13–14)
**Stories:** P2-013 · P2-014 · P2-015 · P2-016 · P2-017
**Auto-loaded by:** `/story P2-01N` where N = 3–7

---

## What This Epic Builds

Activates the Evidence-Centered Design layer. Seeds TaskShell nodes (12 question archetypes), creates ProficiencyVariables (1:1 with SubConcepts), generates Toulmin arguments for every item, and wires the context compiler to select the right TaskShell before generation begins.

**Exit gate:** Every generated item has a Toulmin argument. TaskShell selection happens before generation. ProficiencyVariables exist for all SubConcepts.

---

## Prerequisites

- Epic 2.1 complete: tagger, critic, review_router operational
- P1-013: SubConcepts extracted and in Neo4j
- P1-006: Layer 2 seed (BloomLevel nodes exist — needed for AT_BLOOM_RANGE links)

---

## ECD Architecture Overview

```
TaskShell           — What question archetype? (TS-001: Clinical Vignette MCQ)
ProficiencyVariable — What are we measuring? (1:1 with SubConcept)
ToulminArgument     — What is the evidentiary claim? (stored as JSONB on assessment_items)

Relationship chain:
ProficiencyVariable -[:MAPPED_TO]->    SubConcept       (what we measure → what MSM teaches)
ProficiencyVariable -[:ASSESSED_BY]->  TaskShell        (how to measure it)
TaskShell           -[:AT_BLOOM_RANGE]-> BloomLevel      (which Bloom levels this shell targets)
AssessmentItem      -[:INSTANTIATES]->  TaskShell        (this item is an instance of this shell)
```

---

## Layer 3 Seed: TaskShell Nodes

```typescript
// seeder/src/seed-layer3-taskshells.ts
const TASK_SHELLS = [
  {
    shellId: 'TS-001', name: 'Clinical Vignette MCQ',
    bloomMin: 2, bloomMax: 4, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'best-worst',
  },
  {
    shellId: 'TS-002', name: 'Mechanism of Disease',
    bloomMin: 2, bloomMax: 3, vignetteRequired: false, optionCount: 5,
    distractorStrategy: 'common-misconceptions',
  },
  {
    shellId: 'TS-003', name: 'Diagnosis MCQ',
    bloomMin: 3, bloomMax: 4, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'differential-diagnosis',
  },
  {
    shellId: 'TS-004', name: 'Treatment/Management',
    bloomMin: 3, bloomMax: 5, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'treatment-alternatives',
  },
  {
    shellId: 'TS-005', name: 'Pathophysiology Chain',
    bloomMin: 2, bloomMax: 3, vignetteRequired: false, optionCount: 5,
    distractorStrategy: 'causal-chain-errors',
  },
  {
    shellId: 'TS-006', name: 'Drug Mechanism',
    bloomMin: 1, bloomMax: 2, vignetteRequired: false, optionCount: 5,
    distractorStrategy: 'drug-class-confusion',
  },
  {
    shellId: 'TS-007', name: 'Lab Interpretation',
    bloomMin: 3, bloomMax: 4, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'lab-pattern-errors',
  },
  {
    shellId: 'TS-008', name: 'Anatomy/Histology',
    bloomMin: 1, bloomMax: 2, vignetteRequired: false, optionCount: 5,
    distractorStrategy: 'adjacent-structures',
  },
  {
    shellId: 'TS-009', name: 'Prevention/Screening',
    bloomMin: 3, bloomMax: 4, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'guideline-alternatives',
  },
  {
    shellId: 'TS-010', name: 'Pharmacotherapy',
    bloomMin: 3, bloomMax: 5, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'drug-interaction-errors',
  },
  {
    shellId: 'TS-011', name: 'Emergency/Acute Management',
    bloomMin: 4, bloomMax: 6, vignetteRequired: true, optionCount: 5,
    distractorStrategy: 'urgency-errors',
  },
  {
    shellId: 'TS-012', name: 'Epidemiology/Statistics',
    bloomMin: 2, bloomMax: 4, vignetteRequired: false, optionCount: 5,
    distractorStrategy: 'statistical-traps',
  },
];
```

Cypher for each TaskShell:
```cypher
MERGE (ts:TaskShell {shellId: $shellId})
ON CREATE SET
  ts.uuid = $uuid,
  ts.name = $name,
  ts.bloomMin = $bloomMin,
  ts.bloomMax = $bloomMax,
  ts.vignetteRequired = $vignetteRequired,
  ts.optionCount = $optionCount,
  ts.distractorStrategy = $distractorStrategy,
  ts.createdAt = datetime()
WITH ts
MATCH (bl:BloomLevel) WHERE bl.level >= ts.bloomMin AND bl.level <= ts.bloomMax
MERGE (ts)-[:AT_BLOOM_RANGE]->(bl)
RETURN ts
```

---

## ProficiencyVariable Creation Pattern

Created automatically in `ConceptExtractorNode` during ingestion (same file as SubConcept extraction):

```typescript
// After SubConcept is created:
const pvUuid = uuidv4();
await neo4j.session().run(`
  MERGE (pv:ProficiencyVariable {name: $pvName})
  ON CREATE SET pv.uuid = $pvUuid, pv.subConceptUuid = $scUuid, pv.createdAt = datetime()
  WITH pv
  MATCH (sc:SubConcept {uuid: $scUuid})
  MERGE (pv)-[:MAPPED_TO]->(sc)
  RETURN pv
`, { pvName: `pv_${subConcept.name}`, pvUuid, scUuid: subConcept.uuid });
```

TaskShell linking happens in `seed-pv-taskshell-links.ts` and thereafter in `ConceptExtractorNode`:

```cypher
MATCH (pv:ProficiencyVariable {uuid: $pvUuid})
MATCH (ts:TaskShell)
WHERE ts.bloomMin <= $bloomGuess AND ts.bloomMax >= $bloomGuess
WITH pv, ts, (ts.bloomMax - ts.bloomMin) AS bloomRange
ORDER BY bloomRange ASC
LIMIT 3
WITH collect({ts: ts, rank: 1 + toInteger(rank())}) AS ranked
UNWIND ranked AS r
MATCH (pv:ProficiencyVariable {uuid: $pvUuid})
MERGE (pv)-[:ASSESSED_BY {priority: r.rank}]->(r.ts)
```

---

## Toulmin Prompt Structure

```
backend/src/pipeline/prompts/toulmin-generator-system.txt
```

The prompt receives the full generated item (vignette + stem + options + explanation) and asks Claude Sonnet to produce a structured Toulmin argument:

```
Given this NBME-style assessment item:

VIGNETTE: {vignette}
STEM: {stem}
OPTIONS: {options}
CORRECT ANSWER: {correct_option}
EXPLANATION: {explanation}

Produce a Toulmin evidentiary argument with exactly these 6 fields.
Return ONLY valid JSON, no preamble, no markdown fences.

{
  "claim": "The specific medical assertion being tested",
  "data": "The evidence from the vignette that supports answering correctly",
  "warrant": "The medical reasoning linking the data to the claim",
  "backing": "The authoritative source (guideline, textbook principle) that grounds the warrant",
  "rebuttal": "Why each distractor is plausible but wrong",
  "qualifier": "Conditions or patient populations where this claim might not hold"
}

All fields must be non-empty strings. Use 'N/A' if a field truly cannot be filled.
```

---

## context_compiler ECD Sub-Steps (P2-016)

These 3 sub-steps run WITHIN `ContextCompilerNode.ts` — no new node, just expanded logic:

```typescript
// Step 4a: Evidence Design — identify the evidentiary claim
const evidenceClaim = await identifyEvidenceClaim(state.targetConcepts, state.context);

// Step 4b: Task Family selection — find matching TaskShell
const taskShell = await selectTaskShell(state.targetConcepts, state.userMessage);
// Query: MATCH (pv:ProficiencyVariable)-[:MAPPED_TO]->(sc:SubConcept {name: $name})
//        MATCH (pv)-[:ASSESSED_BY {priority: 1}]->(ts:TaskShell)
//        RETURN ts LIMIT 1

// Step 4c: Instance specification — build generation parameters
const genParams = {
  vignetteRequired: taskShell.vignetteRequired,
  optionCount: taskShell.optionCount,
  distractorStrategy: taskShell.distractorStrategy,
  bloomTarget: Math.floor((taskShell.bloomMin + taskShell.bloomMax) / 2),
};

// Inject into downstream prompts via WorkbenchState
return { ...state, taskShellId: taskShell.shellId, generationParams: genParams };
```

---

## Graph Relationships After Epic 2.3

```cypher
// What the full ECD graph looks like for one item
MATCH (ai:AssessmentItem {uuid: $itemUuid})
MATCH (ai)-[:TARGETS]->(sc:SubConcept)
MATCH (pv:ProficiencyVariable)-[:MAPPED_TO]->(sc)
MATCH (pv)-[:ASSESSED_BY]->(ts:TaskShell)
MATCH (ai)-[:INSTANTIATES]->(ts)
RETURN ai.uuid, sc.name, pv.name, ts.name, ts.shellId
```

Add `INSTANTIATES` relationship in `graph_writer` node (Phase 1 node, minor update):
```cypher
MATCH (ai:AssessmentItem {uuid: $itemUuid})
MATCH (ts:TaskShell {shellId: $taskShellId})
MERGE (ai)-[:INSTANTIATES]->(ts)
```

---

## New Files (Epic 2.3)

```
seeder/src/seed-layer3-taskshells.ts
seeder/src/seed-pv-taskshell-links.ts
backend/src/pipeline/nodes/ToulminGeneratorNode.ts
backend/src/pipeline/prompts/toulmin-generator-system.txt
```

---

## Smoke Tests

```bash
# 1. TaskShell seed (12 nodes)
pnpm seed:layer3
# Cypher check:
# MATCH (ts:TaskShell) RETURN count(ts)  → 12

# 2. ProficiencyVariables exist (1:1 with SubConcepts)
# MATCH (pv:ProficiencyVariable) RETURN count(pv)
# MATCH (sc:SubConcept) RETURN count(sc)
# Expected: equal counts

# 3. ASSESSED_BY relationships
# MATCH (pv:ProficiencyVariable)-[:ASSESSED_BY]->(ts:TaskShell) RETURN count(*) → ≥ SubConcept count

# 4. Toulmin populated on generated items
curl "localhost:3001/api/v1/items?courseId=medi-531&limit=1" \
  -H "Authorization: Bearer $JWT" | jq '.data[0].toulmin'
# Expected: { claim, data, warrant, backing, rebuttal, qualifier } — all non-empty

# 5. task_shell_id set on items
psql $SUPABASE_DB_URL -c "SELECT task_shell_id, count(*) FROM assessment_items GROUP BY task_shell_id;"
# Expected: rows for TS-001, TS-003, TS-004 etc. — not all null
```

---

## Failure Modes

1. **No ProficiencyVariable for SubConcept** → `selectTaskShell` falls back to `TS-001` (default Clinical Vignette) — never blocks generation
2. **Toulmin Sonnet timeout** → log warning, set `toulmin: null`, continue to review_router. Critic score not affected.
3. **bloomGuess unavailable** → use Bloom 3 as default for TaskShell selection (middle of range)
4. **`seed-pv-taskshell-links.ts` run twice** → idempotent: MERGE prevents duplicate ASSESSED_BY edges
5. **INSTANTIATES added to graph_writer** → graph_writer already runs in Phase 1; only add INSTANTIATES if `taskShellId` is non-null (backward compatible)
