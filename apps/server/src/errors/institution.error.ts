import { JourneyOSError } from "./base.errors";

export class DuplicateApprovalError extends JourneyOSError {
  constructor(id: string) {
    super(`Application ${id} has already been processed`, "DUPLICATE_APPROVAL");
  }
}

export class InstitutionCreationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "INSTITUTION_CREATION_ERROR");
  }
}

export class DuplicateDomainError extends JourneyOSError {
  constructor(domain: string) {
    super(
      `An institution with domain "${domain}" already exists`,
      "DUPLICATE_DOMAIN",
    );
  }
}
