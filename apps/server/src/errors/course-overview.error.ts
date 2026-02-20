import { JourneyOSError } from "./base.errors";

export class CourseOverviewValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
