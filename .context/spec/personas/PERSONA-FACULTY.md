---
name: "Dr. Amara Osei"
role: faculty
lane: faculty
sources:
  - "PRODUCT_BRIEF §Personas (Dr. Amara Osei)"
  - "ARCHITECTURE_v10 §4.1 (Role Hierarchy, Course Director flag)"
  - "DESIGN_SPEC §Faculty Template A, §Dashboard, §Generation, §Review"
  - "WORKBENCH_SPEC_v2 §Frontend Specification"
  - "API_CONTRACT_v1 §Generation, §Items, §Courses"
  - "CODE_STANDARDS §MVC Architecture"
---

## Pain Points
- Spends 2 full weekends per semester writing exam questions manually — PRODUCT_BRIEF §Personas
- No objective way to verify USMLE blueprint coverage — PRODUCT_BRIEF §Personas
- Gets blindsided by LCME requests for compliance evidence — PRODUCT_BRIEF §Personas
- Cannot objectively flag low-quality faculty questions — PRODUCT_BRIEF §Personas
- Lacks granular student performance data for early intervention — PRODUCT_BRIEF §Personas

## Key Workflows
1. Upload syllabus → watch AI extraction → review concept mappings — DESIGN_SPEC §UploadSyllabus, §SyllabusProcessing, §ReviewSyllabusMapping
2. Upload lecture materials per week — DESIGN_SPEC §WeekView, §WeekMaterialsUpload, §LectureUpload
3. Generate single question via workbench chat — WORKBENCH_SPEC_v2 §6, DESIGN_SPEC §GenerationSpecWizard
4. Generate bulk questions (Course Director only) — WORKBENCH_SPEC_v2 §bulk mode, API_CONTRACT_v1 `POST /api/v1/generate/bulk`
5. Review and approve/reject/refine questions — DESIGN_SPEC §QuestionReviewList, §FacultyReviewQueue, §ItemDetail
6. Refine questions via conversational AI — DESIGN_SPEC §AIRefinement, §ConversationalRefine
7. Assemble and assign exams — DESIGN_SPEC §ExamAssembly, §ExamAssignment
8. View analytics: blueprint coverage, course analytics, personal dashboard — DESIGN_SPEC §Analytics, §BlueprintCoverage
9. Verify SubConcept TEACHES edges — API_CONTRACT_v1 `POST /api/v1/subconcepts/:id/verify-teaches`
10. Review SubConcept queue — DESIGN_SPEC §SubConceptReviewQueue

## Data Needs
- Dashboard KPI strip: Questions Generated, Avg Item Quality, Coverage Score, Active Students
- Cohort mastery heatmap (per USMLE topic)
- Upcoming tasks with due dates
- Recent activity feed
- Active courses with coverage rings
- Blueprint coverage heatmap (gap visualization)
- Question review queue with AI quality scores

## Permissions
**Base faculty:**
- Content upload, single generation, item review, exams, analytics
- `POST /api/v1/courses/:courseId/upload` — upload syllabus/lecture
- `POST /api/v1/generate` — single question generation
- `GET /api/v1/items`, `POST /api/v1/items/:id/review`
- Cannot: bulk generate, create courses, manage review queue, approve SLO→ILO

**Course Director (`is_course_director: true`):**
- All base faculty permissions, plus:
- `POST /api/v1/generate/bulk` — batch generation (up to 5 parallel via Inngest)
- `POST /api/v1/courses` — create courses
- `POST /api/v1/ilos/:id/map-framework` — map ILO to frameworks
- Review queue management, SLO→ILO FULFILLS approval

- JWT: `{ role: "faculty", institution_id, is_course_director: true|false }`
- RLS scoped by `institution_id`
- Routes: `/dashboard`, `/courses`, `/generate`, `/items`, `/exams`, `/analytics`, etc.
- Sidebar style: Template A (Dashboard Shell), parchment bg + navyDeep text active item
- Color identifier: `navyDeep` #002c76

## Test Account
Colab seeder (E2E_Colab_Plan_v3 Cell 8e) creates a demo faculty user:
- Role: faculty, is_course_director: true
- Assigned to: MEDI 531 (Organ Systems I)
- Pre-seeded: uploaded atherosclerosis materials, 3 TEACHES verifications, 5 FULFILLS approvals, 5 generated questions (2 approved, 1 in_review, 2 draft)
- Email credentials: not specified (provisioned at seed time)
