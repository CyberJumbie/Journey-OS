/**
 * Course Controller — REST endpoint handlers.
 * [STORY-F-1] Maps HTTP requests to CourseService calls with error handling.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  CourseDTO,
  CourseListResponse,
  CourseListQuery,
  CourseStatus,
  CourseType,
} from "@journey-os/types";
import type { CourseService } from "../../services/course/course.service";
import {
  CourseNotFoundError,
  DuplicateCourseCodeError,
  InvalidCourseTypeError,
  InvalidCourseStatusError,
} from "../../errors";

export class CourseController {
  readonly #courseService: CourseService;

  constructor(courseService: CourseService) {
    this.#courseService = courseService;
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    try {
      const { code, name } = req.body;

      if (!code || !name) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields: code, name",
          },
        };
        res.status(400).json(body);
        return;
      }

      const course = await this.#courseService.create(req.body);

      const body: ApiResponse<CourseDTO> = { data: course, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleGetById(req: Request, res: Response): Promise<void> {
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

      const course = await this.#courseService.findById(id);

      const body: ApiResponse<CourseDTO> = { data: course, error: null };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleGetByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (typeof code !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid course code" },
        };
        res.status(400).json(body);
        return;
      }

      const course = await this.#courseService.findByCode(code);

      const body: ApiResponse<CourseDTO> = { data: course, error: null };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const query: CourseListQuery = {
        status: req.query.status as CourseStatus | undefined,
        course_type: req.query.course_type as CourseType | undefined,
        department: req.query.department as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await this.#courseService.list(query);

      const body: ApiResponse<CourseListResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
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

      const course = await this.#courseService.update(id, req.body);

      const body: ApiResponse<CourseDTO> = { data: course, error: null };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleArchive(req: Request, res: Response): Promise<void> {
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

      await this.#courseService.archive(id);

      const body: ApiResponse<null> = { data: null, error: null };
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

    if (error instanceof DuplicateCourseCodeError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(409).json(body);
      return;
    }

    if (
      error instanceof InvalidCourseTypeError ||
      error instanceof InvalidCourseStatusError
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
