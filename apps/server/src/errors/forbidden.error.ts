import { JourneyOSError } from "./base.errors";
import { AuthRole } from "@journey-os/types";

export class ForbiddenError extends JourneyOSError {
  readonly #userRole: AuthRole | undefined;
  readonly #requiredRoles: readonly AuthRole[];

  constructor(
    message: string,
    userRole?: AuthRole,
    requiredRoles: readonly AuthRole[] = [],
  ) {
    super(message, "FORBIDDEN");
    this.#userRole = userRole;
    this.#requiredRoles = requiredRoles;
  }

  get userRole(): AuthRole | undefined {
    return this.#userRole;
  }

  get requiredRoles(): readonly AuthRole[] {
    return this.#requiredRoles;
  }
}

export class InstitutionScopeError extends JourneyOSError {
  constructor(
    message: string = "Access denied: you cannot access resources outside your institution",
  ) {
    super(message, "INSTITUTION_SCOPE_VIOLATION");
  }
}
