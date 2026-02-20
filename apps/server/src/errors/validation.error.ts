import { JourneyOSError } from "./base.errors";

export class ValidationError extends JourneyOSError {
  constructor(message: string = "Validation failed") {
    super(message, "VALIDATION_ERROR");
  }
}
