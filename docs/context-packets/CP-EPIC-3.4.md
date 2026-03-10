# CP-EPIC-3.4 — LCME Compliance MVP + UMLS LOD (Weeks 23–24)
**Stories:** P3-015 · P3-016 · P3-017 · P3-018 (UMLS — pulled forward from Phase 4)
**Auto-loaded by:** `/story P3-01N` where N = 5–18

---

## What This Epic Builds

Delivers the LCME compliance dashboard (12-standard heatmap), the full evidence chain query (element → ILO → SLO → SubConcept → AssessmentItem), CSV/JSON evidence export, and **UMLS LOD enrichment** (StandardTerm nodes with CUI, SNOMED CT, MeSH — pulled forward from Phase 4).

**Exit gate:** LCME dashboard shows coverage for all 12 standards / 93 elements. Evidence exportable in < 60 seconds. At least 50% of SubConcepts have UMLS CUI grounding.

---

## Prerequisites

- P3-006: SLO → ILO FULFILLS edges created
- P1-006: LCME_Standard + LCME_Element nodes seeded in Phase 1 (Layer 2)
- P3-004: SubConcepts deduplicated (stable before UMLS enrichment)
- `UMLS_API_KEY` provisioned (free from NLM: https://uts.nlm.nih.gov/uts/signup-login)

---

## LCME Structure (12 Standards / 93 Elements — seeded in P1-006)

| Standard | Name | ~Elements |
|---|---|---|
| MS | Mission, Planning, Organization, Integrity | 5 |
| ER | Educational Program Objectives | 7 |
| LE | Learning Environment and Culture | 6 |
| FA | Faculty Preparation and Support | 7 |
| EC | Educational Resources and Infrastructure | 9 |
| AE | Accreditation | 3 |
| IS | Curriculum Design, Content, and Duration | 12 |
| DC | Curriculum Management and Evaluation | 8 |
| IM | Individual Student Progress | 10 |
| PE | Faculty and Student Resources | 8 |
| SQ | Socially Accountable Mission | 9 |
| OB | Outcomes | 9 |
| **Total** | | **93** |

Key elements for assessment evidence: IS-2 (clinical sciences), IS-11 (basic sciences), IM-1–IM-4 (student evaluation), OB-1–OB-5 (outcomes data).

---

## LCME Coverage Chain Query (Full)

```cypher
// P3-016: evidence chain for one element
MATCH (lcme_el:LCME_Element {elementId: $elementId})-[:BELONGS_TO]->(std:LCME_Standard)
OPTIONAL MATCH (lcme_el)<-[:ALIGNS_TO]-(ilo:ILO)
OPTIONAL MATCH (ilo)<-[:FULFILLS]-(slo:SLO)
OPTIONAL MATCH (slo)<-[:HAS_SLO]-(course:Course)
OPTIONAL MATCH (slo)<-[:MAPS_TO]-(sc:SubConcept)
OPTIONAL MATCH (sc)<-[:TARGETS]-(ai:AssessmentItem {status: 'approved'})
RETURN
  std.name AS standard,
  lcme_el.elementId,
  lcme_el.name AS elementName,
  ilo.name AS iloName,
  slo.text AS sloText,
  course.code AS courseCode,
  sc.name AS subConceptName,
  ai.uuid AS itemId,
  ai.stem AS itemStem,
  ai.critic_composite_score AS criticScore
ORDER BY std.name, ilo.name, slo.text
```

Missing links detection:
```cypher
// ILOs with no SLO linking to this element
MATCH (lcme_el:LCME_Element {elementId: $elementId})<-[:ALIGNS_TO]-(ilo:ILO)
WHERE NOT (ilo)<-[:FULFILLS]-()
RETURN ilo.name AS iloWithNoSlo, 'missing_slo' AS gapType

UNION

// SLOs with no SubConcept
MATCH (lcme_el:LCME_Element {elementId: $elementId})<-[:ALIGNS_TO]-(ilo:ILO)<-[:FULFILLS]-(slo:SLO)
WHERE NOT (slo)<-[:MAPS_TO]-()
RETURN slo.text AS sloWithNoSubConcept, 'missing_subconcept' AS gapType
```

---

## CSV Export Format

```
lcme_standard,element_id,element_name,ilo_name,slo_text,course_code,subconcept_name,item_id,item_stem_excerpt,item_status,critic_score,approved_date

"Curriculum Design","IS-2A","Clinical Sciences","Demonstrate clinical reasoning","Student will apply differential diagnosis...","MEDI531","Atherosclerosis Pathogenesis","uuid-abc","A 45-year-old man presents...","approved","4.2","2026-03-15"
```

Streaming implementation (never buffer full export in memory):
```typescript
// lcme.controller.ts
async exportEvidence(req: Request, res: Response) {
  const format = req.query.format as 'csv' | 'json';

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="journey-os-lcme-evidence-${today}.csv"`);

    // Write CSV header
    res.write('lcme_standard,element_id,element_name,ilo_name,slo_text,...\n');

    // Stream rows
    const stream = lcmeRepository.getEvidenceStream();  // returns async generator
    for await (const row of stream) {
      res.write(formatCsvRow(row) + '\n');
    }
    res.end();
  }
}
```

---

## UMLS API Integration (P3-018)

### Authentication Flow (TGT Pattern)
```typescript
// backend/src/services/UmlsAuthService.ts

