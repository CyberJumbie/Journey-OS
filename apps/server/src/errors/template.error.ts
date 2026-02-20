/**
 * Template error classes.
 * [STORY-F-4] Custom errors for template operations.
 */

import { JourneyOSError } from "./base.errors";

export class TemplateNotFoundError extends JourneyOSError {
  constructor(templateId: string) {
    super(`Template not found: ${templateId}`, "TEMPLATE_NOT_FOUND");
  }
}

export class TemplatePermissionError extends JourneyOSError {
  constructor(action: string, templateId: string) {
    super(
      `Permission denied: cannot ${action} template '${templateId}'`,
      "TEMPLATE_PERMISSION_ERROR",
    );
  }
}

export class TemplateVersionNotFoundError extends JourneyOSError {
  constructor(templateId: string, versionNumber: number) {
    super(
      `Version ${versionNumber} of template '${templateId}' not found`,
      "TEMPLATE_VERSION_NOT_FOUND",
    );
  }
}
