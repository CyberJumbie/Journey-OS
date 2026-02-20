import { createBrowserRouter } from "react-router";

/**
 * REORGANIZED ROUTES - ALL ROLE-SPECIFIC SCREENS UNDER ROLE FOLDERS
 * 
 * Structure:
 * - /src/app/pages/faculty/* - All faculty screens
 * - /src/app/pages/student/* - All student screens
 * - /src/app/pages/admin/* - All admin screens
 * - /src/app/pages/auth/* - Authentication (shared)
 * - /src/app/pages/onboarding/* - Onboarding (shared)
 * - Other shared screens (profile, settings, help, etc.)
 */

// Auth screens (shared)
import Login from "./pages/auth/Login";
import Registration from "./pages/auth/Registration";
import RoleSelection from "./pages/auth/RoleSelection";
import StudentRegistration from "./pages/auth/StudentRegistration";
import FacultyRegistration from "./pages/auth/FacultyRegistration";
import AdminRegistration from "./pages/auth/AdminRegistration";
import ForgotPassword from "./pages/auth/ForgotPassword";
import EmailVerification from "./pages/auth/EmailVerification";

// Onboarding (shared)
import Onboarding from "./pages/onboarding/Onboarding";
import StudentOnboarding from "./pages/onboarding/StudentOnboarding";
import FacultyOnboarding from "./pages/onboarding/FacultyOnboarding";
import AdminOnboarding from "./pages/onboarding/AdminOnboarding";

// STUDENT - All under /pages/student/
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentPractice from "./pages/student/StudentPractice";
import StudentQuestionView from "./pages/student/StudentQuestionView";
import StudentResults from "./pages/student/StudentResults";
import StudentProgress from "./pages/student/StudentProgress";
import StudentAnalytics from "./pages/student/StudentAnalytics";

// FACULTY - All under /pages/faculty/
import FacultyDashboard from "./pages/faculty/FacultyDashboard";

// Faculty - Courses
import AllCourses from "./pages/faculty/courses/AllCourses";
import CreateCourse from "./pages/faculty/courses/CreateCourse";
import CourseDashboard from "./pages/faculty/courses/CourseDashboard";
import UploadSyllabus from "./pages/faculty/courses/UploadSyllabus";
import SyllabusProcessing from "./pages/faculty/courses/SyllabusProcessing";
import SyllabusEditor from "./pages/faculty/courses/SyllabusEditor";
import ReviewSyllabusMapping from "./pages/faculty/courses/ReviewSyllabusMapping";
import CourseReady from "./pages/faculty/courses/CourseReady";
import LectureUpload from "./pages/faculty/courses/LectureUpload";
import LectureProcessing from "./pages/faculty/courses/LectureProcessing";
import SubConceptReviewQueue from "./pages/faculty/courses/SubConceptReviewQueue";
import OutcomeMapping from "./pages/faculty/courses/OutcomeMapping";
import WeekView from "./pages/faculty/courses/WeekView";
import WeekMaterialsUpload from "./pages/faculty/courses/WeekMaterialsUpload";

// Faculty - Question Generation
import GenerationSpecificationWizard from "./pages/faculty/generation/GenerationSpecificationWizard";
import BatchProgress from "./pages/faculty/generation/BatchProgress";
import GenerateQuestionsTopic from "./pages/faculty/generation/GenerateQuestionsTopic";
import GenerateQuestionsSyllabus from "./pages/faculty/generation/GenerateQuestionsSyllabus";
import GenerateTest from "./pages/faculty/generation/GenerateTest";
import GenerateQuiz from "./pages/faculty/generation/GenerateQuiz";
import GenerateHandout from "./pages/faculty/generation/GenerateHandout";

// Faculty - Question Review
import FacultyReviewQueue from "./pages/faculty/questions/FacultyReviewQueue";
import QuestionReviewList from "./pages/faculty/questions/QuestionReviewList";
import ItemDetail from "./pages/faculty/questions/ItemDetail";
import QuestionDetailView from "./pages/faculty/questions/QuestionDetailView";
import QuestionHistory from "./pages/faculty/questions/QuestionHistory";
import AIRefinement from "./pages/faculty/questions/AIRefinement";
import ConversationalRefinement from "./pages/faculty/questions/ConversationalRefinement";

// Faculty - Exams
import ExamAssembly from "./pages/faculty/exams/ExamAssembly";
import ExamAssignment from "./pages/faculty/exams/ExamAssignment";
import RetiredExamUpload from "./pages/faculty/exams/RetiredExamUpload";

// Faculty - Repository
import Repository from "./pages/faculty/repository/Repository";
import ItemBankBrowser from "./pages/faculty/repository/ItemBankBrowser";

// Faculty - Analytics
import Analytics from "./pages/faculty/analytics/Analytics";
import CourseAnalytics from "./pages/faculty/analytics/CourseAnalytics";
import BlueprintCoverage from "./pages/faculty/analytics/BlueprintCoverage";
import PersonalDashboard from "./pages/faculty/analytics/PersonalDashboard";

// Faculty - Uploads
import FacultyQuestionUpload from "./pages/faculty/FacultyQuestionUpload";

