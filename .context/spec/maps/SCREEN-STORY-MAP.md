# Screen-to-Story Mapping

**Reference App:** `.context/source/05-reference/app/`
**Total Reference Screens:** 80+ pages, 5 layouts, 8 shared components, 42 UI primitives
**Generated:** 2026-02-20

All paths relative to `.context/source/05-reference/app/app/`

---

## Layouts & Shared Components

| Reference File | Story ID(s) | Refactor Notes |
|---------------|-------------|----------------|
| `components/layout/DashboardLayout.tsx` | STORY-F-6, STORY-F-21, STORY-U-10 | Convert to Next.js App Router layout with sidebar, adapt to `apps/web/src/app/(protected)/layout.tsx` |
| `components/layout/AdminLayout.tsx` | STORY-IA-5, STORY-SA-7 | Convert to admin route group layout `apps/web/src/app/(protected)/admin/layout.tsx` |
| `components/layout/AdminSidebar.tsx` | STORY-IA-5 | Refactor into organism, admin nav links |
| `components/layout/AdminDashboardLayout.tsx` | STORY-IA-5 | Merge into admin layout |
| `components/layout/TopNavigation.tsx` | STORY-U-10 | Convert to organism, integrate auth state |
| `components/shared/stat-card.tsx` | STORY-F-7 | Move to `packages/ui/src/molecules/stat-card.tsx` |
| `components/shared/progress-ring.tsx` | STORY-ST-6, STORY-ST-7 | Move to `packages/ui/src/atoms/progress-ring.tsx` |
| `components/shared/DashboardComponents.tsx` | STORY-F-6, STORY-F-7, STORY-F-12 | Split into individual atoms/molecules per Atomic Design |
| `components/shared/woven-field.tsx` | STORY-U-8 | Move to `packages/ui/src/atoms/woven-field.tsx` |
| `components/shared/section-marker.tsx` | shared | Move to `packages/ui/src/atoms/section-marker.tsx` |
| `components/shared/thread-divider.tsx` | shared | Move to `packages/ui/src/atoms/thread-divider.tsx` |
| `components/shared/logo-wordmark.tsx` | shared | Move to `packages/ui/src/atoms/logo-wordmark.tsx` |
| `components/shared/ascending-squares.tsx` | shared | Move to `packages/ui/src/atoms/ascending-squares.tsx` |

---

## Auth & Onboarding Screens (pages/auth/, pages/onboarding/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/auth/Login.tsx` | STORY-U-1 | Supabase Auth Setup |
| `pages/auth/Registration.tsx` | STORY-U-8 | Registration Wizard |
| `pages/auth/FacultyRegistration.tsx` | STORY-U-8 | Registration Wizard |
| `pages/auth/AdminRegistration.tsx` | STORY-U-8 | Registration Wizard |
| `pages/auth/StudentRegistration.tsx` | STORY-U-8 | Registration Wizard |
| `pages/auth/RoleSelection.tsx` | STORY-U-8 | Registration Wizard |
| `pages/auth/ForgotPassword.tsx` | STORY-U-5 | Forgot Password Flow |
| `pages/auth/EmailVerification.tsx` | STORY-U-14 | Email Verification Gate |
| `pages/auth/InvitationAccept.tsx` | STORY-U-9 | Invitation Acceptance Flow |
| `pages/auth/PersonaOnboarding.tsx` | STORY-U-13 | Persona Onboarding Screens |
| `pages/onboarding/Onboarding.tsx` | STORY-U-13 | Persona Onboarding Screens |
| `pages/onboarding/FacultyOnboarding.tsx` | STORY-U-13 | Persona Onboarding Screens |
| `pages/onboarding/AdminOnboarding.tsx` | STORY-U-13 | Persona Onboarding Screens |
| `pages/onboarding/StudentOnboarding.tsx` | STORY-U-13 | Persona Onboarding Screens |

Also: `05-reference/screens/journey-os-login.jsx` (canonical login reference)

---

