import { Request, Response } from "express";
import type {
  ApiResponse,
  InstitutionStatusChangeResult,
} from "@journey-os/types";
import { InstitutionLifecycleService } from "../../services/admin/institution-lifecycle.service";
import {
  InstitutionAlreadySuspendedError,
  InstitutionNotSuspendedError,
  SuspendReasonRequiredError,
} from "../../errors/institution-lifecycle.error";
import { InstitutionNotFoundError } from "../../errors/registration.error";

export class InstitutionLifecycleController {
  readonly #service: InstitutionLifecycleService;

  constructor(service: InstitutionLifecycleService) {
    this.#service = service;
  }

  async handleSuspend(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid institution ID",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { reason } = req.body as { reason?: string };
      if (!reason || typeof reason !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Reason is required when suspending an institution",
          },
        };
        res.status(400).json(body);
        return;
      }

      const user = (req as unknown as Record<string, unknown>).user as {
        sub: string;
      };

      const result = await this.#service.suspend(id, reason, user.sub);

      const body: ApiResponse<InstitutionStatusChangeResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleReactivate(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid institution ID",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { reason } = (req.body ?? {}) as { reason?: string };

      const user = (req as unknown as Record<string, unknown>).user as {
        sub: string;
      };

      const result = await this.#service.reactivate(
        id,
        reason ?? null,
        user.sub,
      );

      const body: ApiResponse<InstitutionStatusChangeResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof InstitutionNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (
      error instanceof InstitutionAlreadySuspendedError ||
      error instanceof InstitutionNotSuspendedError ||
      error instanceof SuspendReasonRequiredError
    ) {
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
