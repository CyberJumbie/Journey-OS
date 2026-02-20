import { JourneyOSError } from "./base.errors";

export class ApplicationAlreadyProcessedError extends JourneyOSError {
  constructor(id: string) {
    super(
      `Application ${id} has already been processed`,
      "APPLICATION_ALREADY_PROCESSED",
    );
  }
}

export class RejectionReasonRequiredError extends JourneyOSError {
  constructor() {
    super(
      "Rejection reason is required and must be at least 10 characters",
      "VALIDATION_ERROR",
    );
  }
}
