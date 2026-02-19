import { JourneyOSError } from "./base.errors";

export class AuthenticationError extends JourneyOSError {
  constructor(message: string = "Authentication failed") {
    super(message, "UNAUTHORIZED");
  }
}

export class AuthorizationError extends JourneyOSError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "FORBIDDEN");
  }
}

export class MissingEnvironmentError extends JourneyOSError {
  public readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Missing or invalid environment variables:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
      "MISSING_ENVIRONMENT",
    );
    this.missing = missing;
  }
}
