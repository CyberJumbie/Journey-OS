import type { Request, Response } from "express";
import type { ApiResponse, FrameworkListResponse } from "@journey-os/types";
import type { FrameworkService } from "../../services/framework/framework.service";

export class FrameworkController {
  readonly #frameworkService: FrameworkService;

  constructor(frameworkService: FrameworkService) {
    this.#frameworkService = frameworkService;
  }

  async listFrameworks(_req: Request, res: Response): Promise<void> {
    try {
      const data = await this.#frameworkService.getFrameworkList();

      const body: ApiResponse<FrameworkListResponse> = {
        data,
        error: null,
      };
      res.status(200).json(body);
    } catch {
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
}
