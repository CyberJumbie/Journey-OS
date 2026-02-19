# UF-12: SLO Creation & FULFILLS Proposal

**Feature:** F-07 (Learning Objective Management)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Create Student Learning Objectives (SLOs) for a course, link them to sessions, and propose SLO→ILO FULFILLS relationships for admin approval

## Preconditions
- Faculty (CD) is logged in, owns a course
- Course has week/section/session structure (F-04)
- ILOs exist in the institution (created by Inst Admin via UF-11)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/courses/:id` (CourseDashboard) | Click "Learning Objectives" tab or sidebar link | Navigate to SLO management view |
| 2 | `/courses/:id/slos` | See existing SLOs for this course: text, Bloom level, sessions linked, FULFILLS status | SLO list (may be empty for new course) |
| 3 | `/courses/:id/slos` | Click "Create SLO" | Form opens: text field, Bloom level dropdown, session assignment |
| 4 | `/courses/:id/slos` (form) | Enter SLO text: "By end of week 3, students will be able to explain the mechanism of atherosclerosis" | Text validated |
| 5 | `/courses/:id/slos` (form) | Select Bloom level: "Understand" | `[:AT_BLOOM]` edge queued |
| 6 | `/courses/:id/slos` (form) | Assign to Session: Week 3, Lecture 1 | `(:Session)-[:HAS_SLO]->(:SLO)` edge queued |
| 7 | `/courses/:id/slos` (form) | Click "Create" | SLO dual-written to Supabase + Neo4j, appears in list |
| 8 | `/courses/:id/slos/:sloId/map` (OutcomeMapping) | See ILO mapping interface | Available ILOs listed with search/filter |
| 9 | `/courses/:id/slos/:sloId/map` | Select target ILO: "Students will demonstrate cardiovascular physiology..." | FULFILLS proposal created |
| 10 | `/courses/:id/slos/:sloId/map` | Click "Propose FULFILLS Link" | Proposal submitted, status shows "Pending Admin Approval" |
| 11 | `/courses/:id/slos` | See SLO in list with "FULFILLS: Pending" badge | Waiting for Inst Admin review (UF-11) |

## Error Paths
- **Duplicate SLO text**: Step 7 — "A similar SLO already exists in this course. Use existing?"
- **No ILOs available**: Step 8 — "No ILOs found. Contact your institutional admin to create ILOs."
- **FULFILLS already proposed**: Step 10 — "A FULFILLS link to this ILO was already proposed on [date]"
- **Session not found**: Step 6 — "Configure course sessions first" with link to course structure

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/courses/:id/slos` | Step 2 — fetch course SLOs |
| POST | `/api/v1/courses/:id/slos` | Step 7 — create SLO |
| GET | `/api/v1/ilos` | Step 8 — fetch available ILOs for mapping |
| POST | `/api/v1/slos/:id/fulfills` | Step 10 — propose FULFILLS link |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to course SLO management
2. Create new SLO with Bloom level
3. Assign to a session
4. Propose FULFILLS link to an ILO
5. Verify pending status
Assertions:
- SLO exists in Supabase and Neo4j
- `HAS_SLO` edge exists between Session and SLO
- FULFILLS proposal created with `status: pending`
- AT_BLOOM edge exists

## Source References
- ARCHITECTURE_v10.md § Changelog (R-019: ILO/SLO separate node types)
- NODE_REGISTRY_v1.md § SLO, FULFILLS, HAS_SLO
- ROADMAP_v2_3.md § Sprint 5
- PERSONA-MATRIX.md § Curriculum (SLO→ILO FULFILLS approval)
- DESIGN_SPEC.md § OutcomeMapping
