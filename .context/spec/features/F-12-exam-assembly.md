# F-12: Exam Assembly

## Description
Faculty assemble exams from the item bank using blueprint-driven selection. A USMLE coverage blueprint defines target distribution across systems, disciplines, and Bloom levels. The system recommends items that maximize blueprint coverage and flags gaps. Assembled exams can be assigned to student cohorts and exported to exam delivery platforms. Retired exams can be imported for psychometric analysis.

## Personas
- **Faculty (Course Director)**: Creates exam blueprints, assembles exams, assigns to cohorts.
- **Institutional Admin**: Reviews exam quality, manages exam assignments.

## Screens
- `ExamAssembly.tsx` — Template E (Focus), blueprint strip showing target vs. actual coverage, drag-and-drop item selection
- `ExamAssignment.tsx` — Template A, assign exam to cohorts/sections with schedule
- `RetiredExamUpload.tsx` — Template A, import historical exams for analysis

## Data Domains
- **Supabase**: `exams` (id, course_id, title, blueprint JSONB, status, scheduled_at), `exam_items` (exam_id, item_id, position)
- **Neo4j**: `(:Exam)-[:CONTAINS]->(:AssessmentItem)` for coverage chain traversal
- **API**: `POST /api/v1/exams`, `GET /api/v1/exams/:id`, `POST /api/v1/exams/:id/items`, `POST /api/v1/exams/:id/assign`

## Dependencies
- **F-11**: Item Bank (approved items required for assembly)
- **F-08**: Framework Management (blueprint targets reference USMLE/Bloom nodes)
- **F-13**: Coverage & Gap Detection (blueprint coverage calculation)

## Source References
- ROADMAP_v2_3.md § Sprint 29-30 (exam delivery, MIP solver)
- ARCHITECTURE_v10.md § 1 (Job 1: Assessment Automation)
- DESIGN_SPEC.md § 5.1 Group I (3 exam management screens)
- PRODUCT_BRIEF.md § Dr. Amara Osei ("Assemble exams")
