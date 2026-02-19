# UF-13: Framework Seeding

**Feature:** F-08 (Framework Management)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Import educational frameworks (USMLE, LCME, ACGME, EPA, Bloom, Miller) into the knowledge graph during institution setup or later configuration

## Preconditions
- Inst Admin is logged in at `/admin`
- Institution exists and is approved
- Frameworks not yet seeded (or need re-seeding with updated data)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | Click "Frameworks" in admin sidebar | Navigate to `/admin/frameworks` |
| 2 | `/admin/frameworks` (FrameworkManagement) | See framework list with import status per framework | Table: Framework, Version, Status (seeded/not seeded), Node Count |
| 3 | `/admin/frameworks` | See "USMLE: Not Seeded", "LCME: Not Seeded", etc. | Import buttons active for unseeded frameworks |
| 4 | `/admin/frameworks` | Click "Import All" or select individual framework "Import" | Seeding starts for selected frameworks |
| 5 | `/admin/frameworks` | Progress bar per framework | Idempotent seed: USMLE (~227 nodes), LCME (105), ACGME (27), AAMC (55), UME (55+6 edges), EPA (13), Bloom (6), Miller (4) |
| 6 | `/admin/frameworks` | USMLE progress: "Importing Systems (16)... Disciplines (7)... Tasks (4)... Topics (~200)" | 4 parallel flat lists imported |
| 7 | `/admin/frameworks` | LCME progress: "Importing Standards (12)... Elements (93)" | Hierarchical import |
| 8 | `/admin/frameworks` | All frameworks show green checkmarks with node counts | "All frameworks seeded successfully" |
| 9 | `/admin/frameworks` | Click on a framework (e.g., "USMLE") | Expand hierarchy browser: navigate Standards → Elements (LCME) or Systems → Disciplines (USMLE) |
| 10 | `/admin/frameworks` | Browse framework hierarchy tree | See all nodes with labels and relationships |

## Error Paths
- **Already seeded (idempotent)**: Step 4 — "LCME already seeded (105 nodes). Re-import?" Idempotent: safe to re-run
- **Partial failure**: Step 5 — "ACGME seeding failed at node 15/27. Retry?" (retry resumes from last successful node)
- **Neo4j connection error**: Step 5 — "Knowledge graph unavailable. Try again later." (no fallback — frameworks must go to Neo4j)
- **Concurrent seeding**: Step 4 — "Seeding already in progress for USMLE. Please wait."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/frameworks` | Step 2 — fetch framework status and counts |
| POST | `/api/v1/frameworks/seed` | Step 4 — trigger seeding (body: `{ frameworks: ["USMLE", "LCME", ...] }`) |
| GET | `/api/v1/frameworks/:type/hierarchy` | Step 9 — fetch hierarchy for browser |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin/frameworks`
2. Verify initial state shows unseeded frameworks
3. Click "Import" for Bloom (smallest — 6 nodes)
4. Wait for completion
5. Verify node count shows 6
6. Browse hierarchy
Assertions:
- Neo4j contains 6 `BloomLevel` nodes with correct labels
- Framework status updated to "seeded" in UI
- Hierarchy browser renders tree view
- Seeding is idempotent (re-run doesn't create duplicates)

## Source References
- ROADMAP_v2_3.md § Sprint 1 (Layer 2 Cypher DDL)
- NODE_REGISTRY_v1.md § Layer 2 (all framework node types)
- SEED_VALIDATION_SPEC_v1.md § Phase 2 (validation counts)
- DESIGN_SPEC.md § FrameworkManagement, SetupWizard
- PERSONA-MATRIX.md § Administration (seed frameworks)
