import "dotenv/config";
import { createServer } from "http";
import express, { type Express } from "express";
import cors from "cors";
import { createAuthMiddleware } from "./middleware/auth.middleware";
import {
  createForgotPasswordRateLimiter,
  createRegistrationRateLimiter,
  createApplicationRateLimiter,
} from "./middleware/rate-limiter.middleware";
import { PasswordResetService } from "./services/auth/password-reset.service";
import { PasswordResetController } from "./controllers/auth/password-reset.controller";
import { RegistrationService } from "./services/auth/registration.service";
import { RegistrationController } from "./controllers/auth/registration.controller";
import { ApplicationService } from "./services/institution/application.service";
import { ApplicationController } from "./controllers/institution/application.controller";
import { createRbacMiddleware } from "./middleware/rbac.middleware";
import { GlobalUserService } from "./services/user/global-user.service";
import { GlobalUserController } from "./controllers/user/global-user.controller";
import { ApplicationReviewService } from "./services/institution/application-review.service";
import { ApplicationReviewController } from "./controllers/institution/application-review.controller";
import { InstitutionService } from "./services/institution/institution.service";
import { ApprovalController } from "./controllers/institution/approval.controller";
import { InvitationEmailService } from "./services/email/invitation-email.service";
import { UserInvitationEmailService } from "./services/email/user-invitation-email.service";
import { ReassignmentEmailService } from "./services/email/reassignment-email.service";
import { InstitutionUserService } from "./services/user/institution-user.service";
import { InstitutionUserController } from "./controllers/user/institution-user.controller";
import { UserReassignmentService } from "./services/user/user-reassignment.service";
import { UserReassignmentController } from "./controllers/user/user-reassignment.controller";
import { InvitationAcceptanceService } from "./services/auth/invitation-acceptance.service";
import { InvitationAcceptanceController } from "./controllers/auth/invitation-acceptance.controller";
import { OnboardingService } from "./services/auth/onboarding.service";
import { OnboardingController } from "./controllers/auth/onboarding.controller";
import { ResendVerificationService } from "./services/auth/resend-verification.service";
import { ResendVerificationController } from "./controllers/auth/resend-verification.controller";
import { createEmailVerificationMiddleware } from "./middleware/email-verification.middleware";
import { RejectionService } from "./services/institution/rejection.service";
import { RejectionController } from "./controllers/institution/rejection.controller";
import { RejectionEmailService } from "./services/email/rejection-email.service";
import { AdminDashboardService } from "./services/admin/admin-dashboard.service";
import { DashboardController } from "./controllers/admin/dashboard.controller";
import { InstitutionMonitoringService } from "./services/admin/institution-monitoring.service";
import { InstitutionMonitoringController } from "./controllers/admin/institution-monitoring.controller";
import { NotificationRepository } from "./repositories/notification.repository";
import { NotificationService } from "./services/notification/notification.service";
import { NotificationController } from "./controllers/notification/notification.controller";
import { CourseRepository } from "./repositories/course.repository";
import { CourseService } from "./services/course/course.service";
import { CourseController } from "./controllers/course/course.controller";
import { ProgramRepository } from "./repositories/program.repository";
import { SectionRepository } from "./repositories/section.repository";
import { SessionRepository } from "./repositories/session.repository";
import { HierarchyService } from "./services/course/hierarchy.service";
import { HierarchyController } from "./controllers/course/hierarchy.controller";
import { CourseViewService } from "./services/course/course-view.service";
import { CourseViewController } from "./controllers/course/course-view.controller";
import { TemplateRepository } from "./repositories/template.repository";
import { TemplateService } from "./services/template/template.service";
import { TemplateController } from "./controllers/template/template.controller";
import { FrameworkService } from "./services/framework/framework.service";
import { FrameworkController } from "./controllers/framework/framework.controller";
import { Neo4jClientConfig } from "./config/neo4j.config";
import { LintReportRepository } from "./repositories/lint-report.repository";
import { LintRuleRegistryService } from "./services/kaizen/lint-rule-registry.service";
import { LintEngineService } from "./services/kaizen/lint-engine.service";
import { LintController } from "./controllers/kaizen/lint.controller";
import { OrphanConceptsRule } from "./services/kaizen/rules/orphan-concepts.rule";
import { DanglingSloRule } from "./services/kaizen/rules/dangling-slo.rule";
import { EmbeddingDriftRule } from "./services/kaizen/rules/embedding-drift.rule";
import { StaleItemsRule } from "./services/kaizen/rules/stale-items.rule";
import { TagInconsistencyRule } from "./services/kaizen/rules/tag-inconsistency.rule";
import { DuplicateMappingsRule } from "./services/kaizen/rules/duplicate-mappings.rule";
import { MissingProvenanceRule } from "./services/kaizen/rules/missing-provenance.rule";
import { ScoreSkewRule } from "./services/kaizen/rules/score-skew.rule";
import { LowConfidenceTagsRule } from "./services/kaizen/rules/low-confidence-tags.rule";
import multer from "multer";
import { getSupabaseClient } from "./config/supabase.config";
import { envConfig } from "./config/env.config";
import { AuthRole, AVATAR_MAX_SIZE_BYTES } from "@journey-os/types";
import { ProfileRepository } from "./repositories/profile.repository";
import { ProfileService } from "./services/profile/profile.service";
import { ProfileController } from "./controllers/profile/profile.controller";
import { CourseOversightService } from "./services/course/course-oversight.service";
import { CourseOversightController } from "./controllers/course/course-oversight.controller";
import { ScheduleService } from "./services/course/schedule.service";
import { ScheduleController } from "./controllers/course/schedule.controller";
import { InstitutionLifecycleService } from "./services/admin/institution-lifecycle.service";
import { InstitutionLifecycleController } from "./controllers/admin/institution-lifecycle.controller";
import { createInstitutionStatusMiddleware } from "./middleware/institution-status.middleware";
import { AuthService } from "./services/auth/auth.service";
import { createSocketServer } from "./config/socket.config";
import { SocketManagerService } from "./services/notification/socket-manager.service";
import { SocketNotificationService } from "./services/notification/socket-notification.service";
import { UploadRepository } from "./repositories/upload.repository";
import { UploadService } from "./services/upload/upload.service";
import { UploadController } from "./controllers/upload.controller";
import { uploadFiles } from "./middleware/upload.validation";
import { ActivityFeedRepository } from "./repositories/activity.repository";
import { ActivityFeedService } from "./services/activity/activity-feed.service";
import { ActivityFeedController } from "./controllers/activity.controller";
import { KpiService } from "./services/dashboard/kpi.service";
import { KpiController } from "./controllers/dashboard/kpi.controller";
import { NotificationPreferenceService } from "./services/user/notification-preference.service";
import { NotificationPreferenceController } from "./controllers/user/notification-preference.controller";
import { GenerationPreferenceService } from "./services/user/generation-preference.service"; // [STORY-F-17]
import { GenerationPreferenceController } from "./controllers/user/generation-preference.controller"; // [STORY-F-17]

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health endpoint is public — placed BEFORE auth middleware
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Forgot password — public, rate-limited, no auth required
const passwordResetService = new PasswordResetService(
  getSupabaseClient(),
  envConfig.SITE_URL ?? "http://localhost:3000",
);
const passwordResetController = new PasswordResetController(
  passwordResetService,
);
app.post(
  "/api/v1/auth/forgot-password",
  createForgotPasswordRateLimiter(),
  (req, res) => passwordResetController.handleForgotPassword(req, res),
);

