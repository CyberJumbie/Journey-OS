/**
 * Hierarchy Controller — REST endpoint handlers.
 * [STORY-F-11] Programs, Sections, Sessions CRUD.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  Program,
  Section,
  Session,
  CourseHierarchy,
} from "@journey-os/types";
import type { HierarchyService } from "../../services/course/hierarchy.service";
import {
  HierarchyNotFoundError,
  HierarchyValidationError,
  DuplicateProgramCodeError,
} from "../../errors";

export class HierarchyController {
  readonly #hierarchyService: HierarchyService;

  constructor(hierarchyService: HierarchyService) {
    this.#hierarchyService = hierarchyService;
  }

  async handleCreateProgram(req: Request, res: Response): Promise<void> {
    try {
      const { institution_id, name, code } = req.body;

      if (!institution_id || !name || !code) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Missing required fields: institution_id, name, code",
          },
        };
        res.status(400).json(body);
        return;
      }

      const program = await this.#hierarchyService.createProgram(req.body);

      const body: ApiResponse<Program> = { data: program, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleCreateSection(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      if (typeof courseId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Invalid courseId",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { title } = req.body;
      if (!title) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Missing required field: title",
          },
        };
        res.status(400).json(body);
        return;
      }

      const section = await this.#hierarchyService.createSection(
        courseId,
        req.body,
      );

      const body: ApiResponse<Section> = { data: section, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleCreateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      if (typeof sectionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Invalid sectionId",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { title, week_number, day_of_week, start_time, end_time } =
        req.body;
      if (
        !title ||
        !day_of_week ||
        !start_time ||
        !end_time ||
        week_number === undefined
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message:
              "Missing required fields: title, week_number, day_of_week, start_time, end_time",
          },
        };
        res.status(400).json(body);
        return;
      }

      const session = await this.#hierarchyService.createSession(
        sectionId,
        req.body,
      );

      const body: ApiResponse<Session> = { data: session, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleGetCourseHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      if (typeof courseId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Invalid courseId",
          },
        };
        res.status(400).json(body);
        return;
      }

      const hierarchy =
        await this.#hierarchyService.getCourseHierarchy(courseId);

      const body: ApiResponse<CourseHierarchy> = {
        data: hierarchy,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleReorderSections(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      if (typeof courseId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Invalid courseId",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { section_ids } = req.body;
      if (!Array.isArray(section_ids) || section_ids.length === 0) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "HIERARCHY_VALIDATION_ERROR",
            message: "Missing required field: section_ids (non-empty array)",
          },
        };
        res.status(400).json(body);
        return;
      }

      const reordered = await this.#hierarchyService.reorderSections(
        courseId,
        section_ids,
      );

      const body: ApiResponse<{ reordered: number }> = {
        data: { reordered },
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof HierarchyNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof DuplicateProgramCodeError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(409).json(body);
      return;
    }

    if (error instanceof HierarchyValidationError) {
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
