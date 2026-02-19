# F-04: Course Management

## Description
Faculty (Course Directors) and institutional admins create, configure, and manage courses within the institutional hierarchy. Courses contain weeks, sections, and sessions. Each course has learning objectives (SLOs) that link to institutional ILOs via FULFILLS relationships. Course management is the organizational container for all content upload, concept extraction, and question generation.

## Personas
- **Institutional Admin**: Full course CRUD, manages all courses in institution.
- **Faculty (Course Director)**: Creates and manages own courses, configures structure (weeks/sections).
- **Faculty**: Views assigned courses, navigates course content.

## Screens
- `AllCourses.tsx` — Template A, course list with search/filter, create button
- `CreateCourse.tsx` — Template A, multi-step course creation wizard
- `CourseDashboard.tsx` — Template A, course overview with KPI strip (questions generated, coverage %, concepts extracted)
- `CourseReady.tsx` — Template D (Full-Width), celebration screen after first question generated
- `WeekView.tsx` — Template A, weekly schedule with sessions and materials
- `WeekMaterialsUpload.tsx` — Template A, drag-and-drop materials per week
- `LectureUpload.tsx` — Template A, individual lecture file upload
- `LectureProcessing.tsx` — Template A, processing pipeline progress bar

## Data Domains
- **Supabase**: `courses` (id, institution_id, name, code, description, academic_year, status), `sections`, `sessions`
- **Neo4j**: `(:Course)`, `(:Section)`, `(:Session)` nodes in Layer 1 hierarchy; `(:Course)-[:OFFERS]->(:SLO)`, `(:Session)-[:HAS_SLO]->(:SLO)`
- **API**: `GET /api/v1/courses`, `POST /api/v1/courses`, `GET /api/v1/courses/:id`, `PATCH /api/v1/courses/:id`, `DELETE /api/v1/courses/:id`
- **Dual-write**: Course creation writes Supabase first → Neo4j second → sync_status

## Dependencies
- **F-01**: Authentication (role-based access)
- **F-02**: Institution Management (institution context)
- **F-03**: User Management (faculty assignment to courses)

## Source References
- PRODUCT_BRIEF.md § Dr. Amara Osei (Course Director workflow)
- ARCHITECTURE_v10.md § 7.2 (institutional hierarchy: Institution → ... → Course → Section)
- ROADMAP_v2_3.md § Sprint 4 (course management deliverables)
- NODE_REGISTRY_v1.md § Layer 1 (Course, Section, Session, ILO, SLO)
- SUPABASE_DDL_v1.md § courses table
- API_CONTRACT_v1.md § Course endpoints
- DESIGN_SPEC.md § 5.1 Group E (14 course management screens)
