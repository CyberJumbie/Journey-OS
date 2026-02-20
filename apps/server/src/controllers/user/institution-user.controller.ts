/**
 * Controller for institution-scoped user list and invitations.
 * [STORY-IA-1] Parses request params, delegates to InstitutionUserService.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  InstitutionUserListResponse,
  InstitutionUserSortField,
  InviteUserResponse,
} from "@journey-os/types";
import { AuthRole, isValidRole } from "@journey-os/types";
import { InstitutionUserService } from "../../services/user/institution-user.service";
import { ValidationError } from "../../errors/validation.error";
import { DuplicateInvitationError } from "../../errors/invitation.error";

const INVITABLE_ROLES = new Set<string>([
  AuthRole.FACULTY,
  AuthRole.STUDENT,
  AuthRole.ADVISOR,
]);

export class InstitutionUserController {
  readonly #service: InstitutionUserService;

  constructor(service: InstitutionUserService) {
    this.#service = service;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | {
            institution_id?: string;
            id?: string;
          }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User is not associated with an institution",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { page, limit, sort_by, sort_dir, search, role, status } =
        req.query;

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

      const result = await this.#service.list(institutionId, {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sort_by:
          typeof sort_by === "string"
            ? (sort_by as InstitutionUserSortField)
            : undefined,
        sort_dir:
          sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
        search: typeof search === "string" ? search : undefined,
        role: typeof role === "string" && isValidRole(role) ? role : undefined,
        status:
          status === "active" || status === "inactive" || status === "pending"
            ? status
            : undefined,
      });

      const body: ApiResponse<InstitutionUserListResponse> = {
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

  async handleInvite(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | {
            id?: string;
            institution_id?: string;
            full_name?: string;
            institution_name?: string;
          }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User is not associated with an institution",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { email, role, is_course_director } = req.body as {
        email?: string;
        role?: string;
        is_course_director?: boolean;
      };

      // Validate email
      if (!email || typeof email !== "string" || !email.includes("@")) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Validate role
      if (!role || !INVITABLE_ROLES.has(role)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: `Role must be one of: ${[...INVITABLE_ROLES].join(", ")}`,
          },
        };
        res.status(400).json(body);
        return;
      }

      // Validate CD flag
      if (is_course_director && role !== AuthRole.FACULTY) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Course director flag is only valid for faculty role",
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#service.invite(
        institutionId,
        {
          id: user?.id ?? "",
          full_name: user?.full_name ?? "Unknown",
          institution_name: user?.institution_name ?? "Unknown",
        },
        {
          email,
          role: role as AuthRole.FACULTY | AuthRole.STUDENT | AuthRole.ADVISOR,
          is_course_director,
        },
      );

      const body: ApiResponse<InviteUserResponse> = {
        data: result,
        error: null,
      };
      res.status(201).json(body);
    } catch (error: unknown) {
      if (error instanceof DuplicateInvitationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(409).json(body);
        return;
      }

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
