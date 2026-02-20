import { JourneyOSError } from "./base.errors";

export class DuplicateApplicationError extends JourneyOSError {
  constructor() {
    super(
      "An application with this email or institution name is already pending",
      "DUPLICATE_APPLICATION",
    );
  }
}

export class InvalidApplicationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class ApplicationNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`Application not found: ${id}`, "NOT_FOUND");
  }
}
