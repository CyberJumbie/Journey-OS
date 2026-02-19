# UF-07: Course Creation & Configuration

**Feature:** F-04 (Course Management)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Create a new course, configure its structure (weeks/sections), and set up the course for content upload

## Preconditions
- Faculty (CD) is logged in at `/dashboard`
- Institution exists with approved status
- User has `is_course_director: true` in JWT

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` (FacultyDashboard) | Click "Courses" in sidebar or "View All Courses" | Navigate to `/courses` |
| 2 | `/courses` (AllCourses) | See course list (empty or existing), click "Create Course" button | Navigate to `/courses/create` |
| 3 | `/courses/create` (CreateCourse) Step 1 | Enter course name, code (e.g., "MEDI 531"), description | Form validated, proceed |
| 4 | `/courses/create` Step 2 | Select academic year, semester, configure weeks (e.g., 16 weeks) | Week structure generated |
| 5 | `/courses/create` Step 3 | Add sections per week (lecture, lab, clinical) | Sections created within weeks |
| 6 | `/courses/create` Step 4 | Review course structure summary | Click "Create Course" |
| 7 | `/courses/create` | Submit | Dual-write: Supabase `courses` table + Neo4j `(:Course)` node, redirect to course dashboard |
| 8 | `/courses/:id` (CourseDashboard) | Land on new course dashboard | See KPI strip (0 questions, 0% coverage, 0 concepts), week grid, upload prompt |
| 9 | `/courses/:id` | Click into a week | Navigate to `/courses/:id/weeks/:weekNum` (WeekView) |
| 10 | `/courses/:id/weeks/:weekNum` (WeekView) | See week schedule with sessions and upload zones | Ready for material upload |

## Error Paths
- **Duplicate course code**: Step 3 — "Course code MEDI 531 already exists for this academic year"
- **Invalid date range**: Step 4 — "End date must be after start date"
- **Dual-write failure (Neo4j down)**: Step 7 — Course saved to Supabase with `sync_status: pending`, background retry scheduled
- **Empty course name**: Step 3 — Inline validation "Course name is required"

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/courses` | Step 2 — fetch existing courses |
| POST | `/api/v1/courses` | Step 7 — create course (dual-write) |
| GET | `/api/v1/courses/:id` | Step 8 — fetch course dashboard data |
| GET | `/api/v1/courses/:id/weeks` | Step 9 — fetch week structure |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to `/courses`, click "Create Course"
2. Fill wizard: "Test Course 101", code "TEST-101", 8 weeks
3. Add 2 sections per week
4. Submit and verify redirect to course dashboard
Assertions:
- Course exists in Supabase `courses` table
- Neo4j `(:Course {code: "TEST-101"})` node exists
- Course dashboard renders with KPI strip showing zeros
- `sync_status: synced` in Supabase

## Source References
- PRODUCT_BRIEF.md § Dr. Amara Osei (Course Director workflow)
- ARCHITECTURE_v10.md § 7.2 (institutional hierarchy)
- NODE_REGISTRY_v1.md § Layer 1 (Course, Section, Session)
- DESIGN_SPEC.md § 5.1 Group E (course management screens)
- API_CONTRACT_v1.md § Course endpoints
