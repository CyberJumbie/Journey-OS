# UF-21: USMLE Coverage & Gap-Driven Generation

**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** View USMLE coverage heatmap for own courses, identify assessment gaps, and launch gap-driven question generation to fill blind spots

## Preconditions
- Faculty is logged in with course content processed
- SubConcepts extracted and mapped to USMLE topics (F-06)
- SLOs linked to SubConcepts (F-07)
- USMLE framework seeded (F-08)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` | See "Coverage Gaps: 3" alert in dashboard KPI strip | Click gap alert |
| 2 | `/courses/:id/coverage` (BlueprintCoverage) | See coverage % strip: overall coverage (e.g., 72%) | Global coverage metric |
| 3 | `/courses/:id/coverage` | See 16x7 heatmap: USMLE Systems (rows) x Disciplines (columns) | Cells colored: green (≥80%), yellow (50-79%), red (<50%), gray (0%) |
| 4 | `/courses/:id/coverage` | Hover over a red cell: "Cardiovascular × Pharmacology: 15% (2 items, need ≥8)" | Tooltip with gap details |
| 5 | `/courses/:id/coverage` | Click the red cell | Drill-down: see USMLE_Topics in this intersection, SubConcepts mapped, items covering each |
| 6 | `/courses/:id/coverage` (drill-down) | See specific gaps: "Antiarrhythmics: 0 items, Anticoagulants: 1 item" | Gap list with item counts |
| 7 | `/courses/:id/coverage` (drill-down) | Click "Generate for Gap" on "Antiarrhythmics" | Redirect to `/generate` with pre-filled params: topic=Antiarrhythmics, system=Cardiovascular, discipline=Pharmacology |
| 8 | `/generate` (WorkbenchPage) | Chat pre-populated: "Generate a question about antiarrhythmics..." | Generation starts with gap context |
| 9 | `/generate` | Complete generation (see UF-14) | New item created targeting the gap |
| 10 | `/courses/:id/coverage` | Return to heatmap | Cell updated (coverage % increased after new item approved) |

### D3 Concept Graph View
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| G1 | `/courses/:id/coverage` | Toggle to "Graph View" | D3 force-directed SubConcept graph |
| G2 | `/courses/:id/coverage` (graph) | Nodes colored by coverage: green (well-covered), red (gap), gray (unassessed) | Visual gap identification |
| G3 | `/courses/:id/coverage` (graph) | Click a red node | See SubConcept details, linked SLOs, USMLE mappings |
| G4 | `/courses/:id/coverage` (graph) | Click "Generate" on red node | Same flow as Step 7 |

## Error Paths
- **No USMLE mappings**: Step 3 — "USMLE framework not mapped to course concepts. Map SLOs to USMLE first." link to F-07
- **No items yet**: Step 3 — "No assessment items for this course. Generate questions first." link to F-09
- **Coverage data stale**: Step 2 — "Coverage last calculated 2 days ago. Recalculating..." (triggers Inngest job)
- **Graph render timeout**: Step G1 — "Too many concepts to render. Filter by week or topic." with filter controls

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/courses/:id/coverage` | Step 2 — fetch coverage summary |
| GET | `/api/v1/coverage/heatmap` | Step 3 — fetch 16x7 heatmap data |
| GET | `/api/v1/courses/:id/gaps` | Step 5 — fetch gaps for a cell |
| POST | `/api/v1/generate` | Step 8 — gap-driven generation |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Navigate to course coverage page
2. Verify heatmap renders with colored cells
3. Click a gap cell, verify drill-down
4. Click "Generate for Gap", verify redirect to workbench with params
Assertions:
- Heatmap renders 16x7 grid with real data
- Gap drill-down shows USMLE_Topic breakdown
- Workbench pre-fills with gap parameters
- Coverage % is accurate (matches Neo4j traversal)

## Source References
- ROADMAP_v2_3.md § Sprint 8 (USMLE gap detection, heatmap)
- ARCHITECTURE_v10.md § Changelog (R-009: coverage chain branching)
- PRODUCT_BRIEF.md § Tier 0 ("USMLE gap heatmap renders with real data")
- DESIGN_SPEC.md § 3.4 (Charts: heatmap, force-directed graph)
