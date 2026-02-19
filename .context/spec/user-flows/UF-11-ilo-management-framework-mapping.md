# UF-11: ILO Management & Framework Mapping

**Feature:** F-07 (Learning Objective Management)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Create Institutional Learning Objectives (ILOs), map them to educational frameworks (LCME, ACGME, EPA, Bloom), and approve SLO→ILO FULFILLS proposals from Course Directors

## Preconditions
- Inst Admin is logged in at `/admin`
- Frameworks seeded (F-08) — LCME, ACGME, EPA, Bloom nodes exist in Neo4j
- At least one course exists (F-04)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | Click "Learning Objectives" in sidebar | Navigate to `/admin/ilos` |
| 2 | `/admin/ilos` (ILOManagement) | See ILO table: text, Bloom level, framework mappings count, status | All institution ILOs listed |
| 3 | `/admin/ilos` | Click "Create ILO" | Modal or form: enter ILO text, select Bloom level |
| 4 | `/admin/ilos` (create form) | Enter ILO text: "Students will demonstrate understanding of cardiovascular physiology..." | Text validated (non-empty) |
| 5 | `/admin/ilos` (create form) | Select Bloom level from dropdown (e.g., "Analyze") | `[:AT_BLOOM]->(:BloomLevel {name: "Analyze"})` edge queued |
| 6 | `/admin/ilos` (create form) | Click "Create" | ILO dual-written to Supabase + Neo4j `(:ILO)` node |
| 7 | `/admin/ilos/:id/map` (OutcomeMapping) | See framework mapping interface with drag-and-drop | Frameworks shown in columns: LCME, ACGME, EPA |
| 8 | `/admin/ilos/:id/map` | Drag ILO to LCME Element 7.2 | `(:ILO)-[:ADDRESSES_LCME]->(:LCME_Element {code: "7.2"})` edge created |
| 9 | `/admin/ilos/:id/map` | Drag ILO to ACGME Domain "Patient Care" | `(:ILO)-[:MAPS_TO_COMPETENCY]->(:ACGME_Domain)` edge created |
| 10 | `/admin/ilos/:id/map` | Click "Save Mappings" | All edges persisted, success toast |

### FULFILLS Review Queue
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| F1 | `/admin/fulfills-queue` (FULFILLSReviewQueue) | See pending SLO→ILO FULFILLS proposals from Course Directors | Queue with: SLO text, proposing course, target ILO, proposer name |
| F2 | `/admin/fulfills-queue` | Click on a proposal | Detail view: SLO text, ILO text, course context, proposer rationale |
| F3 | `/admin/fulfills-queue` (detail) | Click "Approve" | `(:SLO)-[:FULFILLS]->(:ILO)` edge created in Neo4j |
| F4 | `/admin/fulfills-queue` (detail) | Or click "Reject" with reason | Proposal rejected, feedback sent to Course Director |
| F5 | `/admin/fulfills-queue` | Queue updates | Next proposal loaded |

## Error Paths
- **Duplicate ILO text**: Step 6 — "A similar ILO already exists: '[existing text]'. Use existing instead?"
- **Framework not seeded**: Step 7 — "LCME framework not found. Seed frameworks first." link to F-08
- **FULFILLS proposal withdrawn**: Step F2 — "This proposal was withdrawn by the Course Director"
- **No pending proposals**: Step F1 — "No pending FULFILLS proposals" empty state

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/ilos` | Step 2 — fetch all ILOs |
| POST | `/api/v1/ilos` | Step 6 — create ILO |
| GET | `/api/v1/frameworks/:type/hierarchy` | Step 7 — fetch framework nodes for mapping |
| POST | `/api/v1/ilos/:id/map-framework` | Steps 8-9 — create framework edges |
| GET | `/api/v1/fulfills/pending` | Step F1 — fetch pending proposals |
| POST | `/api/v1/slos/:id/fulfills` | Step F3 — approve FULFILLS link |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin/ilos`
2. Create a new ILO with Bloom level "Apply"
3. Map it to LCME Element
4. Check FULFILLS queue
Assertions:
- ILO exists in Supabase and Neo4j
- `AT_BLOOM` edge exists in Neo4j
- `ADDRESSES_LCME` edge exists after mapping
- FULFILLS queue renders (even if empty)

## Source References
- ARCHITECTURE_v10.md § Changelog (R-019: ILO/SLO split)
- NODE_REGISTRY_v1.md § ILO, SLO, FULFILLS
- ROADMAP_v2_3.md § Sprint 5
- PERSONA-MATRIX.md § Curriculum (manage ILOs, approve FULFILLS)
- DESIGN_SPEC.md § OutcomeMapping, ILOManagement, FULFILLSReviewQueue
