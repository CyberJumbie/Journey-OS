import { JourneyOSError } from "./base.errors";

export class ObjectiveError extends JourneyOSError {
  constructor(message: string) {
    super(message, "OBJECTIVE_ERROR");
  }
}

export class DuplicateObjectiveCodeError extends JourneyOSError {
  constructor(code: string, institutionId: string) {
    super(
      `Objective code "${code}" already exists for institution ${institutionId}`,
      "DUPLICATE_OBJECTIVE_CODE",
    );
  }
}

export class ObjectiveNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`Objective not found: ${id}`, "OBJECTIVE_NOT_FOUND");
  }
}

export class InvalidBloomLevelError extends JourneyOSError {
  constructor(level: string) {
    super(
      `Invalid bloom level: "${level}". Must be one of: remember, understand, apply, analyze, evaluate, create`,
      "INVALID_BLOOM_LEVEL",
    );
  }
}