## Dashboard Screens (pages/dashboard/, pages/faculty/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/dashboard/Dashboard.tsx` | STORY-F-21 | Role-Based Dashboard Variants |
| `pages/dashboard/FacultyDashboard.tsx` | STORY-F-6, STORY-F-7, STORY-F-12, STORY-F-21 | Activity Feed, KPI Strip, Course Cards, Variants |
| `pages/faculty/FacultyDashboard.tsx` | STORY-F-6, STORY-F-7, STORY-F-12, STORY-F-21 | (duplicate — same dashboard) |
| `pages/dashboard/StudentDashboard.tsx` | STORY-ST-2 | Student Dashboard Page |
| `pages/institution/InstitutionalAdminDashboard.tsx` | STORY-IA-5 | Admin Dashboard Page |

Also: `05-reference/screens/journey-os-dashboard.jsx` (canonical dashboard reference)

---

## Course Management Screens (pages/courses/, pages/faculty/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/courses/AllCourses.tsx` | STORY-F-13 | Course List & Detail Views |
| `pages/faculty/CourseList.tsx` | STORY-F-13 | Course List & Detail Views |
| `pages/courses/CourseDashboard.tsx` | STORY-F-13 | Course List & Detail Views |
| `pages/faculty/CourseDetailView.tsx` | STORY-F-13 | Course List & Detail Views |
| `pages/courses/CreateCourse.tsx` | STORY-F-20 | Course Creation Wizard |
| `pages/faculty/CreateEditCourse.tsx` | STORY-F-20 | Course Creation Wizard |
| `pages/courses/CourseReady.tsx` | STORY-F-20 | Course Creation Wizard |
| `pages/faculty/CourseRoster.tsx` | STORY-IA-18 | Role Assignment & CD Flag |
| `pages/courses/WeekView.tsx` | STORY-IA-7 | Weekly Schedule View |
| `pages/courses/WeekMaterialsUpload.tsx` | STORY-F-9 | Upload Dropzone Component |
| `pages/courses/OutcomeMapping.tsx` | STORY-IA-31 | Visual Mapping Interface |
| `pages/courses/ReviewSyllabusMapping.tsx` | STORY-IA-22 | SLO-to-ILO Linking |

---

## Upload & Processing Screens (pages/courses/, pages/uploads/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/courses/LectureUpload.tsx` | STORY-F-9 | Upload Dropzone Component |
| `pages/courses/UploadSyllabus.tsx` | STORY-F-9 | Upload Dropzone Component |
| `pages/courses/SyllabusEditor.tsx` | STORY-F-9 | Upload Dropzone Component |
| `pages/courses/LectureProcessing.tsx` | STORY-F-30 | Processing Progress UI |
| `pages/courses/SyllabusProcessing.tsx` | STORY-F-30 | Processing Progress UI |
| `pages/uploads/FacultyQuestionUpload.tsx` | STORY-F-57 | Import Pipeline |

---

## Concept Extraction & Review (pages/courses/, pages/admin/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/courses/SubConceptReviewQueue.tsx` | STORY-F-40 | Concept Review Queue UI |
| `pages/admin/SubConceptDetail.tsx` | STORY-F-41 | Verification Workflow |

---

## Generation Workbench (pages/generation/, pages/faculty/, pages/questions/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/faculty/QuestWorkbench.tsx` | STORY-F-43, STORY-F-50, STORY-F-52 | SplitPane Layout, ContextPanel, ChatPanel |
| `pages/generation/GenerationSpecificationWizard.tsx` | STORY-F-51 | Generation Spec Wizard |
| `pages/generation/GenerateQuestionsSyllabus.tsx` | STORY-F-37 | Generation Nodes |
| `pages/generation/GenerateQuestionsTopic.tsx` | STORY-F-37 | Generation Nodes |
| `pages/generation/GenerateQuiz.tsx` | STORY-F-37 | Generation Nodes |
| `pages/generation/GenerateTest.tsx` | STORY-F-37 | Generation Nodes |
| `pages/generation/GenerateHandout.tsx` | STORY-F-37 | Generation Nodes |
| `pages/generation/BatchProgress.tsx` | STORY-F-46 | Batch Progress UI |
| `pages/questions/AIRefinement.tsx` | STORY-F-52 | ChatPanel Component |
| `pages/questions/ConversationalRefinement.tsx` | STORY-F-52 | ChatPanel Component |
| `pages/operations/BulkOperations.tsx` | STORY-F-45, STORY-F-47 | Batch Configuration, Batch Controls |

