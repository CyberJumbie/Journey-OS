import { Request, Response } from "express";
import type {
  ApiResponse,
  GlobalUserListResponse,
  GlobalUserSortField,
} from "@journey-os/types";
import { isValidRole } from "@journey-os/types";
import { GlobalUserService } from "../../services/user/global-user.service";
import { ValidationError } from "../../errors/validation.error";

export class GlobalUserController {
  readonly #globalUserService: GlobalUserService;

  constructor(globalUserService: GlobalUserService) {
    this.#globalUserService = globalUserService;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        sort_by,
        sort_dir,
        search,
        role,
        institution_id,
        is_active,
      } = req.query;

      // Validate role if provided
      if (role && typeof role === "string" && !isValidRole(role)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid role filter: "${role}"`,
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#globalUserService.list({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sort_by:
          typeof sort_by === "string"
            ? (sort_by as GlobalUserSortField)
            : undefined,
        sort_dir:
          sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
        search: typeof search === "string" ? search : undefined,
        role: typeof role === "string" && isValidRole(role) ? role : undefined,
        institution_id:
          typeof institution_id === "string" ? institution_id : undefined,
        is_active:
          is_active === "true"
            ? true
            : is_active === "false"
              ? false
              : undefined,
      });

      const body: ApiResponse<GlobalUserListResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
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
}
