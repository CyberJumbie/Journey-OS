import { JourneyOSError } from "./base.errors";

export class InstitutionAlreadySuspendedError extends JourneyOSError {
  constructor(id: string) {
    super(
      `Institution ${id} is already suspended`,
      "INSTITUTION_ALREADY_SUSPENDED",
    );
  }
}

export class InstitutionNotSuspendedError extends JourneyOSError {
  constructor(id: string) {
    super(
      `Institution ${id} is not currently suspended`,
      "INSTITUTION_NOT_SUSPENDED",
    );
  }
}

export class SuspendReasonRequiredError extends JourneyOSError {
  constructor() {
    super(
      "A reason of at least 10 characters is required when suspending an institution",
      "SUSPEND_REASON_REQUIRED",
    );
  }
}

export class InstitutionLifecycleOperationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "LIFECYCLE_OPERATION_FAILED");
  }
}

export class InstitutionSuspendedError extends JourneyOSError {
  constructor() {
    super(
      "Your institution has been suspended. Please contact your administrator.",
      "INSTITUTION_SUSPENDED",
    );
  }
}