---

## Question Review (pages/questions/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/questions/QuestionReviewList.tsx` | STORY-F-58 | Review Queue List Page |
| `pages/questions/FacultyReviewQueue.tsx` | STORY-F-58 | Review Queue List Page |
| `pages/questions/QuestionDetailView.tsx` | STORY-F-63 | Question Detail Review View |
| `pages/questions/QuestionHistory.tsx` | STORY-F-63 | Question Detail Review View |
| `pages/questions/ItemDetail.tsx` | STORY-F-66 | Item Detail View |

---

## Repository & Exam (pages/repository/, pages/exams/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/repository/Repository.tsx` | STORY-F-64 | Item Bank Browser Page |
| `pages/repository/ItemBankBrowser.tsx` | STORY-F-64 | Item Bank Browser Page |
| `pages/exams/ExamAssembly.tsx` | STORY-F-71 | Exam Builder UI |
| `pages/exams/ExamAssignment.tsx` | STORY-F-73 | Cohort Assignment |
| `pages/exams/RetiredExamUpload.tsx` | STORY-F-69 | Retired Exam Import |

---

## Admin & Institution Screens (pages/admin/, pages/institution/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/admin/AdminDashboard.tsx` | STORY-IA-5 | Admin Dashboard Page |
| `pages/admin/InstitutionListDashboard.tsx` | STORY-SA-7 | Institution List Dashboard |
| `pages/admin/InstitutionDetailView.tsx` | STORY-SA-9 | Institution Detail View |
| `pages/admin/ApplicationReviewQueue.tsx` | STORY-SA-3 | Application Review Queue |
| `pages/admin/AdminUserDirectory.tsx` | STORY-SA-2 | Global User Directory |
| `pages/admin/FacultyManagement.tsx` | STORY-IA-1 | User List & Invitation |
| `pages/institution/UserManagement.tsx` | STORY-IA-1 | User List & Invitation |
| `pages/admin/FrameworkManagement.tsx` | STORY-IA-6 | Framework List Page |
| `pages/institution/FrameworkConfiguration.tsx` | STORY-IA-6 | Framework List Page |
| `pages/admin/ILOManagement.tsx` | STORY-IA-23 | ILO Management UI |
| `pages/admin/KnowledgeBrowser.tsx` | STORY-IA-9 | Knowledge Graph Browser |
| `pages/admin/SetupWizard.tsx` | STORY-IA-20 | Setup Wizard Step |
| `pages/admin/DataIntegrityDashboard.tsx` | STORY-IA-26 | Sync Status Monitor |
| `pages/settings/SystemConfigurationDashboard.tsx` | STORY-IA-12 | KaizenML Lint Rule Engine |
| `pages/settings/UserRoleManagement.tsx` | STORY-IA-18 | Role Assignment & CD Flag |
| `pages/admin/FULFILLSReviewQueue.tsx` | STORY-IA-30 | FULFILLS Review Queue |
| `pages/admin/LCMEComplianceHeatmap.tsx` | STORY-IA-40 | Compliance Heatmap |
| `pages/admin/LCMEElementDrillDown.tsx` | STORY-IA-41 | Element Drill-Down View |
| `pages/institution/AccreditationReports.tsx` | STORY-IA-39, STORY-IA-43 | Report Snapshot, PDF Export |
| `pages/institution/CoverageDashboard.tsx` | STORY-IA-13 | USMLE Heatmap Component |

---

