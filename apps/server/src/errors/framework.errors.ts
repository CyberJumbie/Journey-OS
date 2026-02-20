import { DomainError } from "./base.errors";
import { JourneyOSError } from "./base.errors";

export class InvalidFrameworkNodeError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFrameworkNodeError";
  }
}

export class FrameworkQueryError extends JourneyOSError {
  constructor(message: string) {
    super(message, "FRAMEWORK_QUERY_ERROR");
  }
}
