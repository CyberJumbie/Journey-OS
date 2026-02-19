/**
 * Base error class for all Journey OS errors.
 * [CODE_STANDARDS SS 3.4] — Custom error classes only. No raw throw new Error().
 */
export class JourneyOSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DomainError extends JourneyOSError {
  constructor(message: string) {
    super(message, "DOMAIN_ERROR");
  }
}