## Analytics Screens (pages/analytics/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/analytics/Analytics.tsx` | STORY-IA-11 | Course Analytics Page |
| `pages/analytics/CourseAnalytics.tsx` | STORY-IA-11 | Course Analytics Page |
| `pages/analytics/PersonalDashboard.tsx` | STORY-IA-32 | Personal Analytics Page |
| `pages/analytics/InstitutionalAnalytics.tsx` | STORY-IA-33 | Cross-Course Comparison |
| `pages/analytics/BlueprintCoverage.tsx` | STORY-IA-13 | USMLE Heatmap Component |
| `pages/analytics/QuestionPerformanceMetrics.tsx` | STORY-IA-34 | Centrality Visualization |

---

## Student Screens (pages/student/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/student/StudentPractice.tsx` | STORY-ST-12 | Practice Launcher |
| `pages/student/StudentQuestionView.tsx` | STORY-ST-13 | Question View Component |
| `pages/student/StudentResults.tsx` | STORY-ST-15 | Session Summary |
| `pages/student/StudentProgress.tsx` | STORY-ST-6, STORY-ST-7 | Mastery Breakdown, Readiness Tracker |
| `pages/student/StudentAnalytics.tsx` | STORY-ST-8, STORY-ST-9, STORY-ST-11 | Trend Charts, Comparative, Time-on-Task |

---

## Settings, Profile, Notifications (pages/profile/, pages/settings/, pages/notifications/, pages/templates/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/profile/Profile.tsx` | STORY-F-5 | Profile Page |
| `pages/settings/Settings.tsx` | STORY-F-16, STORY-F-17 | Notification Preferences, Generation Settings |
| `pages/notifications/Notifications.tsx` | STORY-F-23 | Bell Dropdown Component |
| `pages/templates/QuestionTemplates.tsx` | STORY-F-14 | Template Management Page |
| `pages/help/Help.tsx` | STORY-F-8 | Help & FAQ Pages |

---

## Collaboration (pages/collaboration/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/collaboration/Collaborators.tsx` | STORY-F-25, STORY-F-26 | Presence Indicators, Session Broadcast |

---

