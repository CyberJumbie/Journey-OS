---
name: zod-controller-error-routing-pattern
tags: [zod, controller, validation, error-handling, express]
story: STORY-F-15
date: 2026-02-20
---

# Zod Controller with Typed Error Routing

## Problem

Express controllers need input validation and error handling. Without a pattern,
each handler reimplements parsing, type casting, and error-to-HTTP-status mapping.

## Solution

Define Zod schemas at the top of the controller. Parse `req.body` in each handler.
Route errors through a single `#handleError()` method that maps custom error classes
to HTTP status codes.

```typescript
import { z } from "zod";
import type { Request, Response } from "express";
import { JourneyOSError } from "../../errors/base.errors";
import { SpecificNotFoundError } from "../../errors/domain.errors";

// 1. Define schemas at module level
const CreateRequestSchema = z.object({
  name: z.string().min(1).max(200),
  resource_id: z.string().uuid(),
  items: z.array(z.object({
    field: z.string().min(1).max(255),
    value: z.enum(["a", "b", "c"] as unknown as [string, ...string[]]),
  })).min(1),
});

export class DomainController {
  readonly #service: DomainService;

  constructor(service: DomainService) {
    this.#service = service;
  }

  // 2. Every handler extracts userId and parses with Zod
  async handleCreate(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const parsed = CreateRequestSchema.parse(req.body);
      const result = await this.#service.create(
        user.id,
        parsed as unknown as DomainInput, // cast Zod output to domain type
      );
      res.status(201).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  // 3. Single error router maps error classes to HTTP responses
  #handleError(res: Response, err: unknown): void {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues.map((e) => e.message).join(", "),
        },
      });
      return;
    }

    if (err instanceof SpecificNotFoundError) {
      res.status(404).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof JourneyOSError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    console.error("[DomainController] Unexpected error:", err);
    res.status(500).json({
      data: null,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  }
}
```

## Key Rules

- **Always extract `user.id`** in every handler that does a user-scoped operation.
- **Cast Zod output** to domain types with `as unknown as DomainType` when Zod
  infers `string` instead of literal union for `.enum()` fields.
- **Use `.uuid()` on all ID fields** — Zod validates RFC 4122 version+variant bits.
- **Add `.max(255)` on user-supplied strings** to prevent unbounded input.
- **Order error checks** from most specific to least specific in `#handleError()`.
- **Use `.issues`** (not `.errors`) on `ZodError`.

## When to Use

- Any new Express controller with request body validation.
- Controllers that need to distinguish multiple error types (not-found vs validation vs domain).

## When NOT to Use

- Simple GET endpoints with only path params (use inline `typeof === "string"` check).
- Middleware-level validation (use dedicated validation middleware instead).
