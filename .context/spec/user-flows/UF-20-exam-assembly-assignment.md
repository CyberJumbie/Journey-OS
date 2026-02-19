# UF-20: Exam Assembly & Assignment

**Feature:** F-12 (Exam Assembly)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Create an exam blueprint targeting USMLE coverage, assemble items from the bank to meet blueprint targets, and assign the exam to a student cohort

## Preconditions
- Faculty (CD) is logged in
- Approved items exist in item bank (F-11)
- USMLE + Bloom frameworks seeded (F-08)
- Course with enrolled students exists (F-04)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` | Click "Exams" in sidebar | Navigate to `/exams` |
| 2 | `/exams` | See exam list (previous exams with status), click "Create Exam" | Navigate to `/exams/create` |
| 3 | `/exams/create` (ExamAssembly) Step 1 | Enter exam title, select course, set question count target (e.g., 50) | Form validated |
| 4 | `/exams/create` Step 2 | Define blueprint: target distribution across USMLE Systems (e.g., Cardiovascular 20%, Respiratory 15%, ...) | Blueprint grid with percentage sliders |
| 5 | `/exams/create` Step 2 | Define Bloom level distribution: Remember 10%, Understand 20%, Apply 40%, Analyze 30% | Blueprint adds Bloom targets |
| 6 | `/exams/create` Step 3 | System recommends items that maximize blueprint coverage | Auto-selected items shown in drag-and-drop list |
| 7 | `/exams/create` Step 3 | See blueprint strip: target vs actual coverage per cell (16x7 heatmap mini) | Green = met, yellow = partial, red = gap |
| 8 | `/exams/create` Step 3 | Drag items to reorder, swap items from bank, click "Add from Bank" to browse | Item bank browser opens as modal |
| 9 | `/exams/create` Step 3 | System flags gaps: "Need 2 more Cardiovascular/Analyze items" | Gap cells highlighted, "Generate to Fill" button |
| 10 | `/exams/create` Step 3 | Click "Generate to Fill" for a gap cell | Redirects to workbench (F-09) pre-filled with gap parameters |
| 11 | `/exams/create` Step 4 | Review final exam: 50 items, blueprint coverage 94%, all sections filled | Summary with coverage % |
| 12 | `/exams/create` Step 4 | Click "Save Exam" | Exam created: Supabase `exams` + Neo4j `(:Exam)-[:CONTAINS]->(:AssessmentItem)` |
| 13 | `/exams/:id/assign` (ExamAssignment) | Select cohort/section, set scheduled date/time, set time limit | Assignment form |
| 14 | `/exams/:id/assign` | Click "Assign" | Exam assigned, notifications sent to students |

### Retired Exam Import
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| R1 | `/exams` | Click "Import Retired Exam" | Navigate to `/exams/import` (RetiredExamUpload) |
| R2 | `/exams/import` | Upload historical exam file with answer key + psychometric data | File parsed |
| R3 | `/exams/import` | Review extracted items with historical statistics (difficulty, discrimination) | Stats displayed per item |
| R4 | `/exams/import` | Click "Import" | Items imported to bank, historical stats preserved |

## Error Paths
- **Insufficient items for blueprint**: Step 6 — "Only 35 approved items available. Generate more or reduce exam size."
- **Blueprint doesn't sum to 100%**: Step 4 — "Distribution must total 100%. Current: 95%." inline validation
- **No students enrolled**: Step 13 — "No students enrolled in this course section. Add students first."
- **Duplicate exam title**: Step 3 — "An exam with this title already exists for this course."
- **Schedule conflict**: Step 13 — "Another exam is scheduled at this time for this section."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/v1/exams` | Step 12 — create exam |
| GET | `/api/v1/exams/:id/recommend` | Step 6 — auto-recommend items for blueprint |
| POST | `/api/v1/exams/:id/items` | Step 8 — add/reorder items |
| POST | `/api/v1/exams/:id/assign` | Step 14 — assign to cohort |
| GET | `/api/v1/courses/:id/coverage` | Step 7 — blueprint coverage calculation |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to `/exams`, click "Create Exam"
2. Enter title, select course, set 10-item blueprint (smaller for test)
3. Accept recommended items
4. Save exam
5. Assign to test cohort
Assertions:
- Exam record in `exams` table with blueprint JSONB
- `exam_items` junction records for each item
- Neo4j `(:Exam)-[:CONTAINS]->(:AssessmentItem)` edges exist
- Blueprint coverage % calculated correctly

## Source References
- ROADMAP_v2_3.md § Sprint 29-30 (exam delivery, MIP solver)
- ARCHITECTURE_v10.md § 1 (Job 1: Assessment Automation)
- DESIGN_SPEC.md § 5.1 Group I (ExamAssembly, ExamAssignment, RetiredExamUpload)
- PRODUCT_BRIEF.md § Dr. Amara Osei ("Assemble exams")
