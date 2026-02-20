import { Request, Response, NextFunction } from "express";
import type { ApiResponse, RateLimitConfig } from "@journey-os/types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiterMiddleware {
  readonly #store: Map<string, RateLimitEntry>;
  readonly #config: RateLimitConfig;
  readonly #keyExtractor: (req: Request) => string;

  constructor(config: RateLimitConfig, keyExtractor: (req: Request) => string) {
    this.#store = new Map();
    this.#config = config;
    this.#keyExtractor = keyExtractor;
  }

  handle(req: Request, res: Response, next: NextFunction): void {
    const key = this.#keyExtractor(req);
    const now = Date.now();
    const entry = this.#store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= this.#config.maxRequests) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(retryAfterSec));
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        };
        res.status(429).json(body);
        return;
      }
      entry.count++;
    } else {
      this.#store.set(key, {
        count: 1,
        resetAt: now + this.#config.windowMs,
      });
    }

    next();
  }
}

/**
 * Factory: creates a rate limiter for forgot-password keyed by email in request body.
 * 3 requests per email per hour.
 */
export function createForgotPasswordRateLimiter(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => void {
  const limiter = new RateLimiterMiddleware(
    { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    (req: Request) => (req.body?.email ?? req.ip ?? "unknown").toLowerCase(),
  );
  return (req, res, next) => limiter.handle(req, res, next);
}

/**
 * Factory: creates a rate limiter for registration keyed by IP address.
 * 5 requests per IP per 15 minutes.
 */
export function createRegistrationRateLimiter(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => void {
  const limiter = new RateLimiterMiddleware(
    { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    (req: Request) => req.ip ?? "unknown",
  );
  return (req, res, next) => limiter.handle(req, res, next);
}

/**
 * Factory: creates a rate limiter for waitlist applications keyed by IP address.
 * 3 requests per IP per hour.
 */
export function createApplicationRateLimiter(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => void {
  const limiter = new RateLimiterMiddleware(
    { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    (req: Request) => req.ip ?? "unknown",
  );
  return (req, res, next) => limiter.handle(req, res, next);
}
