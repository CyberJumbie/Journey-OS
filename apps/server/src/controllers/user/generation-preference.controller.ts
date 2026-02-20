/**
 * GenerationPreferenceController — REST endpoint handlers for generation preferences.
 * [STORY-F-17] Maps HTTP requests to GenerationPreferenceService calls.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  GenerationPreferencesResponse,
} from "@journey-os/types";
import type { GenerationPreferenceService } from "../../services/user/generation-preference.service";
import { PreferenceValidationError } from "../../errors";

export class GenerationPreferenceController {
  readonly #service: GenerationPreferenceService;

  constructor(service: GenerationPreferenceService) {
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

      const result = await this.#service.getForUser(user.id);
      const body: ApiResponse<GenerationPreferencesResponse> = {
        data: result,
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

      const result = await this.#service.updateForUser(user.id, req.body);
      const body: ApiResponse<GenerationPreferencesResponse> = {
        data: result,
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
