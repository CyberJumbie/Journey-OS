# UF-18: Item Bank Management & Legacy Import

**Feature:** F-11 (Item Bank & Repository)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Manage the assessment item repository, import legacy questions from previous exams, and tag them into the knowledge graph

## Preconditions
- Faculty (CD) is logged in
- Approved items exist from generation + review pipeline (F-09, F-10)
- Course context available

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` | Click "Item Bank" in sidebar | Navigate to `/items` |
| 2 | `/items` (Repository) | See repo stats strip: total items, approved %, coverage score | Overview of all items |
| 3 | `/items` (Repository) | See item table with columns: question preview, course, concept tags, Bloom, status, critic score | Items sorted by date (newest first) |
| 4 | `/items/browse` (ItemBankBrowser) | Open advanced filters panel | Filter by: concept, framework tag, Bloom level, difficulty, status, course, date range |
| 5 | `/items/browse` | Filter: "Bloom = Analyze, USMLE System = Cardiovascular, Status = Approved" | Filtered results showing matching items |
| 6 | `/items/browse` | Click on an item row | Navigate to `/items/:id` (item detail — see UF-16) |
| 7 | `/items` (Repository) | Click "Import Legacy Questions" button | Import wizard opens |
| 8 | `/items/import` (Import Wizard) Step 1 | Upload legacy exam file (CSV, DOCX, or proprietary format) | File parsed, questions extracted |
| 9 | `/items/import` Step 2 | Review extracted questions: see each question with auto-detected stem, options, answer key | Preview with edit capability |
| 10 | `/items/import` Step 3 | AI auto-tags: Bloom level, USMLE mapping, SubConcept linking (via embedding similarity) | Tags displayed as chips per question |
| 11 | `/items/import` Step 4 | Review and adjust tags, click "Import All" | Dual-write: Supabase `assessment_items` + Neo4j `(:AssessmentItem)` nodes |
| 12 | `/items/import` | Import complete: "Imported 47 legacy questions. 42 auto-tagged, 5 need manual review." | Success summary with links |
| 13 | `/items` (Repository) | Stats strip updated with new totals | Legacy items integrated |

## Error Paths
- **Unsupported format**: Step 8 — "Unsupported file format. Please upload CSV, DOCX, or ExamSoft export."
- **Parse failure**: Step 8 — "Could not extract questions from this file. Check the format guide."
- **Duplicate detection**: Step 11 — "3 questions match existing items (≥0.85 similarity). Skip duplicates?" with side-by-side comparison
- **Tag confidence low**: Step 10 — "5 questions have low-confidence tags (< 0.7). Review manually." highlighted in yellow
- **Empty file**: Step 8 — "No questions found in this file."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/items` | Step 2 — fetch repo stats and items |
| GET | `/api/v1/items?concept=X&bloom=Y&status=Z` | Step 5 — filtered search |
| POST | `/api/v1/items/import` | Step 8 — upload legacy file (multipart) |
| GET | `/api/v1/items/import/:id/preview` | Step 9 — preview extracted questions |
| POST | `/api/v1/items/import/:id/confirm` | Step 11 — confirm import with tags |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to `/items`
2. Verify stats strip renders with real data
3. Apply filters, verify results update
4. Upload a small test CSV with 3 legacy questions
5. Verify import completes with questions in item bank
Assertions:
- Repo stats strip shows correct totals
- Filters produce accurate results
- Imported items exist in `assessment_items` with `source: legacy`
- Neo4j nodes created for imported items

## Source References
- ROADMAP_v2_3.md § Sprint 17 (legacy import + item bank)
- ROADMAP_v2_3.md § Sprint 18 (item analytics + tag manager)
- DESIGN_SPEC.md § 5.1 Group H (Repository, ItemBankBrowser)
- API_CONTRACT_v1.md § Assessment Items endpoints
