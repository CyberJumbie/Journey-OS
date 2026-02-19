# UF-23: LCME Compliance Reporting

**Feature:** F-14 (LCME Compliance Reporting)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Generate LCME compliance evidence programmatically from the knowledge graph, identify coverage gaps by standard, and export reports for accreditation site visits

## Preconditions
- Inst Admin is logged in at `/admin`
- LCME framework seeded: 12 standards, 93 elements (F-08)
- ILOs mapped to LCME elements via `ADDRESSES_LCME` edges (F-07, UF-11)
- SLOs linked to ILOs via FULFILLS (F-07)
- Courses with content exist (F-04, F-05)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | Click "LCME Compliance" in admin sidebar | Navigate to `/admin/compliance/lcme` |
| 2 | `/admin/compliance/lcme` (LCMEComplianceHeatmap) | See compliance % strip: overall compliance (e.g., 82%) | Institution-wide compliance metric |
| 3 | `/admin/compliance/lcme` | See heatmap: 12 LCME Standards (rows) with element status cells | Cells colored: green (full evidence), yellow (partial), red (no evidence), gray (N/A) |
| 4 | `/admin/compliance/lcme` | Hover over Standard 7: "Curricular Content — 8/11 elements with evidence" | Tooltip with standard summary |
| 5 | `/admin/compliance/lcme` | Click Standard 7 row | Expand to show all 11 elements under Standard 7 |
| 6 | `/admin/compliance/lcme` | Click Element 7.2 (red — no evidence) | Navigate to `/admin/compliance/lcme/7.2` (LCMEElementDrillDown) |
| 7 | `/admin/compliance/lcme/7.2` (LCMEElementDrillDown) | See evidence chain: Element 7.2 → ILOs that ADDRESSES_LCME → SLOs that FULFILLS → Courses that OFFERS | Graph traversal visualized as tree/chain |
| 8 | `/admin/compliance/lcme/7.2` | See "0 ILOs address this element" | Gap identified — needs ILO creation and mapping |
| 9 | `/admin/compliance/lcme/7.2` | Click "Create ILO for Element 7.2" | Redirect to ILO creation (UF-11) pre-linked to LCME 7.2 |
| 10 | `/admin/compliance/lcme` | Return to heatmap after ILO creation | Cell updated when evidence chain exists |
| 11 | `/admin/compliance/lcme` | Click "Export Report" | Export options: PDF (narrative), Excel (data tables) |
| 12 | `/admin/compliance/lcme` | Select "PDF Report" for Standard 7 | Generated PDF: standard text, element coverage, evidence chains, course links |

## Error Paths
- **LCME not seeded**: Step 2 — "LCME framework not imported. Seed frameworks first." link to F-08
- **No ILO→LCME mappings**: Step 3 — All cells gray/red: "No ILOs mapped to LCME. Map ILOs to elements first." link to UF-11
- **Stale data**: Step 2 — "Compliance data from 3 days ago. Recalculate?" button triggers fresh graph traversal
- **Export timeout (large institution)**: Step 12 — "Report generation in progress. You'll be notified when ready." (Inngest async export)
- **Element not applicable**: Step 6 — Admin can mark element as "N/A" with justification

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/compliance/lcme` | Step 2 — fetch compliance summary + heatmap data |
| GET | `/api/v1/compliance/lcme/:elementId` | Step 6 — fetch evidence chain for element |
| POST | `/api/v1/compliance/lcme/export` | Step 12 — generate export (body: `{ standard: 7, format: "pdf" }`) |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin/compliance/lcme`
2. Verify heatmap renders with 12 standard rows
3. Click a standard to expand elements
4. Click an element to verify drill-down with evidence chain
5. Trigger export, verify file generated
Assertions:
- Heatmap shows 12 LCME standards
- Element drill-down shows evidence chain (ILOs → SLOs → Courses)
- Compliance % matches Neo4j traversal counts
- Export produces downloadable file

## Source References
- PRODUCT_BRIEF.md § Job 2 (Accreditation Compliance)
- PRODUCT_BRIEF.md § Dr. Kenji Takahashi ("answer LCME Standard 7 without weeks of work")
- PRODUCT_BRIEF.md § Tier 1 ("LCME evidence generation < 5 min per standard")
- ARCHITECTURE_v10.md § Changelog (R-009: coverage chain branching)
- NODE_REGISTRY_v1.md § LCME_Standard, LCME_Element, ADDRESSES_LCME
- DESIGN_SPEC.md § 5.1 Group L (LCMEComplianceHeatmap, LCMEElementDrillDown)
