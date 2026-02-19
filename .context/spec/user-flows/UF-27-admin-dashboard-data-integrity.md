# UF-27: Admin Dashboard & Data Integrity

**Feature:** F-17 (Admin Dashboard & Data Integrity)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Monitor institution health, review data integrity lint results, investigate sync issues, and browse the knowledge graph

## Preconditions
- Inst Admin is logged in at `/admin`
- Nightly Inngest lint jobs have run (`journey/lint.run`)
- Dual-written data exists across Supabase and Neo4j

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | See system KPI strip: Active Users (42), Courses (8), Total Items (324), Sync Health (97%) | Real-time institutional metrics |
| 2 | `/admin` | See institution overview: faculty activity, recent operations log | Activity feed |
| 3 | `/admin` | See "Data Integrity: 2 issues" warning indicator | Click to navigate |
| 4 | `/admin/data-integrity` (DataIntegrityDash) | See health strip: Sync Status (97%), Orphan Nodes (3), Schema Violations (0), Lint Errors (2) | Integrity summary |
| 5 | `/admin/data-integrity` | See lint rule results table: 9 KaizenML rules with pass/fail/warning status | Each rule: name, status, affected count, last run |
| 6 | `/admin/data-integrity` | See sync_status distribution: synced (97%), pending (2%), failed (1%) | Pie chart or bar showing distribution |
| 7 | `/admin/data-integrity` | Click a failing lint rule: "Orphan SubConcepts — 3 nodes with no TEACHES edges" | Detail view: list of orphan nodes with IDs |
| 8 | `/admin/data-integrity` | Click an orphan node | Navigate to SubConcept detail or knowledge browser |
| 9 | `/admin/data-integrity` | Click "Re-sync Failed" button | Triggers re-sync for all `sync_status: failed` records |

### Knowledge Graph Browser
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| K1 | `/admin/knowledge` (KnowledgeBrowser) | Click "Knowledge Graph" in admin sidebar | Graph visualization loads |
| K2 | `/admin/knowledge` | Search: "atherosclerosis" | Find SubConcept nodes matching query |
| K3 | `/admin/knowledge` | Click a SubConcept node | See all edges: TEACHES, ADDRESSES, MAPS_TO, GROUNDED_IN |
| K4 | `/admin/knowledge/:id` (SubConceptDetail) | See full concept detail: definition, LOD URI, embeddings, provenance | Complete node profile |
| K5 | `/admin/knowledge/:id` | See relationship graph: connected nodes (ContentChunks, SLOs, Frameworks) | Visual graph centered on this node |

### Golden Dataset Regression
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| G1 | `/admin/data-integrity` | See "Quality Regression" section | Nightly golden dataset check results |
| G2 | `/admin/data-integrity` | Status: "50/50 items within quality bounds" or "2 items drifted" | Quality stability indicator |

## Error Paths
- **Lint jobs haven't run**: Step 5 — "Lint results not available. Last run: never. Trigger manual run?"
- **Neo4j unreachable**: Step K1 — "Knowledge graph service unavailable. Check connection."
- **Too many orphans**: Step 7 — "142 orphan nodes found. Export list?" (paginated view)
- **Re-sync fails**: Step 9 — "Re-sync failed for 3 records. Manual investigation needed." with error details

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/admin/dashboard` | Step 1 — fetch admin KPIs |
| GET | `/api/v1/admin/integrity` | Step 4 — fetch lint results and sync status |
| GET | `/api/v1/admin/integrity/rule/:id` | Step 7 — fetch affected records for a rule |
| POST | `/api/v1/admin/integrity/resync` | Step 9 — trigger re-sync |
| GET | `/api/v1/admin/graph/search?q=atherosclerosis` | Step K2 — graph search |
| GET | `/api/v1/admin/graph/node/:id` | Step K4 — node detail |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin`
2. Verify KPI strip renders with real data
3. Navigate to `/admin/data-integrity`
4. Verify lint rule table renders
5. Navigate to `/admin/knowledge`, search for a concept
Assertions:
- Admin KPIs show real aggregated data
- Sync health percentage is accurate
- Lint rules show pass/fail status
- Knowledge browser returns search results
- SubConcept detail shows all edges

## Source References
- ROADMAP_v2_3.md § Sprint 9 (SuperAdmin polish)
- ROADMAP_v2_3.md § Sprint 15 (data linting, golden dataset)
- ARCHITECTURE_v10.md § 2 (sync_status pattern)
- PERSONA-MATRIX.md § Administration (data integrity monitoring)
- DESIGN_SPEC.md § 5.1 Group L (AdminDashboard, DataIntegrityDash, KnowledgeBrowser)