// Registration — public, rate-limited, no auth required
const supabaseClient = getSupabaseClient();
const registrationService = new RegistrationService(supabaseClient);
const registrationController = new RegistrationController(
  registrationService,
  supabaseClient,
);
app.post("/api/v1/auth/register", createRegistrationRateLimiter(), (req, res) =>
  registrationController.handleRegister(req, res),
);
app.get("/api/v1/auth/institutions/search", (req, res) =>
  registrationController.handleInstitutionSearch(req, res),
);

// Waitlist application — public, rate-limited, no auth required
const applicationService = new ApplicationService(supabaseClient);
const applicationController = new ApplicationController(applicationService);
app.post("/api/v1/waitlist", createApplicationRateLimiter(), (req, res) =>
  applicationController.handleSubmit(req, res),
);

// Invitation acceptance — public, no auth required (user has no account yet)
const invitationAcceptanceService = new InvitationAcceptanceService(
  supabaseClient,
);
const invitationAcceptanceController = new InvitationAcceptanceController(
  invitationAcceptanceService,
);
app.get("/api/v1/invitations/validate", (req, res) =>
  invitationAcceptanceController.handleValidate(req, res),
);
app.post("/api/v1/invitations/accept", (req, res) =>
  invitationAcceptanceController.handleAccept(req, res),
);

