# Journey OS — Seed Validation Specification v1.0

**Date:** February 19, 2026  
**Purpose:** Acceptance criteria for every seeding phase. The kg-seeder passes only when these counts and queries return expected values. No "close enough" — counts must be exact for framework nodes and within 10% tolerance for extracted content nodes.  
**Reference:** Architecture v10.0, NODE_REGISTRY v1.0

---

## Phase 1: Institutional Structure (Sprint 1, Story 1.1)

### Expected Counts

| Label | Expected | Source |
|-------|----------|--------|
| `Institution` | 1 | MSM |
| `School` | 1 | School of Medicine |
| `Program` | 1 | M.D. Program |
| `ProgramTrack` | 2 | 4-Year, 5-Year |
| `AcademicYear` | 4 | M1, M2, M3, M4 |
| `CurricularPhase` | 3–4 | Pre-clerkship, Clerkship, Post-clerkship (+Transition) |
| `Block` | ~6 | Mechanisms of Disease, Organ Systems I, II, etc. |
| `Course` | ~14–22 | From MSM Academic Catalog |
| `Section` | ~28 | Current year sections |
| `AcademicTerm` | 4+ | Fall/Spring per year |
| `ILO` | ~70–140 | From catalog course descriptions |
| **Total Layer 1** | **~65–70** | (excluding ILOs, which seed with courses) |

### Validation Queries

```cypher
-- 1. Total Layer 1 count
MATCH (n) WHERE any(l IN labels(n) WHERE l IN [
  'Institution','School','Program','ProgramTrack','AcademicYear',
  'CurricularPhase','Block','Course','Section','AcademicTerm','ILO'
])
RETURN count(n) AS total
// PASS: 65–210 (varies with ILO count)

-- 2. Hierarchy integrity — every Course reachable from Institution
MATCH (i:Institution)-[:HAS_SCHOOL]->(:School)-[:HAS_PROGRAM]->(:Program)
  -[:HAS_YEAR]->(:AcademicYear)-[:HAS_PHASE]->(:CurricularPhase)
  -[:HAS_BLOCK]->(:Block)-[:HAS_COURSE]->(c:Course)
RETURN count(DISTINCT c) AS reachable_courses
// PASS: equals total Course count (no orphan courses)

-- 3. No orphan ILOs
MATCH (ilo:ILO) WHERE NOT ()-[:HAS_ILO]->(ilo)
RETURN count(ilo) AS orphan_ilos
// PASS: 0

-- 4. Idempotency check — run seeder twice
// Before: MATCH (n:Institution) RETURN count(n) → 1
// After re-run: MATCH (n:Institution) RETURN count(n) → 1 (not 2)
```

---

## Phase 2: Framework Alignment (Sprint 1, Story 1.2)

### Expected Counts (EXACT)

| Label | Expected | Tolerance |
|-------|----------|-----------|
| `USMLE_System` | 16 | ±0 |
| `USMLE_Discipline` | 7 | ±0 |
| `USMLE_Task` | 4 | ±0 |
| `USMLE_Topic` | ~200 | ±20 |
| `LCME_Standard` | 12 | ±0 |
| `LCME_Element` | 93 | ±0 |
| `ACGME_Domain` | 6 | ±0 |
| `ACGME_Subdomain` | 21 | ±0 |
| `AAMC_Domain` | 6 | ±0 |
| `AAMC_Competency` | 49 | ±0 |
| `EPA` | 13 | ±0 |
| `BloomLevel` | 6 | ±0 |
| `MillerLevel` | 4 | ±0 |
| `UME_Competency` | 6 | ±0 |
| `UME_Subcompetency` | 49 | ±0 |
| **Total Layer 2** | **~492** | ±20 (from USMLE_Topic) |

### Validation Queries

