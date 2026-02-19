# UF-19: Item Bank Browse & Export

**Feature:** F-11 (Item Bank & Repository)
**Persona:** Faculty — Dr. Amara Osei (base faculty)
**Goal:** Browse approved assessment items for own courses, search by concept/framework, and export items for use in external exam delivery (ExamSoft)

## Preconditions
- Faculty is logged in
- Approved items exist for faculty's assigned courses
- Item bank has been populated via generation (F-09) and review (F-10)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` | Click "Item Bank" in sidebar | Navigate to `/items` |
| 2 | `/items` (Repository) | See repo stats strip scoped to own courses | Total items, approved %, average quality |
| 3 | `/items/browse` (ItemBankBrowser) | Browse items: search "atherosclerosis" | Results filtered by keyword across vignette, stem, concepts |
| 4 | `/items/browse` | Apply filter: "Course = MEDI 531, Status = Approved" | Only approved items for own course |
| 5 | `/items/browse` | Click on an item | See read-only item detail with Toulmin chain and source provenance |
| 6 | `/items/browse` | Select multiple items via checkboxes | Selection count shown in toolbar |
| 7 | `/items/browse` | Click "Export Selected" | Export options: ExamSoft format, CSV, PDF |
| 8 | `/items/browse` | Select "ExamSoft" format, click "Download" | File downloaded with items formatted for ExamSoft import |

## Error Paths
- **No items for course**: Step 2 — "No approved items yet. Generate questions in the workbench."
- **Search no results**: Step 3 — "No items matching 'query'. Try broader search terms."
- **Export too large**: Step 7 — "Export limited to 500 items. Apply filters to narrow selection."
- **Unauthorized course**: Step 4 — Items from unassigned courses not visible (RLS)

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/items` | Step 2 — fetch items for own courses |
| GET | `/api/v1/items?q=atherosclerosis` | Step 3 — search |
| GET | `/api/v1/items/:id` | Step 5 — fetch item detail |
| GET | `/api/v1/items/export?ids=1,2,3&format=examsoft` | Step 8 — export selected items |

## Test Scenario (Playwright outline)
Login as: Base faculty
Steps:
1. Navigate to `/items`
2. Search for a known concept
3. Apply course filter
4. Select 2 items and export as CSV
Assertions:
- Only own-course items visible (RLS enforced)
- Search results match keyword
- Export file downloads successfully
- No "Import" button visible (CD-only feature)

## Source References
- DESIGN_SPEC.md § 5.1 Group H (Repository, ItemBankBrowser)
- API_CONTRACT_v1.md § Assessment Items endpoints
- PERSONA-MATRIX.md § Content (faculty: browse, export; NOT import)
