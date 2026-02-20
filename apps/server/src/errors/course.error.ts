import { JourneyOSError } from "./base.errors";

export class CourseNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`Course not found: ${id}`, "COURSE_NOT_FOUND");
  }
}

export class DuplicateCourseCodeError extends JourneyOSError {
  constructor(code: string) {
    super(`Course code "${code}" already exists`, "DUPLICATE_COURSE_CODE");
  }
}

export class InvalidCourseTypeError extends JourneyOSError {
  constructor(courseType: string) {
    super(
      `Invalid course type: "${courseType}". Must be one of: lecture, lab, clinical, seminar, elective, integrated`,
      "INVALID_COURSE_TYPE",
    );
  }
}

export class InvalidCourseStatusError extends JourneyOSError {
  constructor(status: string) {
    super(
      `Invalid course status: "${status}". Must be one of: draft, active, archived`,
      "INVALID_COURSE_STATUS",
    );
  }
}

export class CourseValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class DirectorNotFoundError extends JourneyOSError {
  constructor(directorId: string) {
    super(
      `Course Director with ID '${directorId}' not found`,
      "DIRECTOR_NOT_FOUND",
    );
  }
}