```cypher
-- 1. Per-label count check
UNWIND [
  {label: 'USMLE_System', expected: 16},
  {label: 'USMLE_Discipline', expected: 7},
  {label: 'USMLE_Task', expected: 4},
  {label: 'LCME_Standard', expected: 12},
  {label: 'LCME_Element', expected: 93},
  {label: 'ACGME_Domain', expected: 6},
  {label: 'ACGME_Subdomain', expected: 21},
  {label: 'AAMC_Domain', expected: 6},
  {label: 'AAMC_Competency', expected: 49},
  {label: 'EPA', expected: 13},
  {label: 'BloomLevel', expected: 6},
  {label: 'MillerLevel', expected: 4},
  {label: 'UME_Competency', expected: 6},
  {label: 'UME_Subcompetency', expected: 49}
] AS check
CALL {
  WITH check
  CALL db.labels() YIELD label WHERE label = check.label
  MATCH (n) WHERE check.label IN labels(n)
  RETURN count(n) AS actual
}
RETURN check.label, check.expected, actual, 
       CASE WHEN actual = check.expected THEN '✅ PASS' ELSE '❌ FAIL' END AS status

-- 2. USMLE hierarchy — every Topic has a parent System
MATCH (t:USMLE_Topic) WHERE NOT (:USMLE_System)-[:HAS_TOPIC]->(t)
RETURN count(t) AS orphan_topics
// PASS: 0

-- 3. UME → ACGME bridge completeness
MATCH (u:UME_Competency)-[:ALIGNS_WITH]->(a:ACGME_Domain)
RETURN count(*) AS bridges
// PASS: 6

-- 4. LCME hierarchy
MATCH (s:LCME_Standard)-[:HAS_ELEMENT]->(e:LCME_Element)
RETURN s.number, count(e) AS elements ORDER BY s.number
// PASS: 12 rows, sum of elements = 93

-- 5. Bloom ordering
MATCH (b1:BloomLevel)-[:NEXT_LEVEL]->(b2:BloomLevel)
RETURN b1.name, b1.level, b2.name, b2.level
// PASS: 5 rows (1→2, 2→3, 3→4, 4→5, 5→6)

-- 6. No deprecated labels present
CALL db.labels() YIELD label
WHERE label IN ['USMLESystem','LCMEStandard','ACGMEDomain','LearningObjective','ALIGNS_TO']
RETURN collect(label) AS deprecated_labels_found
// PASS: empty list
```

---

## Phase 3: Concepts & Content (Sprint 2, Sprint 4–5)

### Expected Counts (from MEDI 531 demo course)

| Entity | Expected | Notes |
|--------|----------|-------|
| `ContentChunk` | ~50–100 | From test syllabus + 1 lecture |
| `SubConcept` | ~30–80 | Extracted from chunks |
| `SLO` | ~20–50 | Extracted from syllabus |
| `ProficiencyVariable` | 1:1 with SubConcept | Auto-created |
| `MisconceptionCategory` | ~10–30 | Extracted by Claude |

### Validation Queries

```cypher
-- 1. SLO → ILO coverage
MATCH (slo:SLO) 
OPTIONAL MATCH (slo)-[:FULFILLS]->(ilo:ILO)
RETURN count(slo) AS total_slos, 
       count(ilo) AS mapped_to_ilo,
       count(slo) - count(ilo) AS unmapped
// PASS: unmapped should decrease as faculty reviews progress

-- 2. TEACHES vs TEACHES_VERIFIED
MATCH ()-[t:TEACHES]->() RETURN count(t) AS unverified
MATCH ()-[tv:TEACHES_VERIFIED]->() RETURN count(tv) AS verified
// Initially: all TEACHES, zero TEACHES_VERIFIED
// After review: TEACHES_VERIFIED count > 0

-- 3. SubConcept dedup check — no near-duplicates
MATCH (s1:SubConcept), (s2:SubConcept) 
WHERE s1.id < s2.id AND s1.name =~ ('(?i).*' + s2.name + '.*')
RETURN s1.name, s2.name
// PASS: few results (name-based check; embedding dedup at 0.92 is the real guard)

-- 4. ProficiencyVariable 1:1
MATCH (sc:SubConcept) OPTIONAL MATCH (sc)-[:MAPPED_TO]->(pv:ProficiencyVariable)
WHERE pv IS NULL
RETURN count(sc) AS subconcepts_without_pv
// PASS: 0
```

---

## Phase 4: Assessment Items (Sprint 6+)

### Validation Queries