const UMLS_TGT_URL = 'https://utslogin.nlm.nih.gov/cas/v1/api-key';
const UMLS_SEARCH_URL = 'https://uts-ws.nlm.nih.gov/rest/search/current';

class UmlsAuthService {
  private tgt: string | null = null;
  private tgtExpiry: Date | null = null;

  async getServiceTicket(): Promise<string> {
    if (!this.tgt || this.isExpired()) {
      // Step 1: Get TGT (lasts 8 hours)
      const tgtResponse = await fetch(UMLS_TGT_URL, {
        method: 'POST',
        body: `apikey=${config.UMLS_API_KEY}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const html = await tgtResponse.text();
      this.tgt = html.match(/TGT-[^"]+/)?.[0] || null;
      this.tgtExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
    }

    // Step 2: Get service ticket (single use, 5 minutes)
    const stResponse = await fetch(`${UMLS_TGT_URL}/${this.tgt}`, {
      method: 'POST',
      body: 'service=http://umlsks.nlm.nih.gov',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return stResponse.text();
  }
}
```

### Search and CUI Lookup
```typescript
// backend/src/services/UmlsSearchService.ts

async searchConcept(name: string): Promise<UmlsSearchResult | null> {
  const ticket = await umlsAuth.getServiceTicket();

  // Try exact match first
  const exactUrl = `${UMLS_SEARCH_URL}?string=${encodeURIComponent(name)}&searchType=exact&ticket=${ticket}&pageSize=1`;
  const exactResult = await fetch(exactUrl).then(r => r.json());

  if (exactResult.result.results?.[0]) {
    return this.extractResult(exactResult.result.results[0], 'exact');
  }

  // Fallback: approximate match
  const approxTicket = await umlsAuth.getServiceTicket();
  const approxUrl = `${UMLS_SEARCH_URL}?string=${encodeURIComponent(name)}&searchType=approximate&ticket=${approxTicket}&pageSize=3`;
  const approxResult = await fetch(approxUrl).then(r => r.json());

  const best = approxResult.result.results?.[0];
  if (best && best.ui !== 'NONE') {
    return this.extractResult(best, 'approximate');
  }

  return null;
}

async getAtomIdentifiers(cui: string): Promise<{ snomedCtId?: string; meshId?: string }> {
  const ticket = await umlsAuth.getServiceTicket();

  // SNOMED CT
  const snomedUrl = `https://uts-ws.nlm.nih.gov/rest/content/current/CUI/${cui}/atoms?sabs=SNOMEDCT_US&ticket=${ticket}&pageSize=1`;
  const snomedResult = await fetch(snomedUrl).then(r => r.json());
  const snomedCtId = snomedResult.result?.[0]?.code;

  // MeSH
  const meshTicket = await umlsAuth.getServiceTicket();
  const meshUrl = `https://uts-ws.nlm.nih.gov/rest/content/current/CUI/${cui}/atoms?sabs=MSH&ticket=${meshTicket}&pageSize=1`;
  const meshResult = await fetch(meshUrl).then(r => r.json());
  const meshId = meshResult.result?.[0]?.code;

  return { snomedCtId, meshId };
}
```

### StandardTerm Cypher
```cypher
// Create StandardTerm node
MERGE (st:StandardTerm {cui: $cui})
ON CREATE SET
  st.uuid = $uuid,
  st.name = $preferredName,
  st.snomedCtId = $snomedCtId,
  st.meshId = $meshId,
  st.source = 'UMLS',
  st.createdAt = datetime()

// Link to SubConcept
MATCH (sc:SubConcept {uuid: $subConceptUuid})
MATCH (st:StandardTerm {cui: $cui})
MERGE (sc)-[:GROUNDED_IN {confidence: $matchConfidence, matchType: $matchType}]->(st)
```

### Enhanced LCME Chain Query (with UMLS grounding)
```cypher
// After P3-018: use CUI-based matching for more reliable evidence
MATCH (lcme_el:LCME_Element {elementId: $elementId})
OPTIONAL MATCH (lcme_el)<-[:ALIGNS_TO]-(ilo:ILO)<-[:FULFILLS]-(slo:SLO)
OPTIONAL MATCH (slo)<-[:MAPS_TO]-(sc:SubConcept)-[:GROUNDED_IN]->(st:StandardTerm)
OPTIONAL MATCH (sc)<-[:TARGETS]-(ai:AssessmentItem {status: 'approved'})
RETURN lcme_el.elementId, sc.name, st.cui, st.snomedCtId, count(DISTINCT ai) AS evidence_count
```

---

## Phase 3 SQL Migration (Epic 3.4)

```sql
-- backend/supabase/migrations/20260103000000_phase3_lcme_umls.sql

-- ── Standard Terms (UMLS LOD) ─────────────────────────────────────────────────
CREATE TABLE standard_terms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_concept_id   TEXT,              -- Neo4j uuid of associated SubConcept
  cui              TEXT UNIQUE NOT NULL,   -- UMLS CUI e.g. C0004096
  name             TEXT NOT NULL,
  snomed_ct_id     TEXT,
  mesh_id          TEXT,
  icd10_code       TEXT,
  match_confidence FLOAT,             -- 0.0–1.0
  match_type       TEXT DEFAULT 'exact',  -- 'exact' | 'approximate'
  source           TEXT DEFAULT 'UMLS',
  neo4j_node_id    TEXT,
  enriched_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_standard_terms_cui ON standard_terms(cui);
CREATE INDEX idx_standard_terms_snomed ON standard_terms(snomed_ct_id);

-- ── UMLS enrichment job tracking ─────────────────────────────────────────────
CREATE TABLE umls_enrichment_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total         INTEGER NOT NULL,
  enriched      INTEGER DEFAULT 0,
  failed        INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'running',
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- ── Gap priorities materialized view ─────────────────────────────────────────
CREATE MATERIALIZED VIEW gap_priorities AS
  SELECT
    sys.name AS usmle_system,
    disc.name AS usmle_discipline,
    count(DISTINCT ai.id) AS item_count,
    count(DISTINCT sc.neo4j_node_id) AS concept_count,
    0.5 AS priority_score  -- updated by analytics service
  FROM ... -- joins via sub_concept_analytics, assessment_items
WITH NO DATA;

CREATE UNIQUE INDEX ON gap_priorities (usmle_system, usmle_discipline);
REFRESH MATERIALIZED VIEW gap_priorities;  -- refresh after first data

-- RLS
ALTER TABLE standard_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all users can read standard terms" ON standard_terms FOR SELECT USING (true);
CREATE POLICY "only admin writes standard terms" ON standard_terms FOR INSERT USING (auth.jwt() ->> 'role' = 'admin');
```

---

## New Files (Epic 3.4)

```
backend/src/services/UmlsAuthService.ts
backend/src/services/UmlsSearchService.ts
backend/src/inngest/umls-enrichment.function.ts
backend/src/repositories/lcme.repository.ts
backend/src/controllers/lcme.controller.ts
backend/src/routes/lcme.routes.ts
backend/src/inngest/lcme-export.function.ts
frontend/src/hooks/useLcmeCoverage.ts
frontend/src/hooks/useLcmeElement.ts
frontend/src/app/(admin)/lcme/page.tsx
frontend/src/app/(admin)/lcme/[elementId]/page.tsx
backend/supabase/migrations/20260103000000_phase3_lcme_umls.sql
```

---

## Phase 3 Exit Gate Checklist

```bash
# 1. All 9 courses ingested
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM ingestion_jobs WHERE status='completed';"
# Expected: ≥ 9

# 2. SubConcept dedup ran
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM sub_concept_dedup_log;"
# Expected: > 0 (merges happened)

# 3. USMLE heatmap has data
curl "localhost:3001/api/v1/analytics/usmle-heatmap" | jq '[.cells[] | select(.itemCount > 0)] | length'
# Expected: > 0 (some cells covered)

# 4. LCME dashboard loads
curl "localhost:3001/api/v1/admin/lcme/coverage" -H "Authorization: Bearer $ADMIN_JWT" | jq '.elements | length'
# Expected: 93

# 5. Evidence exportable in < 60 seconds
time curl "localhost:3001/api/v1/admin/lcme/export?format=csv" -H "Authorization: Bearer $ADMIN_JWT" -o /dev/null
# Expected: total real time < 60s

# 6. UMLS enrichment ≥ 50% complete
curl "localhost:3001/api/v1/admin/umls-enrichment/status" -H "Authorization: Bearer $ADMIN_JWT"
# Expected: enriched/total ≥ 0.50

# 7. D3 coverage map renders
# Navigate to /analytics/coverage-map → nodes visible, colors correct, drag works

# 8. Gap-to-generation loop
# Click heatmap gap → workbench auto-sends message → question generated → heatmap updates
```

---

## UMLS Environment Setup

```bash
# 1. Register at NLM (free)
#    https://uts.nlm.nih.gov/uts/signup-login

# 2. Get API key from profile → API Key

# 3. Add to .env.local
echo "UMLS_API_KEY=your-key-here" >> .env.local

# 4. Test auth
curl "https://utslogin.nlm.nih.gov/cas/v1/api-key" \
  -X POST -d "apikey=$UMLS_API_KEY"
# Expected: HTML containing TGT-{ticket}

# 5. Test search
# (get service ticket first, then)
curl "https://uts-ws.nlm.nih.gov/rest/search/current?string=atherosclerosis&searchType=exact&ticket=ST-{ticket}"
# Expected: { result: { results: [{ ui: 'C0004096', name: 'Atherosclerosis' }] } }
```

## Rate Limiting Notes

UMLS API limits:
- 20 requests/second (hard cap)
- No monthly quota for authenticated users
- Each Inngest step function: `concurrency: { limit: 10 }` + `throttle: { limit: 20, period: '1s' }`
- Each concept needs 3 API calls: TGT → ST → search → SNOMED lookup → MeSH lookup
- For 500 SubConcepts × 3 calls = ~1,500 requests → ~75 seconds at 20 req/s
- Run as background Inngest job, not synchronously