// All other /api/v1 routes require authentication
app.use("/api/v1", createAuthMiddleware());

// Block users from suspended institutions (runs after auth, before email verification)
app.use("/api/v1", createInstitutionStatusMiddleware());

// Onboarding — authenticated, no RBAC (all roles access their own onboarding)
const onboardingService = new OnboardingService(supabaseClient);
const onboardingController = new OnboardingController(onboardingService);
app.get("/api/v1/onboarding/status", (req, res) =>
  onboardingController.handleGetStatus(req, res),
);
app.post("/api/v1/onboarding/complete", (req, res) =>
  onboardingController.handleComplete(req, res),
);

// Resend verification — authenticated, exempt from email verification check (by position)
const resendVerificationService = new ResendVerificationService(supabaseClient);
const resendVerificationController = new ResendVerificationController(
  resendVerificationService,
);
app.post("/api/v1/auth/resend-verification", (req, res) =>
  resendVerificationController.handleResend(req, res),
);

// Email verification gate — blocks unverified users from all routes below
app.use("/api/v1", createEmailVerificationMiddleware());

// Protected routes — SuperAdmin only
const rbac = createRbacMiddleware();
const globalUserService = new GlobalUserService(supabaseClient);
const globalUserController = new GlobalUserController(globalUserService);
app.get("/api/v1/admin/users", rbac.require(AuthRole.SUPERADMIN), (req, res) =>
  globalUserController.handleList(req, res),
);

// Application review queue — SuperAdmin only
const applicationReviewService = new ApplicationReviewService(supabaseClient);
const applicationReviewController = new ApplicationReviewController(
  applicationReviewService,
);
app.get(
  "/api/v1/admin/applications",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => applicationReviewController.handleList(req, res),
);
app.get(
  "/api/v1/admin/applications/:id",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => applicationReviewController.handleGetById(req, res),
);

// Application approval — SuperAdmin only
const emailService = new InvitationEmailService();
const institutionService = new InstitutionService(supabaseClient, emailService);
const approvalController = new ApprovalController(institutionService);
app.patch(
  "/api/v1/admin/applications/:id/approve",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => approvalController.handleApprove(req, res),
);

// Application rejection — SuperAdmin only
const rejectionEmailService = new RejectionEmailService();
const rejectionService = new RejectionService(
  supabaseClient,
  rejectionEmailService,
);
const rejectionController = new RejectionController(rejectionService);
app.patch(
  "/api/v1/admin/applications/:id/reject",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => rejectionController.handleReject(req, res),
);

// Institution monitoring — SuperAdmin only
const institutionMonitoringService = new InstitutionMonitoringService(
  supabaseClient,
);
const institutionMonitoringController = new InstitutionMonitoringController(
  institutionMonitoringService,
);
app.get(
  "/api/v1/admin/institutions",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => institutionMonitoringController.handleList(req, res),
);
app.get(
  "/api/v1/admin/institutions/:id/detail",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => institutionMonitoringController.handleGetDetail(req, res),
);

// Institution suspend/reactivate — SuperAdmin only
const institutionLifecycleService = new InstitutionLifecycleService(
  supabaseClient,
);
const institutionLifecycleController = new InstitutionLifecycleController(
  institutionLifecycleService,
);
app.post(
  "/api/v1/admin/institutions/:id/suspend",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => institutionLifecycleController.handleSuspend(req, res),
);
app.post(
  "/api/v1/admin/institutions/:id/reactivate",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => institutionLifecycleController.handleReactivate(req, res),
);

