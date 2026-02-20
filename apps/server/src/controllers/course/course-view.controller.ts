/**
 * Course View Controller — enriched read-only endpoints for faculty.
 * [STORY-F-13] List + detail views with joined data.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  CourseListViewResponse,
  CourseDetailView,
  CourseStatus,
  CourseType,
} from "@journey-os/types";
import type { CourseViewService } from "../../services/course/course-view.service";
import { CourseNotFoundError } from "../../errors";

export class CourseViewController {
  readonly #service: CourseViewService;

  constructor(service: CourseViewService) {
    this.#service = service;
  }

  async handleListView(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.#service.listView({
        status: req.query.status as CourseStatus | undefined,
        course_type: req.query.course_type as CourseType | undefined,
        department: req.query.department as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      const body: ApiResponse<CourseListViewResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleGetDetailView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid course ID" },
        };
        res.status(400).json(body);
        return;
      }

      const detail = await this.#service.getDetailView(id);

      const body: ApiResponse<CourseDetailView> = {
        data: detail,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof CourseNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
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
