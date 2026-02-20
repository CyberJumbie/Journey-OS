export { JourneyOSError, DomainError } from "./base.errors";
export {
  AuthenticationError,
  AuthorizationError,
  MissingEnvironmentError,
} from "./auth.errors";
export { ForbiddenError, InstitutionScopeError } from "./forbidden.error";
export { InvalidFrameworkNodeError } from "./framework.errors";
export { RateLimitError } from "./rate-limit.error";
export { ValidationError } from "./validation.error";
export {
  DuplicateEmailError,
  InvalidRegistrationError,
  InstitutionNotFoundError,
} from "./registration.error";
export {
  DuplicateApplicationError,
  InvalidApplicationError,
  ApplicationNotFoundError,
} from "./application.error";
export {
  DuplicateApprovalError,
  InstitutionCreationError,
  DuplicateDomainError,
} from "./institution.error";
export {
  InvitationError,
  DuplicateInvitationError,
  InvitationExpiredError,
  InvitationLimitError,
  InvitationNotFoundError,
  InvitationAlreadyUsedError,
  InvitationInvalidError,
} from "./invitation.error";
export {
  ObjectiveError,
  DuplicateObjectiveCodeError,
  ObjectiveNotFoundError,
  InvalidBloomLevelError,
} from "./objective.error";
export {
  SameInstitutionError,
  UserReassignmentError,
  UserNotFoundError,
  ConcurrentModificationError,
} from "./reassignment.error";
export {
  ApplicationAlreadyProcessedError,
  RejectionReasonRequiredError,
} from "./rejection.error";
export {
  CourseNotFoundError,
  DuplicateCourseCodeError,
  InvalidCourseTypeError,
  InvalidCourseStatusError,
  CourseValidationError,
  DirectorNotFoundError,
} from "./course.error";
export {
  KaizenError,
  LintRuleNotFoundError,
  LintReportNotFoundError,
  LintEngineError,
} from "./kaizen.error";
export { EmailNotVerifiedError } from "./email-not-verified.error";
export {
  NotificationNotFoundError,
  NotificationForbiddenError,
  InvalidNotificationTypeError,
} from "./notification.error";
export {
  ImportError,
  ParseError,
  UnsupportedFormatError,
  FileSizeLimitError,
} from "./import.errors";
export {
  TemplateNotFoundError,
  TemplatePermissionError,
  TemplateVersionNotFoundError,
} from "./template.error";
export {
  HierarchyNotFoundError,
  HierarchyValidationError,
  DuplicateProgramCodeError,
} from "./hierarchy.errors";
export {
  ProfileNotFoundError,
  ProfileValidationError,
  InvalidAvatarError,
  ProfileSyncError,
} from "./profile.error";
export { CourseOverviewValidationError } from "./course-overview.error";
export {
  InstitutionAlreadySuspendedError,
  InstitutionNotSuspendedError,
  SuspendReasonRequiredError,
  InstitutionLifecycleOperationError,
  InstitutionSuspendedError,
} from "./institution-lifecycle.error";
export { SocketNotificationError, SocketAuthError } from "./socket.errors";
export {
  ActivityEventNotFoundError,
  ActivityFeedForbiddenError,
  ActivityFeedValidationError,
} from "./activity.error";
export {
  PreferenceNotFoundError,
  PreferenceValidationError,
} from "./preference.error";
export {
  UploadNotFoundError,
  MappingIncompleteError,
  FileTypeForbiddenError,
} from "./import-mapping.errors";
