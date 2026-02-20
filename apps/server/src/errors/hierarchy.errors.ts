/**
 * Course hierarchy error classes.
 * [STORY-F-11] Programs, Sections, Sessions.
 */

import { JourneyOSError } from "./base.errors";

export class HierarchyNotFoundError extends JourneyOSError {
  constructor(message: string) {
    super(message, "HIERARCHY_NOT_FOUND");
  }
}

export class HierarchyValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "HIERARCHY_VALIDATION_ERROR");
  }
}

export class DuplicateProgramCodeError extends JourneyOSError {
  constructor(code: string) {
    super(
      `Program code "${code}" already exists in this institution`,
      "DUPLICATE_PROGRAM_CODE",
    );
  }
}
