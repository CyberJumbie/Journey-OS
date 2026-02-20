import { createBrowserRouter } from "react-router";

/**
 * AUTHENTICATION FLOWS BY ROLE
 * 
 * STUDENT FLOW:
 * 1. / (Landing) → Landing page with waitlist
 * 2. /role-selection → Select "Student"
 * 3. /register/student (StudentRegistration) → Fill form
 * 4. Email sent with verification link
 * 5. /email-verification?token=xxx&role=student → Verify email
 * 6. /onboarding/student (StudentOnboarding) → Personalize (study goals, subjects, time)
 * 7. /student-dashboard → Student Dashboard
 * 
 * FACULTY FLOW:
 * 1. / (Landing) → Landing page with waitlist
 * 2. /role-selection → Select "Faculty"
 * 3. /register/faculty (FacultyRegistration) → Fill form
 * 4. Email sent with verification link
 * 5. /email-verification?token=xxx&role=faculty → Verify email
 * 6. /onboarding/faculty (FacultyOnboarding) → Personalize (teaching areas, question types, courses)
 * 7. /dashboard → Faculty Dashboard
 * 
 * ADMIN FLOW:
 * 1. / (Landing) → Landing page with waitlist
 * 2. /role-selection → Select "Institutional Admin"
 * 3. /register/admin (AdminRegistration) → Fill form (includes access code)
 * 4. Email sent with verification link
 * 5. /email-verification?token=xxx&role=admin → Verify email
 * 6. /onboarding/admin (AdminOnboarding) → Setup guide and task overview
 * 7. /admin → Admin Dashboard
 * 
 * SIGN IN:
 * - /login → Select role tab (Student/Faculty/Admin) → Redirects to appropriate dashboard
 */

// Landing page
import Landing from "./pages/Landing";
import Home from "./pages/Home";

// Auth screens
import Login from "./pages/auth/Login";
import Registration from "./pages/auth/Registration";
import RoleSelection from "./pages/auth/RoleSelection";
import StudentRegistration from "./pages/auth/StudentRegistration";
import FacultyRegistration from "./pages/auth/FacultyRegistration";
import AdminRegistration from "./pages/auth/AdminRegistration";
import ForgotPassword from "./pages/auth/ForgotPassword";
import EmailVerification from "./pages/auth/EmailVerification";
import InvitationAccept from "./pages/auth/InvitationAccept";
import PersonaOnboarding from "./pages/auth/PersonaOnboarding";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardFacultyView from "./pages/dashboard/FacultyDashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";

// Student Learning
import StudentPractice from "./pages/student/StudentPractice";
import StudentQuestionView from "./pages/student/StudentQuestionView";
import StudentResults from "./pages/student/StudentResults";
import StudentProgress from "./pages/student/StudentProgress";
import StudentAnalytics from "./pages/student/StudentAnalytics";

// Course Management
import CreateCourse from "./pages/courses/CreateCourse";
import UploadSyllabus from "./pages/courses/UploadSyllabus";
import SyllabusProcessing from "./pages/courses/SyllabusProcessing";
import SyllabusEditor from "./pages/courses/SyllabusEditor";
import ReviewSyllabusMapping from "./pages/courses/ReviewSyllabusMapping";
import CourseDashboard from "./pages/courses/CourseDashboard";
import AllCourses from "./pages/courses/AllCourses";
import LectureUpload from "./pages/courses/LectureUpload";
import LectureProcessing from "./pages/courses/LectureProcessing";
import SubConceptReviewQueue from "./pages/courses/SubConceptReviewQueue";
import OutcomeMapping from "./pages/courses/OutcomeMapping";
import CourseReady from "./pages/courses/CourseReady";
import WeekView from "./pages/courses/WeekView";
import WeekMaterialsUpload from "./pages/courses/WeekMaterialsUpload";

