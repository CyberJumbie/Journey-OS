import express, { type Express } from "express";
import cors from "cors";
import { createAuthMiddleware } from "./middleware/auth.middleware";
import {
  createForgotPasswordRateLimiter,
  createRegistrationRateLimiter,
} from "./middleware/rate-limiter.middleware";
import { PasswordResetService } from "./services/auth/password-reset.service";
import { PasswordResetController } from "./controllers/auth/password-reset.controller";
import { RegistrationService } from "./services/auth/registration.service";
import { RegistrationController } from "./controllers/auth/registration.controller";
import { getSupabaseClient } from "./config/supabase.config";
import { envConfig } from "./config/env.config";

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

// All other /api/v1 routes require authentication
app.use("/api/v1", createAuthMiddleware());

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

export { app };