```cypher
-- 1. Dual-link check — every approved item has both SLO and SubConcept links
MATCH (item:AssessmentItem {status: 'approved'})
OPTIONAL MATCH (item)-[:ASSESSES]->(slo:SLO)
OPTIONAL MATCH (item)-[:TARGETS]->(sc:SubConcept)
WHERE slo IS NULL OR sc IS NULL
RETURN count(item) AS items_missing_links
// PASS: 0

-- 2. Option count — every item has 5 options with exactly 1 correct
MATCH (item:AssessmentItem)-[:HAS_OPTION]->(opt:Option)
WITH item, count(opt) AS opt_count, sum(CASE WHEN opt.correct THEN 1 ELSE 0 END) AS correct_count
WHERE opt_count != 5 OR correct_count != 1
RETURN item.id, opt_count, correct_count
// PASS: 0 rows

-- 3. Coverage chain completeness
MATCH (item:AssessmentItem {status: 'approved'})-[:ASSESSES]->(slo:SLO)
  -[:FULFILLS]->(ilo:ILO)-[:ADDRESSES_LCME]->(lcme:LCME_Element)
RETURN count(DISTINCT item) AS items_with_full_lcme_chain
// Should grow as items are approved

-- 4. USMLE coverage (inherited through SubConcept)
MATCH (item:AssessmentItem {status: 'approved'})-[:TARGETS]->(sc:SubConcept)
  -[:MAPS_TO]->(us:USMLE_System)
RETURN us.name, count(DISTINCT item) AS item_count ORDER BY item_count DESC
```

---

## Supabase Validation

```sql
-- 1. Embedding dimension check
SELECT vector_dims(embedding) AS dims, count(*) 
FROM content_chunk_embeddings 
GROUP BY 1;
-- PASS: all rows = 1024

-- 2. Sync status check
SELECT sync_status, count(*) 
FROM content_chunks 
GROUP BY 1;
-- PASS: 'failed' count = 0

-- 3. Dual-write consistency
SELECT cc.id, cc.graph_node_id IS NOT NULL AS has_neo4j_node
FROM content_chunks cc
WHERE cc.sync_status = 'synced' AND cc.graph_node_id IS NULL;
-- PASS: 0 rows

-- 4. Toulmin completeness (for approved items)
SELECT id, 
  toulmin ? 'claim' AS has_claim,
  toulmin ? 'warrant' AS has_warrant,
  toulmin ? 'backing' AS has_backing,
  toulmin ? 'rebuttal' AS has_rebuttal,
  toulmin ? 'qualifier' AS has_qualifier
FROM assessment_items 
WHERE status = 'approved' 
  AND (NOT toulmin ? 'claim' OR NOT toulmin ? 'warrant');
-- PASS: 0 rows
```

---

## Automated Seed Health Check Script

Run via: `pnpm kg:validate`

```bash
#!/bin/bash
# services/kg-seeder/validate.sh

echo "=== Journey OS Seed Validation ==="

# Layer 1 count
L1=$(cypher-shell "MATCH (n) WHERE any(l IN labels(n) WHERE l IN ['Institution','School','Program','ProgramTrack','AcademicYear','CurricularPhase','Block','Course','Section','AcademicTerm']) RETURN count(n)" --format plain)
echo "Layer 1 nodes: $L1 (expected: 55-70)"

# Layer 2 exact checks
for label_count in "USMLE_System:16" "USMLE_Discipline:7" "USMLE_Task:4" "LCME_Standard:12" "LCME_Element:93" "ACGME_Domain:6" "EPA:13" "BloomLevel:6" "MillerLevel:4" "UME_Competency:6" "UME_Subcompetency:49"; do
  label="${label_count%%:*}"
  expected="${label_count##*:}"
  actual=$(cypher-shell "MATCH (n:$label) RETURN count(n)" --format plain)
  if [ "$actual" = "$expected" ]; then
    echo "✅ $label: $actual (expected $expected)"
  else
    echo "❌ $label: $actual (expected $expected)"
    exit 1
  fi
done

# Deprecated labels check
deprecated=$(cypher-shell "CALL db.labels() YIELD label WHERE label IN ['USMLESystem','LCMEStandard','LearningObjective'] RETURN collect(label)" --format plain)
if [ "$deprecated" = "[]" ]; then
  echo "✅ No deprecated labels"
else
  echo "❌ Deprecated labels found: $deprecated"
  exit 1
fi

# Embedding dimension check
dims=$(psql "$SUPABASE_DB_URL" -t -c "SELECT DISTINCT vector_dims(embedding) FROM content_chunk_embeddings;")
if [ "$(echo $dims | xargs)" = "1024" ]; then
  echo "✅ Embedding dimensions: 1024"
else
  echo "❌ Wrong embedding dimensions: $dims (expected 1024)"
  exit 1
fi

echo "=== All checks passed ==="
```

---

*This specification defines pass/fail gates for every seeding phase. The kg-seeder is not considered complete until `pnpm kg:validate` passes. NODE_REGISTRY v1.0 is the authority for all label and relationship names.*