// Question Generation
import GenerateQuestionsSyllabus from "./pages/generation/GenerateQuestionsSyllabus";
import GenerateQuestionsTopic from "./pages/generation/GenerateQuestionsTopic";
import GenerationSpecificationWizard from "./pages/generation/GenerationSpecificationWizard";
import BatchProgress from "./pages/generation/BatchProgress";
import GenerateTest from "./pages/generation/GenerateTest";
import GenerateQuiz from "./pages/generation/GenerateQuiz";
import GenerateHandout from "./pages/generation/GenerateHandout";

// Question Review
import QuestionReviewList from "./pages/questions/QuestionReviewList";
import QuestionDetailView from "./pages/questions/QuestionDetailView";
import ItemDetail from "./pages/questions/ItemDetail";
import AIRefinement from "./pages/questions/AIRefinement";
import ConversationalRefinement from "./pages/questions/ConversationalRefinement";
import QuestionHistory from "./pages/questions/QuestionHistory";
import FacultyReviewQueue from "./pages/questions/FacultyReviewQueue";

// Repository
import Repository from "./pages/repository/Repository";
import ItemBankBrowser from "./pages/repository/ItemBankBrowser";

// Exams
import ExamAssembly from "./pages/exams/ExamAssembly";
import ExamAssignment from "./pages/exams/ExamAssignment";
import RetiredExamUpload from "./pages/exams/RetiredExamUpload";

// Uploads
import FacultyQuestionUpload from "./pages/uploads/FacultyQuestionUpload";

// Analytics
import CourseAnalytics from "./pages/analytics/CourseAnalytics";
import PersonalDashboard from "./pages/analytics/PersonalDashboard";
import BlueprintCoverage from "./pages/analytics/BlueprintCoverage";
import Analytics from "./pages/analytics/Analytics";

// Settings & Support
import Settings from "./pages/settings/Settings";
import Help from "./pages/help/Help";

// Profile & User Management
import Profile from "./pages/profile/Profile";
import Notifications from "./pages/notifications/Notifications";

// Operations & Templates
import BulkOperations from "./pages/operations/BulkOperations";
import QuestionTemplates from "./pages/templates/QuestionTemplates";

// Collaboration
import Collaborators from "./pages/collaboration/Collaborators";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import SetupWizard from "./pages/admin/SetupWizard";
import FrameworkManagement from "./pages/admin/FrameworkManagement";
import FacultyManagement from "./pages/admin/FacultyManagement";
import KnowledgeBrowser from "./pages/admin/KnowledgeBrowser";
import SubConceptDetail from "./pages/admin/SubConceptDetail";
import ILOManagement from "./pages/admin/ILOManagement";
import DataIntegrityDashboard from "./pages/admin/DataIntegrityDashboard";
import FULFILLSReviewQueue from "./pages/admin/FULFILLSReviewQueue";
import LCMEComplianceHeatmap from "./pages/admin/LCMEComplianceHeatmap";
import LCMEElementDrillDown from "./pages/admin/LCMEElementDrillDown";
import AdminUserDirectory from "./pages/admin/AdminUserDirectory";
import ApplicationReviewQueue from "./pages/admin/ApplicationReviewQueue";
import InstitutionListDashboard from "./pages/admin/InstitutionListDashboard";
import InstitutionDetailView from "./pages/admin/InstitutionDetailView";

// Public
import InstitutionApplication from "./pages/InstitutionApplication";

// Institutional Admin
import InstitutionalAdminDashboard from "./pages/institution/InstitutionalAdminDashboard";
import UserManagement from "./pages/institution/UserManagement";
import FrameworkConfiguration from "./pages/institution/FrameworkConfiguration";
import CoverageDashboard from "./pages/institution/CoverageDashboard";
import AccreditationReports from "./pages/institution/AccreditationReports";

