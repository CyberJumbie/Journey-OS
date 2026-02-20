/**
 * NotificationPreferenceController — REST endpoint handlers for notification preferences.
 * [STORY-F-16] Maps HTTP requests to NotificationPreferenceService calls.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  NotificationPreferencesResponse,
} from "@journey-os/types";
import type { NotificationPreferenceService } from "../../services/user/notification-preference.service";
import { PreferenceValidationError } from "../../errors";

export class NotificationPreferenceController {
  readonly #service: NotificationPreferenceService;

  constructor(service: NotificationPreferenceService) {
    this.#service = service;
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const preferences = await this.#service.getForUser(user.id);
      const body: ApiResponse<NotificationPreferencesResponse> = {
        data: { preferences },
        error: null,
      };
      res.status(200).json(body);
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const preferences = await this.#service.updateForUser(user.id, req.body);
      const body: ApiResponse<NotificationPreferencesResponse> = {
        data: { preferences },
        error: null,
      };
      res.status(200).json(body);
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleReset(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;
      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "User not authenticated",
          },
        };
        res.status(401).json(body);
        return;
      }

      const preferences = await this.#service.resetForUser(user.id);
      const body: ApiResponse<NotificationPreferencesResponse> = {
        data: { preferences },
        error: null,
      };
      res.status(200).json(body);
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  #handleError(res: Response, err: unknown): void {
    if (err instanceof PreferenceValidationError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: err.code, message: err.message },
      };
      res.status(400).json(body);
      return;
    }

    const body: ApiResponse<null> = {
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
    };
    res.status(500).json(body);
  }
}
