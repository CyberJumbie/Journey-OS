# STORY-IA-27: Compliance Computation Service

**Epic:** E-30 (LCME Compliance Engine)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-30-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need the system to compute LCME compliance evidence chains by traversing the curriculum graph so that I can see which standards are fully met, partially met, or unmet.

## Acceptance Criteria
- [ ] Graph traversal: LCME_Element <- ILO <- SLO <- Course chain via Neo4j
- [ ] Compute compliance status per element: met (100% coverage), partial (1-99%), unmet (0%)
- [ ] Coverage metric: percentage of required evidence present for each element
- [ ] Aggregate by standard: 12 LCME standards, each with multiple elements
- [ ] Standard compliance = weighted average of element compliance within that standard
- [ ] Evidence chain includes: which ILOs map to element, which SLOs map to ILO, which courses deliver SLO
- [ ] Performance: full institution computation in < 5 minutes
- [ ] Results cached with invalidation on curriculum changes
- [ ] API endpoint: GET /api/compliance/compute/:institutionId
- [ ] Incremental recompute: only affected chains when single mapping changes
- [ ] Audit log: when computation ran, by whom, results hash
- [ ] Seed LCME standards from lcme-standards.json (105 nodes across 12 standards)

## Reference Screens
> No direct screen -- backend service. UI consumers: STORY-IA-40 (Heatmap), STORY-IA-41 (Drill-Down).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | Backend-only story. No UI components. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/compliance.types.ts` |
| Model | apps/server | `src/modules/compliance/models/compliance-result.model.ts` |
| Repository | apps/server | `src/modules/compliance/repositories/compliance.repository.ts` |
| Service | apps/server | `src/modules/compliance/services/compliance-computation.service.ts` |
| Service | apps/server | `src/modules/compliance/services/evidence-chain-traversal.service.ts` |
| Controller | apps/server | `src/modules/compliance/controllers/compliance.controller.ts` |
| Route | apps/server | `src/modules/compliance/routes/compliance.routes.ts` |
| Seed | apps/server | `src/modules/compliance/seeds/lcme-standards.seed.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/compliance-computation.service.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/evidence-chain-traversal.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/compliance.repository.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/compliance.controller.test.ts` |

## Database Schema

### Supabase -- `compliance_results` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `standard_id` | varchar(20) | NOT NULL |
| `element_id` | varchar(20) | NOT NULL |
| `compliance_status` | varchar(20) | NOT NULL, CHECK IN ('met', 'partial', 'unmet') |
| `coverage_percentage` | numeric(5,2) | NOT NULL |
| `evidence_chain_summary` | jsonb | NOT NULL |
| `computed_at` | timestamptz | NOT NULL, DEFAULT now() |
| `computed_by` | uuid | NULL, FK -> auth.users |
| `results_hash` | varchar(64) | NOT NULL |
| `is_cached` | boolean | DEFAULT true |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j Labels
- `LCME_Standard` (SCREAMING_SNAKE_CASE): id, name, number
- `LCME_Element` (SCREAMING_SNAKE_CASE): id, standard_id, number, description
- Relationships: `(LCME_Element)<-[:MAPS_TO]-(ILO)<-[:ALIGNS_WITH]-(SLO)<-[:OFFERS]-(Course)`

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/compute/:institutionId` | institutional_admin | Trigger/retrieve compliance computation |
| GET | `/api/v1/compliance/results/:institutionId` | institutional_admin | Get cached results |

## Dependencies
- **Blocked by:** S-IA-15-2 (framework linking for ILO-to-element mapping), S-IA-14-1 (ILOs exist)
- **Blocks:** S-IA-30-2 (Compliance Heatmap), S-IA-30-3 (Element Drill-Down), S-IA-31-1 (Report Snapshot)
- **Cross-epic:** Reads curriculum graph built by E-09, E-14, E-15

## Testing Requirements
### API Tests (14)
1. Compute compliance for institution with full evidence chains
2. Element with 100% coverage returns "met" status
3. Element with partial coverage returns "partial" status
4. Element with 0% coverage returns "unmet" status
5. Standard compliance is weighted average of elements
6. Evidence chain includes ILO -> SLO -> Course mapping
7. Results are cached after computation
8. Cache invalidated on curriculum mapping change
9. Incremental recompute only processes affected chains
10. Audit log created with computation metadata
11. Performance: mock institution completes within timeout
12. Seed data creates all 12 LCME standards with elements
13. Unauthorized user gets 403
14. Non-existent institution returns 404

## Implementation Notes
- Neo4j Cypher: `MATCH chain=(e:LCME_Element)<-[:MAPS_TO]-(ilo:ILO)<-[:ALIGNS_WITH]-(slo:SLO)<-[:OFFERS]-(c:Course) WHERE e.standard_id = $standardId RETURN chain`
- LCME standards use SCREAMING_SNAKE_CASE labels in Neo4j (LCME_Element, LCME_Standard)
- Seed data includes all 12 LCME standards with their elements from the LCME specification (105 total nodes)
- Cache invalidation via event: when any ILO/SLO/Course mapping changes, mark cache stale
- 5-minute performance target requires efficient Cypher queries and possible pre-materialization
- Use constructor DI for Neo4j client and Supabase client
- Private fields with `#` syntax per architecture rules