// Faculty - Import with alias to avoid conflict with dashboard/FacultyDashboard
import FacultyDashboardMain from "./pages/faculty/FacultyDashboard";
import CourseList from "./pages/faculty/CourseList";
import CourseDetailView from "./pages/faculty/CourseDetailView";
import CreateEditCourse from "./pages/faculty/CreateEditCourse";
import CourseRoster from "./pages/faculty/CourseRoster";
import QuestWorkbench from "./pages/faculty/QuestWorkbench";

// Communication & Collaboration
import FacultyCommunicationHub from "./pages/communications/FacultyCommunicationHub";
import StudentSupportCenter from "./pages/communications/StudentSupportCenter";
import AnnouncementSystem from "./pages/communications/AnnouncementSystem";

// Analytics & Reporting
import InstitutionalAnalytics from "./pages/analytics/InstitutionalAnalytics";
import QuestionPerformanceMetrics from "./pages/analytics/QuestionPerformanceMetrics";

// System Settings & Administration
import SystemConfigurationDashboard from "./pages/settings/SystemConfigurationDashboard";
import UserRoleManagement from "./pages/settings/UserRoleManagement";

// Onboarding
import Onboarding from "./pages/onboarding/Onboarding";
import StudentOnboarding from "./pages/onboarding/StudentOnboarding";
import FacultyOnboarding from "./pages/onboarding/FacultyOnboarding";
import AdminOnboarding from "./pages/onboarding/AdminOnboarding";

