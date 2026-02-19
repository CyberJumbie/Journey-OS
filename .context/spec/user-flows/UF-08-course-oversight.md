# UF-08: Course Oversight

**Feature:** F-04 (Course Management)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** View and manage all courses across the institution, monitor coverage metrics, and assign faculty

## Preconditions
- Inst Admin is logged in at `/admin`
- At least one course exists in the institution

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | See "Courses" card or sidebar link | Click to navigate |
| 2 | `/courses` (AllCourses) | See all institution courses: name, code, director, status, coverage % | Full course list (not filtered by user) |
| 3 | `/courses` | Use filters: academic year, semester, status, director | Table filtered accordingly |
| 4 | `/courses` | Click on a course row | Navigate to `/courses/:id` (CourseDashboard) |
| 5 | `/courses/:id` (CourseDashboard) | See course KPIs: questions generated, coverage %, concepts extracted, assigned faculty | Full admin view with all metrics |
| 6 | `/courses/:id` | Click "Manage Faculty" | Modal to assign/remove faculty from course |
| 7 | `/courses/:id` (modal) | Add a faculty member from institution user list | Faculty assigned, notification sent |
| 8 | `/courses/:id` | Click "Edit Course" | Edit course details (name, code, structure) |

## Error Paths
- **No courses**: Step 2 — "No courses yet. Invite faculty to get started." empty state
- **Assign already-assigned faculty**: Step 7 — "[Name] is already assigned to this course"
- **Delete course with content**: Step 8 — "This course has uploaded content and generated questions. Archive instead?"

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/courses` | Step 2 — fetch all institution courses |
| GET | `/api/v1/courses/:id` | Step 5 — fetch course details with KPIs |
| PATCH | `/api/v1/courses/:id` | Step 7 — assign faculty |
| PATCH | `/api/v1/courses/:id` | Step 8 — update course details |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/courses`
2. Verify all institution courses visible (not just own)
3. Click into a course, verify KPI strip
4. Assign a faculty member
Assertions:
- Course list shows all courses (admin sees everything)
- Faculty assignment persisted
- KPI strip renders with real data

## Source References
- PERSONA-INSTITUTIONAL-ADMIN.md § Key Workflows
- PERSONA-MATRIX.md § Curriculum (manage courses)
- DESIGN_SPEC.md § 5.1 Group E
- API_CONTRACT_v1.md § Course endpoints
