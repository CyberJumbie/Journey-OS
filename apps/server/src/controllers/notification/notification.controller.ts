/**
 * Notification Controller — REST endpoint handlers.
 * [STORY-F-2] Maps HTTP requests to NotificationService calls with error handling.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  Notification,
  NotificationListResponse,
  NotificationListQuery,
  NotificationType,
  UnreadCountResponse,
  MarkAllReadResponse,
} from "@journey-os/types";
import type { NotificationService } from "../../services/notification/notification.service";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
  InvalidNotificationTypeError,
} from "../../errors";

export class NotificationController {
  readonly #notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.#notificationService = notificationService;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const query: NotificationListQuery = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        unread_only: req.query.unread_only === "true",
        type: req.query.type as NotificationType | undefined,
      };

      const result = await this.#notificationService.findByUserId(
        user.id,
        query,
      );

      const body: ApiResponse<NotificationListResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const count = await this.#notificationService.getUnreadCount(user.id);

      const body: ApiResponse<UnreadCountResponse> = {
        data: { count },
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleMarkAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid notification ID",
          },
        };
        res.status(400).json(body);
        return;
      }

      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const notification = await this.#notificationService.markAsRead(
        id,
        user.id,
      );

      const body: ApiResponse<Notification> = {
        data: notification,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleMarkAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const updatedCount = await this.#notificationService.markAllAsRead(
        user.id,
      );

      const body: ApiResponse<MarkAllReadResponse> = {
        data: { updated_count: updatedCount },
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof NotificationNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof NotificationForbiddenError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(403).json(body);
      return;
    }

    if (error instanceof InvalidNotificationTypeError) {
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