## SuperAdmin-specific (pages/)

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/InstitutionApplication.tsx` | STORY-SA-1 | Waitlist Application Form |

---

## Communication Screens (No Current Story — Future/Tier 3)

| Reference File | Notes |
|---------------|-------|
| `pages/communications/AnnouncementSystem.tsx` | Future feature — not in current 166 stories |
| `pages/communications/FacultyCommunicationHub.tsx` | Future feature |
| `pages/communications/StudentSupportCenter.tsx` | Future feature |

---

## Gap Analysis Screens

| Reference File | Story ID | Story Title |
|---------------|----------|-------------|
| `pages/institution/CoverageDashboard.tsx` | STORY-IA-13 | USMLE Heatmap Component |
| `pages/analytics/BlueprintCoverage.tsx` | STORY-IA-13 | USMLE Heatmap Component |

---

## Stories with NO Reference Screens (Backend-only)

These stories are pure backend/infrastructure — no prototype screen exists:

| Story ID | Title | Reason |
|----------|-------|--------|
| STORY-U-1 | Supabase Auth Setup | Backend auth config (Login.tsx used for STORY-U-8's UI) |
| STORY-U-2 | Framework Data Models | Database types only |
| STORY-U-3 | Express Auth Middleware | Backend middleware |
| STORY-U-4 | Seed Script Infrastructure | CLI tooling |
| STORY-U-6 | RBAC Middleware | Backend middleware |
| STORY-U-7 | USMLE Seed Data | Seed script |
| STORY-U-12 | Remaining Framework Seeds | Seed script |
| STORY-F-1 | Course Model & Repository | Backend MVC |
| STORY-F-2 | Notification Model & Repository | Backend MVC |
| STORY-F-3 | Import Parser | Backend service |
| STORY-F-4 | Template Model & CRUD | Backend MVC |
| STORY-F-10 | Socket.io Notification Service | Backend service |
| STORY-F-11 | Course Hierarchy | Backend model |
| STORY-F-18 | Supabase Storage Integration | Backend service |
| STORY-F-19 | Socket.io Room Management | Backend service |
| STORY-F-22 | Inngest Notification Triggers | Backend service |
| STORY-F-24 | Content Record Creation | Backend service |
| STORY-F-27 | Inngest Content Pipeline | Backend pipeline |
| STORY-F-28 | Dual-Write Chunks | Backend service |
| STORY-F-29 | Voyage AI Embedding Integration | Backend AI |
| STORY-F-31 | SubConcept Extraction Service | Backend AI |
| STORY-F-32 | Dedup Service (Validation) | Backend service |
| STORY-F-33 | LangGraph.js Pipeline Scaffold | Backend pipeline |
| STORY-F-34 | TEACHES Relationship Creation | Backend service |
| STORY-F-35 | LOD Enrichment | Backend AI |
| STORY-F-36 | Dedup Service (Extraction) | Backend service |
| STORY-F-37 | Generation Nodes | Backend AI (UI screens are read-only ref) |
| STORY-F-38 | SSE Streaming Integration | Backend streaming |
| STORY-F-39 | Inngest Batch Pipeline | Backend pipeline |
| STORY-F-42 | Review Nodes | Backend AI |
| STORY-F-48 | Validation Rule Engine | Backend service |
| STORY-F-53 | Critic Agent Service | Backend AI |
| STORY-F-54 | Auto-Tagging Service | Backend service |
| STORY-F-55 | Self-Correction Retry | Backend service |
| STORY-F-56 | Review Router | Backend service |
| STORY-F-57 | Import Pipeline | Backend pipeline |
| STORY-F-60 | Automation Level Configuration | Backend config |
| STORY-F-65 | Blueprint Definition Model | Backend model |
| STORY-F-67 | Export Service | Backend service |
| STORY-F-70 | Item Recommendation Engine | Backend AI |
| STORY-F-72 | Gap Flagging | Backend service |
| STORY-F-74 | Exam Export | Backend service |
| STORY-F-75 | Exam Lifecycle Management | Backend service |
| STORY-IA-2 | SLO Model & Repository | Backend MVC |
| STORY-IA-3 | Coverage Computation Service | Backend service |
| STORY-IA-4 | ILO Model & Repository | Backend MVC |
| STORY-IA-10 | Framework Linking Service | Backend service |
| STORY-IA-12 | KaizenML Lint Rule Engine | Backend service |
| STORY-IA-14 | FULFILLS Workflow | Backend service |
| STORY-IA-15 | Nightly Coverage Job | Backend job |
| STORY-IA-16 | Centrality Metrics | Backend computation |
| STORY-IA-27 | Compliance Computation Service | Backend service |
| STORY-IA-35 | Lint Alert Integration | Backend service |
| STORY-IA-36 | Golden Dataset Service | Backend service |
| STORY-IA-38 | Gap Alert Service | Backend service |
| STORY-IA-39 | Report Snapshot Service | Backend service |
| STORY-ST-1 | FastAPI Service Scaffold | Python backend |
| STORY-ST-3 | BKT Mastery Estimation | Python AI |
| STORY-ST-4 | IRT 3PL Calibration | Python AI |
| STORY-ST-5 | Session History | Backend query (may have UI in ST-2) |
| STORY-ST-10 | Adaptive Item Selection | Backend AI |
| STORY-AD-1 | GNN Risk Model | Python AI |
| STORY-AD-2 | Root-Cause Tracing | Backend service |
| STORY-AD-3 | Trajectory Analysis Service | Backend service |
| STORY-AD-4 | Risk Flag Generation | Backend service |
| STORY-AD-7 | Intervention Recommendation Engine | Backend AI |
| STORY-AD-8 | Intervention Logging | Backend service |
| STORY-AD-9 | Admin Cohort Analytics | Backend service |
