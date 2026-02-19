import { DomainError } from "./base.errors";

/**
 * General error during seed operations.
 * [CODE_STANDARDS SS 3.4] — Custom error classes only.
 */
export class SeedError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "SeedError";
  }
}

/**
 * Error when seed verification fails (expected vs actual node counts).
 * Uses JS #private fields per CODE_STANDARDS SS 3.1.
 */
export class SeedVerificationError extends DomainError {
  readonly #label: string;
  readonly #expected: number;
  readonly #actual: number;

  constructor(label: string, expected: number, actual: number) {
    super(
      `Verification failed for ${label}: expected ${expected}, got ${actual}`,
    );
    this.name = "SeedVerificationError";
    this.#label = label;
    this.#expected = expected;
    this.#actual = actual;
  }

  get label(): string {
    return this.#label;
  }

  get expected(): number {
    return this.#expected;
  }

  get actual(): number {
    return this.#actual;
  }
}
