/**
 * Profile Controller — REST endpoint handlers.
 * [STORY-F-5] Maps HTTP requests to ProfileService calls.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  ProfileResponse,
  AvatarUploadResponse,
} from "@journey-os/types";
import type { ProfileService } from "../../services/profile/profile.service";
import {
  ProfileNotFoundError,
  ProfileValidationError,
  InvalidAvatarError,
} from "../../errors";

export class ProfileController {
  readonly #profileService: ProfileService;

  constructor(profileService: ProfileService) {
    this.#profileService = profileService;
  }

  async handleGetProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;

      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "No authenticated user" },
        };
        res.status(401).json(body);
        return;
      }

      const profile = await this.#profileService.getProfile(user.id);

      const body: ApiResponse<ProfileResponse> = {
        data: profile,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleUpdateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;

      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "No authenticated user" },
        };
        res.status(401).json(body);
        return;
      }

      const profile = await this.#profileService.updateProfile(
        user.id,
        req.body,
      );

      const body: ApiResponse<ProfileResponse> = {
        data: profile,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleUploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;

      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "No authenticated user" },
        };
        res.status(401).json(body);
        return;
      }

      const file = (req as unknown as Record<string, unknown>).file as
        | {
            buffer: Uint8Array;
            mimetype: string;
            size: number;
            originalname: string;
          }
        | undefined;

      if (!file) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "No file attached. Send a file in the 'avatar' field.",
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#profileService.uploadAvatar(user.id, file);

      const body: ApiResponse<AvatarUploadResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleRemoveAvatar(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { id: string }
        | undefined;

      if (!user?.id) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "No authenticated user" },
        };
        res.status(401).json(body);
        return;
      }

      const result = await this.#profileService.removeAvatar(user.id);

      const body: ApiResponse<AvatarUploadResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof ProfileNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof ProfileValidationError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(400).json(body);
      return;
    }

    if (error instanceof InvalidAvatarError) {
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