// User reassignment — SuperAdmin only
const reassignmentEmailService = new ReassignmentEmailService();
const userReassignmentService = new UserReassignmentService(
  supabaseClient,
  reassignmentEmailService,
);
const userReassignmentController = new UserReassignmentController(
  userReassignmentService,
);
app.post(
  "/api/v1/admin/users/:userId/reassign",
  rbac.require(AuthRole.SUPERADMIN),
  (req, res) => userReassignmentController.handleReassign(req, res),
);

// Institution user management — InstitutionalAdmin only
const userInvitationEmailService = new UserInvitationEmailService();
const institutionUserService = new InstitutionUserService(
  supabaseClient,
  userInvitationEmailService,
);
const institutionUserController = new InstitutionUserController(
  institutionUserService,
);
app.get(
  "/api/v1/institution/users",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => institutionUserController.handleList(req, res),
);
app.post(
  "/api/v1/institution/users/invite",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => institutionUserController.handleInvite(req, res),
);

// Institution dashboard — InstitutionalAdmin or SuperAdmin
const adminDashboardService = new AdminDashboardService(supabaseClient);
const dashboardController = new DashboardController(adminDashboardService);
app.get(
  "/api/v1/institution/dashboard",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN),
  (req, res) => dashboardController.getDashboard(req, res),
);

// Framework browser — InstitutionalAdmin or SuperAdmin (requires Neo4j)
try {
  const neo4jDriver = Neo4jClientConfig.getInstance().driver;
  const frameworkService = new FrameworkService(neo4jDriver);
  const frameworkController = new FrameworkController(frameworkService);
  app.get(
    "/api/v1/institution/frameworks",
    rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN),
    (req, res) => frameworkController.listFrameworks(req, res),
  );
} catch {
  console.log(
    "[server] Neo4j not configured — framework routes not registered",
  );
}

// KaizenML Lint Engine — InstitutionalAdmin only
const lintReportRepository = new LintReportRepository(supabaseClient);
const lintRegistry = new LintRuleRegistryService();
lintRegistry.register(new OrphanConceptsRule(null));
lintRegistry.register(new DanglingSloRule(supabaseClient));
lintRegistry.register(new EmbeddingDriftRule());
lintRegistry.register(new StaleItemsRule(supabaseClient));
lintRegistry.register(new TagInconsistencyRule(supabaseClient));
lintRegistry.register(new DuplicateMappingsRule());
lintRegistry.register(new MissingProvenanceRule(supabaseClient));
lintRegistry.register(new ScoreSkewRule(supabaseClient));
lintRegistry.register(new LowConfidenceTagsRule());
const lintEngine = new LintEngineService(lintReportRepository, lintRegistry);
const lintController = new LintController(
  lintEngine,
  lintReportRepository,
  lintRegistry,
);
app.get(
  "/api/v1/institution/lint/reports",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => lintController.handleListReports(req, res),
);
app.get(
  "/api/v1/institution/lint/reports/:id",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => lintController.handleGetReport(req, res),
);
app.post(
  "/api/v1/institution/lint/run",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => lintController.handleRunScan(req, res),
);
app.get(
  "/api/v1/institution/lint/config",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => lintController.handleGetConfig(req, res),
);
app.patch(
  "/api/v1/institution/lint/config/:ruleId",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => lintController.handleUpdateConfig(req, res),
);

// Course oversight dashboard — InstitutionalAdmin only
const courseOversightService = new CourseOversightService(supabaseClient);
const courseOversightController = new CourseOversightController(
  courseOversightService,
);
app.get(
  "/api/v1/institution/courses/overview",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => courseOversightController.handleGetOverview(req, res),
);

// Course management — CourseDirector (SuperAdmin, InstitutionalAdmin, Faculty w/ is_course_director)
const courseRepository = new CourseRepository(supabaseClient);
const courseService = new CourseService(courseRepository, null);
const courseController = new CourseController(courseService);
app.post("/api/v1/courses", rbac.requireCourseDirector(), (req, res) =>
  courseController.handleCreate(req, res),
);
app.get("/api/v1/courses", rbac.requireCourseDirector(), (req, res) =>
  courseController.handleList(req, res),
);
app.get(
  "/api/v1/courses/code/:code",
  rbac.requireCourseDirector(),
  (req, res) => courseController.handleGetByCode(req, res),
);
app.get("/api/v1/courses/:id", rbac.requireCourseDirector(), (req, res) =>
  courseController.handleGetById(req, res),
);
app.patch("/api/v1/courses/:id", rbac.requireCourseDirector(), (req, res) =>
  courseController.handleUpdate(req, res),
);
app.patch(
  "/api/v1/courses/:id/archive",
  rbac.requireCourseDirector(),
  (req, res) => courseController.handleArchive(req, res),
);