// ADMIN - All under /pages/admin/
import AdminDashboard from "./pages/admin/AdminDashboard";
import SetupWizard from "./pages/admin/SetupWizard";
import CourseCatalog from "./pages/admin/CourseCatalog";
import FrameworkManagement from "./pages/admin/FrameworkManagement";
import FacultyManagement from "./pages/admin/FacultyManagement";
import KnowledgeBrowser from "./pages/admin/KnowledgeBrowser";
import SubConceptDetail from "./pages/admin/SubConceptDetail";
import ILOManagement from "./pages/admin/ILOManagement";
import DataIntegrityDashboard from "./pages/admin/DataIntegrityDashboard";
import FULFILLSReviewQueue from "./pages/admin/FULFILLSReviewQueue";
import LCMEComplianceHeatmap from "./pages/admin/LCMEComplianceHeatmap";
import LCMEElementDrillDown from "./pages/admin/LCMEElementDrillDown";

// Shared screens
import Settings from "./pages/settings/Settings";
import Help from "./pages/help/Help";
import Profile from "./pages/profile/Profile";
import Notifications from "./pages/notifications/Notifications";
import BulkOperations from "./pages/operations/BulkOperations";
import QuestionTemplates from "./pages/templates/QuestionTemplates";
import Collaborators from "./pages/collaboration/Collaborators";
import NotFound from "./pages/errors/NotFound";

export const router = createBrowserRouter([
  // ============================================
  // AUTH & ONBOARDING (Shared)
  // ============================================
  {
    path: "/",
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
    path: "/onboarding",
    Component: Onboarding,
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

  // ============================================
  // STUDENT ROUTES
  // ============================================
  {
    path: "/student-dashboard",
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

  // ============================================
  // FACULTY ROUTES
  // ============================================
  
  // Faculty Dashboard (Legacy route /dashboard redirects to faculty)
  {
    path: "/dashboard",
    Component: FacultyDashboard,
  },
  {
    path: "/faculty-dashboard",
    Component: FacultyDashboard,
  },

  // Faculty - Courses
  {
    path: "/courses",
    Component: AllCourses,
  },
  {
    path: "/courses/create",
    Component: CreateCourse,
  },
  {
    path: "/courses/:courseId",
    Component: CourseDashboard,
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

  // Faculty - Generation
  {
    path: "/generation/wizard",
    Component: GenerationSpecificationWizard,
  },
  {
    path: "/generation/progress",
    Component: BatchProgress,
  },
  {
    path: "/generation/batch-progress",
    Component: BatchProgress,
  },
  {
    path: "/generation/syllabus",
    Component: GenerateQuestionsSyllabus,
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

  // Faculty - Questions
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

  // Faculty - Exams
  {
    path: "/exams/assembly",
    Component: ExamAssembly,
  },
  {
    path: "/exams/builder",
    Component: ExamAssembly,
  },
  {
    path: "/exams/assign",
    Component: ExamAssignment,
  },
  {
    path: "/exams/assignment",
    Component: ExamAssignment,
  },
  {
    path: "/exams/retired-upload",
    Component: RetiredExamUpload,
  },
  {
    path: "/exams/upload-retired",
    Component: RetiredExamUpload,
  },

  // Faculty - Repository
  {
    path: "/repository",
    Component: Repository,
  },
  {
    path: "/repository/item-bank",
    Component: ItemBankBrowser,
  },
  {
    path: "/repository/:id",
    Component: ItemDetail,
  },

  // Faculty - Analytics
  {
    path: "/analytics",
    Component: Analytics,
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

  // Faculty - Uploads
  {
    path: "/uploads/faculty-questions",
    Component: FacultyQuestionUpload,
  },
  {
    path: "/questions/upload",
    Component: FacultyQuestionUpload,
  },

  // Faculty - Shared Tools
  {
    path: "/templates",
    Component: QuestionTemplates,
  },
  {
    path: "/bulk-operations",
    Component: BulkOperations,
  },
  {
    path: "/collaborators",
    Component: Collaborators,
  },

  // ============================================
  // ADMIN ROUTES
  // ============================================
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/admin/setup",
    Component: SetupWizard,
  },
  {
    path: "/admin/setup-wizard",
    Component: SetupWizard,
  },
  {
    path: "/admin/course-catalog",
    Component: CourseCatalog,
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
    path: "/admin/faculty-management",
    Component: FacultyManagement,
  },
  {
    path: "/admin/knowledge",
    Component: KnowledgeBrowser,
  },
  {
    path: "/admin/knowledge-browser",
    Component: KnowledgeBrowser,
  },
  {
    path: "/admin/knowledge/:uuid",
    Component: SubConceptDetail,
  },
  {
    path: "/admin/knowledge-browser/:id",
    Component: SubConceptDetail,
  },
  {
    path: "/admin/ilos",
    Component: ILOManagement,
  },
  {
    path: "/admin/ilo-management",
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
    path: "/admin/lcme-compliance",
    Component: LCMEComplianceHeatmap,
  },
  {
    path: "/admin/lcme-element-drill-down",
    Component: LCMEElementDrillDown,
  },
  {
    path: "/admin/lcme-compliance/:id",
    Component: LCMEElementDrillDown,
  },

  // ============================================
  // SHARED ROUTES
  // ============================================
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/notifications",
    Component: Notifications,
  },
  {
    path: "/settings",
    Component: Settings,
  },
  {
    path: "/help",
    Component: Help,
  },

  // ============================================
  // 404 - MUST BE LAST
  // ============================================
  {
    path: "*",
    Component: NotFound,
  },
]);
