import { JourneyOSError } from "./base.errors";

export class RateLimitError extends JourneyOSError {
  readonly #retryAfterMs: number;

  constructor(message: string = "Too many requests", retryAfterMs: number = 0) {
    super(message, "RATE_LIMITED");
    this.#retryAfterMs = retryAfterMs;
  }

  get retryAfterMs(): number {
    return this.#retryAfterMs;
  }
}
