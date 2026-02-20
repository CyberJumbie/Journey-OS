import { JourneyOSError } from "./base.errors";

export class KaizenError extends JourneyOSError {
  constructor(message: string) {
    super(message, "KAIZEN_ERROR");
  }
}

export class LintRuleNotFoundError extends JourneyOSError {
  constructor(ruleId: string) {
    super(`Lint rule not found: ${ruleId}`, "LINT_RULE_NOT_FOUND");
  }
}

export class LintReportNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`Lint report not found: ${id}`, "LINT_REPORT_NOT_FOUND");
  }
}

export class LintEngineError extends JourneyOSError {
  constructor(message: string) {
    super(message, "LINT_ENGINE_ERROR");
  }
}