// Course hierarchy — Programs (InstitutionalAdmin+), Sections/Sessions (Faculty+)
const programRepository = new ProgramRepository(supabaseClient);
const sectionRepository = new SectionRepository(supabaseClient);
const sessionRepository = new SessionRepository(supabaseClient);
const hierarchyService = new HierarchyService(
  programRepository,
  sectionRepository,
  sessionRepository,
  courseRepository,
  null,
);
const hierarchyController = new HierarchyController(hierarchyService);
app.post(
  "/api/v1/programs",
  rbac.require(AuthRole.INSTITUTIONAL_ADMIN),
  (req, res) => hierarchyController.handleCreateProgram(req, res),
);
app.get(
  "/api/v1/courses/:courseId/hierarchy",
  rbac.require(AuthRole.FACULTY),
  (req, res) => hierarchyController.handleGetCourseHierarchy(req, res),
);
app.post(
  "/api/v1/courses/:courseId/sections",
  rbac.require(AuthRole.FACULTY),
  (req, res) => hierarchyController.handleCreateSection(req, res),
);
app.put(
  "/api/v1/courses/:courseId/sections/reorder",
  rbac.require(AuthRole.FACULTY),
  (req, res) => hierarchyController.handleReorderSections(req, res),
);
app.post(
  "/api/v1/sections/:sectionId/sessions",
  rbac.require(AuthRole.FACULTY),
  (req, res) => hierarchyController.handleCreateSession(req, res),
);

// Course views — enriched list + detail (Faculty)
const courseViewService = new CourseViewService(
  courseRepository,
  hierarchyService,
);
const courseViewController = new CourseViewController(courseViewService);
app.get("/api/v1/courses/view", rbac.require(AuthRole.FACULTY), (req, res) =>
  courseViewController.handleListView(req, res),
);
app.get(
  "/api/v1/courses/:id/view",
  rbac.require(AuthRole.FACULTY),
  (req, res) => courseViewController.handleGetDetailView(req, res),
);

// Weekly schedule — InstitutionalAdmin, Faculty, SuperAdmin
const scheduleService = new ScheduleService(supabaseClient);
const scheduleController = new ScheduleController(scheduleService);
app.get(
  "/api/v1/courses/:id/schedule",
  rbac.require(
    AuthRole.INSTITUTIONAL_ADMIN,
    AuthRole.FACULTY,
    AuthRole.SUPERADMIN,
  ),
  (req, res) => scheduleController.getSchedule(req, res),
);

// File upload — Faculty only
const uploadRepository = new UploadRepository(supabaseClient);
const uploadService = new UploadService(uploadRepository, supabaseClient);
const uploadController = new UploadController(uploadService);
app.post(
  "/api/v1/courses/:courseId/upload",
  rbac.require(AuthRole.FACULTY),
  uploadFiles,
  (req, res) => uploadController.handleUpload(req, res),
);

// Activity feed — Faculty and above
const activityRepository = new ActivityFeedRepository(supabaseClient);
const activityService = new ActivityFeedService(activityRepository);
const activityController = new ActivityFeedController(activityService);
app.get("/api/v1/activity", rbac.require(AuthRole.FACULTY), (req, res) =>
  activityController.handleList(req, res),
);

// Dashboard KPIs — Faculty and above
const kpiService = new KpiService(supabaseClient);
const kpiController = new KpiController(kpiService);
app.get("/api/v1/dashboard/kpis", rbac.require(AuthRole.FACULTY), (req, res) =>
  kpiController.handleGetKpis(req, res),
);

