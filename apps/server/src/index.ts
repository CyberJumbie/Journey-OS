import "dotenv/config";
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
import { InstitutionUserService } from "./services/user/institution-user.service";
import { InstitutionUserController } from "./controllers/user/institution-user.controller";
import { getSupabaseClient } from "./config/supabase.config";
import { envConfig } from "./config/env.config";
import { AuthRole } from "@journey-os/types";

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

// All other /api/v1 routes require authentication
app.use("/api/v1", createAuthMiddleware());

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

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

export { app };