// Error pages
import NotFound from "./pages/errors/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/home",
    Component: Home,
  },
  {
    path: "/apply",
    Component: InstitutionApplication,
  },
  {
    path: "/institution",
    Component: InstitutionalAdminDashboard,
  },
  {
    path: "/institution/dashboard",
    Component: InstitutionalAdminDashboard,
  },
  {
    path: "/institution/faculty",
    Component: FacultyManagement,
  },
  {
    path: "/institution/students",
    Component: InstitutionalAdminDashboard,
  },
  {
    path: "/institution/courses",
    Component: InstitutionalAdminDashboard,
  },
  {
    path: "/institution/blueprints",
    Component: InstitutionalAdminDashboard,
  },
  {
    path: "/institution/analytics",
    Component: InstitutionalAnalytics,
  },
  {
    path: "/institution/users",
    Component: UserManagement,
  },
  {
    path: "/institution/frameworks",
    Component: FrameworkConfiguration,
  },
  {
    path: "/institution/coverage",
    Component: CoverageDashboard,
  },
  {
    path: "/institution/accreditation",
    Component: AccreditationReports,
  },
  {
    path: "/institution/settings",
    Component: Settings,
  },
  {
    path: "/faculty",
    Component: FacultyDashboardMain,
  },
  {
    path: "/faculty/dashboard",
    Component: FacultyDashboardMain,
  },
  {
    path: "/faculty/courses",
    Component: CourseList,
  },
  {
    path: "/faculty/courses/create",
    Component: CreateEditCourse,
  },
  {
    path: "/faculty/courses/:id",
    Component: CourseDetailView,
  },
  {
    path: "/faculty/courses/:id/edit",
    Component: CreateEditCourse,
  },
  {
    path: "/faculty/courses/:id/roster",
    Component: CourseRoster,
  },
  {
    path: "/faculty/questions/generate",
    Component: GenerateQuestionsTopic,
  },
  {
    path: "/faculty/quest",
    Component: QuestWorkbench,
  },
  {
    path: "/faculty/questions/batch-upload",
    Component: GenerateQuestionsTopic,
  },
  {
    path: "/faculty/questions/retired-upload",
    Component: GenerateQuestionsTopic,
  },
  {
    path: "/faculty/questions/repository",
    Component: Repository,
  },
  {
    path: "/faculty/questions/:id",
    Component: QuestionDetailView,
  },
  {
    path: "/faculty/questions/review",
    Component: FacultyReviewQueue,
  },
  {
    path: "/faculty/exams/assembly",
    Component: ExamAssembly,
  },
  {
    path: "/faculty/exams/assignment",
    Component: ExamAssignment,
  },
  {
    path: "/faculty/communications",
    Component: FacultyCommunicationHub,
  },
  {
    path: "/faculty/analytics",
    Component: InstitutionalAnalytics,
  },
  {
    path: "/faculty/repository",
    Component: Repository,
  },
  {
    path: "/faculty/settings",
    Component: Settings,
  },
  {
    path: "/role-selection",
    Component: RoleSelection,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Registration,
  },
  {
    path: "/register/student",
    Component: StudentRegistration,
  },
  {
    path: "/register/faculty",
    Component: FacultyRegistration,
  },
  {
    path: "/register/admin",
    Component: AdminRegistration,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/email-verification",
    Component: EmailVerification,
  },
  {
    path: "/verify-email",
    Component: EmailVerification,
  },
  {
    path: "/invite/accept",
    Component: InvitationAccept,
  },
  {
    path: "/onboarding",
    Component: PersonaOnboarding,
  },
  {
    path: "/onboarding/student",
    Component: StudentOnboarding,
  },
  {
    path: "/onboarding/faculty",
    Component: FacultyOnboarding,
  },
  {
    path: "/onboarding/admin",
    Component: AdminOnboarding,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/faculty-dashboard",
    Component: DashboardFacultyView,
  },
  {
    path: "/student-dashboard",
    Component: StudentDashboard,
  },
  {
    path: "/student",
    Component: StudentDashboard,
  },
  {
    path: "/student/dashboard",
    Component: StudentDashboard,
  },
  {
    path: "/student/practice",
    Component: StudentPractice,
  },
  {
    path: "/student/practice/session",
    Component: StudentQuestionView,
  },
  {
    path: "/student/practice/results",
    Component: StudentResults,
  },
  {
    path: "/student/progress",
    Component: StudentProgress,
  },
  {
    path: "/student/analytics",
    Component: StudentAnalytics,
  },
  {
    path: "/student/support",
    Component: StudentSupportCenter,
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/notifications",
    Component: Notifications,
  },
  {
    path: "/courses",
    Component: AllCourses,
  },
  {
    path: "/courses/create",
    Component: CreateCourse,
  },
  {
    path: "/courses/:courseId/upload-syllabus",
    Component: UploadSyllabus,
  },
  {
    path: "/courses/:courseId/processing",
    Component: SyllabusProcessing,
  },
  {
    path: "/courses/:courseId/review-mapping",
    Component: ReviewSyllabusMapping,
  },
  {
    path: "/courses/:courseId/ready",
    Component: CourseReady,
  },
  {
    path: "/courses/:courseId/week/:weekId",
    Component: WeekView,
  },
  {
    path: "/courses/:courseId/week/:weekId/upload-materials",
    Component: WeekMaterialsUpload,
  },
  {
    path: "/courses/:courseId/week/:weekId/generate",
    Component: GenerateQuestionsSyllabus,
  },
  {
    path: "/courses/:courseId/week/:weekId/generate-test",
    Component: GenerateTest,
  },
  {
    path: "/courses/:courseId/week/:weekId/generate-quiz",
    Component: GenerateQuiz,
  },
  {
    path: "/courses/:courseId/week/:weekId/generate-handout",
    Component: GenerateHandout,
  },
  {
    path: "/courses/:courseId",
    Component: CourseDashboard,
  },
  {
    path: "/courses/upload-lecture",
    Component: LectureUpload,
  },
  {
    path: "/courses/lecture-processing",
    Component: LectureProcessing,
  },
  {
    path: "/courses/subconcept-review",
    Component: SubConceptReviewQueue,
  },
  {
    path: "/courses/syllabus-editor",
    Component: SyllabusEditor,
  },
  {
    path: "/courses/outcome-mapping",
    Component: OutcomeMapping,
  },
  {
    path: "/generation/wizard",
    Component: GenerationSpecificationWizard,
  },
  {
    path: "/generation/progress",
    Component: BatchProgress,
  },
  {
    path: "/generate/topic",
    Component: GenerateQuestionsTopic,
  },
  {
    path: "/generate/test",
    Component: GenerateTest,
  },
  {
    path: "/generate/quiz",
    Component: GenerateQuiz,
  },
  {
    path: "/generate/handout",
    Component: GenerateHandout,
  },
  {
    path: "/courses/:courseId/questions",
    Component: QuestionReviewList,
  },
  {
    path: "/questions/review",
    Component: FacultyReviewQueue,
  },
  {
    path: "/questions/:questionId",
    Component: ItemDetail,
  },
  {
    path: "/questions/:questionId/detail",
    Component: QuestionDetailView,
  },
  {
    path: "/questions/:questionId/refine",
    Component: ConversationalRefinement,
  },
  {
    path: "/questions/:questionId/ai-refine",
    Component: AIRefinement,
  },
  {
    path: "/questions/:questionId/history",
    Component: QuestionHistory,
  },
  {
    path: "/exams/assembly",
    Component: ExamAssembly,
  },
  {
    path: "/exams/assign",
    Component: ExamAssignment,
  },
  {
    path: "/exams/retired-upload",
    Component: RetiredExamUpload,
  },
  {
    path: "/uploads/faculty-questions",
    Component: FacultyQuestionUpload,
  },
  {
    path: "/repository",
    Component: Repository,
  },
  {
    path: "/repository/item-bank",
    Component: ItemBankBrowser,
  },
  {
    path: "/templates",
    Component: QuestionTemplates,
  },
  {
    path: "/bulk-operations",
    Component: BulkOperations,
  },
  {
    path: "/analytics/course/:courseId",
    Component: CourseAnalytics,
  },
  {
    path: "/analytics/personal",
    Component: PersonalDashboard,
  },
  {
    path: "/analytics/blueprint-coverage",
    Component: BlueprintCoverage,
  },
  {
    path: "/analytics",
    Component: Analytics,
  },
  {
    path: "/analytics/questions",
    Component: QuestionPerformanceMetrics,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
  {
    path: "/admin/institutions",
    Component: InstitutionListDashboard,
  },
  {
    path: "/admin/users",
    Component: AdminUserDirectory,
  },
  {
    path: "/admin/announcements",
    Component: AnnouncementSystem,
  },
  {
    path: "/admin/analytics",
    Component: InstitutionalAnalytics,
  },
  {
    path: "/admin/settings",
    Component: SystemConfigurationDashboard,
  },
  {
    path: "/admin/settings/roles",
    Component: UserRoleManagement,
  },
  {
    path: "/admin/applications",
    Component: ApplicationReviewQueue,
  },
  {
    path: "/admin/institutions/:id",
    Component: InstitutionDetailView,
  },
  {
    path: "/admin/setup",
    Component: SetupWizard,
  },
  {
    path: "/admin/frameworks",
    Component: FrameworkManagement,
  },
  {
    path: "/admin/faculty",
    Component: FacultyManagement,
  },
  {
    path: "/admin/knowledge",
    Component: KnowledgeBrowser,
  },
  {
    path: "/admin/knowledge/:uuid",
    Component: SubConceptDetail,
  },
  {
    path: "/admin/ilos",
    Component: ILOManagement,
  },
  {
    path: "/admin/data-integrity",
    Component: DataIntegrityDashboard,
  },
  {
    path: "/admin/fulfills-review",
    Component: FULFILLSReviewQueue,
  },
  {
    path: "/admin/lcme-compliance-heatmap",
    Component: LCMEComplianceHeatmap,
  },
  {
    path: "/admin/lcme-element-drill-down",
    Component: LCMEElementDrillDown,
  },
  {
    path: "/settings",
    Component: Settings,
  },
  {
    path: "/help",
    Component: Help,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);