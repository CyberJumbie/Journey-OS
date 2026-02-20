/**
 * Activity Feed Controller — REST endpoint handlers.
 * [STORY-F-6] Maps HTTP requests to ActivityFeedService calls with error handling.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  ActivityFeedResponse,
  ActivityEventType,
} from "@journey-os/types";
import type { ActivityFeedService } from "../services/activity/activity-feed.service";
import {
  ActivityEventNotFoundError,
  ActivityFeedForbiddenError,
  ActivityFeedValidationError,
} from "../errors/activity.error";

const VALID_EVENT_TYPES: readonly ActivityEventType[] = [
  "question_generated",
  "question_reviewed",
  "question_approved",
  "question_rejected",
  "coverage_gap_detected",
  "bulk_generation_complete",
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LIMIT = 50;

export class ActivityFeedController {
  readonly #service: ActivityFeedService;

  constructor(service: ActivityFeedService) {
    this.#service = service;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      // Extract authenticated user
      const user = (req as unknown as Record<string, unknown>).user as
        | { sub: string; role: string }
        | undefined;
      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        };
        res.status(401).json(body);
        return;
      }

      // Extract and validate user_id
      const userId = req.query.user_id;
      if (!userId || typeof userId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "user_id query parameter is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      if (!UUID_REGEX.test(userId)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "user_id must be a valid UUID",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Authorization: users can only access own events unless superadmin
      if (user.sub !== userId && user.role !== "superadmin") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Cannot access another user's activity feed",
          },
        };
        res.status(403).json(body);
        return;
      }

      // Parse optional event_types filter
      let eventTypes: ActivityEventType[] | undefined;
      const eventTypesParam = req.query.event_types;
      if (eventTypesParam && typeof eventTypesParam === "string") {
        const parsed = eventTypesParam.split(",").map((t) => t.trim());
        for (const t of parsed) {
          if (!VALID_EVENT_TYPES.includes(t as ActivityEventType)) {
            const body: ApiResponse<null> = {
              data: null,
              error: {
                code: "VALIDATION_ERROR",
                message: `Invalid event_type: ${t}`,
              },
            };
            res.status(400).json(body);
            return;
          }
        }
        eventTypes = parsed as ActivityEventType[];
      }

      // Parse limit and offset
      const limit = req.query.limit
        ? Math.min(Number(req.query.limit), MAX_LIMIT)
        : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const result = await this.#service.list({
        user_id: userId,
        limit,
        offset,
        event_types: eventTypes,
      });

      const body: ApiResponse<ActivityFeedResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof ActivityEventNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof ActivityFeedForbiddenError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(403).json(body);
      return;
    }

    if (error instanceof ActivityFeedValidationError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(400).json(body);
      return;
    }

    const body: ApiResponse<null> = {
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    };
    res.status(500).json(body);
  }
}
