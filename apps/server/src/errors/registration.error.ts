import { JourneyOSError } from "./base.errors";

export class DuplicateEmailError extends JourneyOSError {
  constructor(message: string = "An account with this email already exists") {
    super(message, "DUPLICATE_EMAIL");
  }
}

export class InvalidRegistrationError extends JourneyOSError {
  constructor(message: string = "Invalid registration data") {
    super(message, "INVALID_REGISTRATION");
  }
}

export class InstitutionNotFoundError extends JourneyOSError {
  constructor(message: string = "Institution not found") {
    super(message, "INSTITUTION_NOT_FOUND");
  }
}
