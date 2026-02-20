/**
 * FacultyCourseController — REST handler for faculty dashboard course cards.
 * [STORY-F-12] GET /api/v1/dashboard/faculty/courses
 */

import { Request, Response } from "express";
import type { ApiResponse, FacultyCourseListResponse } from "@journey-os/types";
import type { FacultyCourseService } from "../../services/dashboard/faculty-course.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FacultyCourseController {
  readonly #service: FacultyCourseService;

  constructor(service: FacultyCourseService) {
    this.#service = service;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | {
            sub?: string;
            role?: string;
            is_course_director?: boolean;
            institution_id?: string;
          }
        | undefined;

      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        };
        res.status(401).json(body);
        return;
      }

      // Extract and validate faculty_id from query
      const rawFacultyId = req.query.faculty_id;
      if (!rawFacultyId || typeof rawFacultyId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "faculty_id query parameter is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      if (!UUID_REGEX.test(rawFacultyId)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid faculty_id format. Must be a valid UUID.",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Authorization: faculty can only request own courses unless admin
      const isAdmin =
        user.role === "superadmin" || user.role === "institutional_admin";
      if (rawFacultyId !== user.sub && !isAdmin) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You can only view your own courses",
          },
        };
        res.status(403).json(body);
        return;
      }

      const isCourseDirector = user.is_course_director ?? false;

      const data = await this.#service.listForFaculty(
        rawFacultyId,
        isCourseDirector,
      );

      const body: ApiResponse<FacultyCourseListResponse> = {
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