// Notifications — any authenticated user (no RBAC role check)
// Static routes BEFORE parameterized /:id/read to avoid param capture
const notificationRepository = new NotificationRepository(supabaseClient);
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);
app.get("/api/v1/notifications/unread-count", (req, res) =>
  notificationController.handleUnreadCount(req, res),
);
app.post("/api/v1/notifications/mark-all-read", (req, res) =>
  notificationController.handleMarkAllAsRead(req, res),
);
app.get("/api/v1/notifications", (req, res) =>
  notificationController.handleList(req, res),
);
app.patch("/api/v1/notifications/:id/read", (req, res) =>
  notificationController.handleMarkAsRead(req, res),
);

// Templates — Faculty only
const templateRepository = new TemplateRepository(supabaseClient);
const templateService = new TemplateService(templateRepository, null);
const templateController = new TemplateController(templateService);
app.post("/api/v1/templates", rbac.require(AuthRole.FACULTY), (req, res) =>
  templateController.handleCreate(req, res),
);
app.get("/api/v1/templates", rbac.require(AuthRole.FACULTY), (req, res) =>
  templateController.handleList(req, res),
);
app.get("/api/v1/templates/:id", rbac.require(AuthRole.FACULTY), (req, res) =>
  templateController.handleGetById(req, res),
);
app.put("/api/v1/templates/:id", rbac.require(AuthRole.FACULTY), (req, res) =>
  templateController.handleUpdate(req, res),
);
app.delete(
  "/api/v1/templates/:id",
  rbac.require(AuthRole.FACULTY),
  (req, res) => templateController.handleDelete(req, res),
);
app.post(
  "/api/v1/templates/:id/duplicate",
  rbac.require(AuthRole.FACULTY),
  (req, res) => templateController.handleDuplicate(req, res),
);
app.get(
  "/api/v1/templates/:id/versions",
  rbac.require(AuthRole.FACULTY),
  (req, res) => templateController.handleGetVersions(req, res),
);

// Profile — any authenticated user (no RBAC role check)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES },
});
const profileRepository = new ProfileRepository(supabaseClient);
const profileService = new ProfileService(
  profileRepository,
  supabaseClient,
  null,
);
const profileController = new ProfileController(profileService);
app.get("/api/v1/profile", (req, res) =>
  profileController.handleGetProfile(req, res),
);
app.patch("/api/v1/profile", (req, res) =>
  profileController.handleUpdateProfile(req, res),
);
app.post("/api/v1/profile/avatar", avatarUpload.single("avatar"), (req, res) =>
  profileController.handleUploadAvatar(req, res),
);
app.delete("/api/v1/profile/avatar", (req, res) =>
  profileController.handleRemoveAvatar(req, res),
);

// Settings — notification preferences (faculty+)
const notificationPreferenceService = new NotificationPreferenceService(
  supabaseClient,
);
const notificationPreferenceController = new NotificationPreferenceController(
  notificationPreferenceService,
);
app.get(
  "/api/v1/settings/notifications",
  rbac.require(AuthRole.FACULTY),
  (req, res) => notificationPreferenceController.handleGet(req, res),
);
app.put(
  "/api/v1/settings/notifications",
  rbac.require(AuthRole.FACULTY),
  (req, res) => notificationPreferenceController.handleUpdate(req, res),
);
app.post(
  "/api/v1/settings/notifications/reset",
  rbac.require(AuthRole.FACULTY),
  (req, res) => notificationPreferenceController.handleReset(req, res),
);

// Settings — generation preferences (faculty+) [STORY-F-17]
const generationPreferenceService = new GenerationPreferenceService(
  supabaseClient,
);
const generationPreferenceController = new GenerationPreferenceController(
  generationPreferenceService,
);
app.get(
  "/api/v1/settings/generation",
  rbac.require(AuthRole.FACULTY),
  (req, res) => generationPreferenceController.handleGet(req, res),
);
app.put(
  "/api/v1/settings/generation",
  rbac.require(AuthRole.FACULTY),
  (req, res) => generationPreferenceController.handleUpdate(req, res),
);

// Socket.io — real-time notifications and presence
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
const authService = new AuthService(supabaseClient);
const socketManager = new SocketManagerService(io, authService);
const socketNotificationService = new SocketNotificationService(
  notificationService,
  socketManager,
);
socketManager.setNotificationService(notificationService);
socketManager.initialize();

httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
  console.log(`[socket] Socket.io attached to HTTP server`);
});

export { app, httpServer, socketManager, socketNotificationService };
