/**
 * Course Wizard Controller — multi-step course creation endpoint.
 * [STORY-F-20] Orchestrates course + sections + sessions + CD assignment.
 *
 * Separate from CourseController to maintain single responsibility:
 * - Different payload shape (nested wizard input vs flat CreateCourseRequest)
 * - Different RBAC (any faculty vs course director only)
 * - Orchestrates hierarchy creation (sections/sessions)
 */

import type { Request, Response } from "express";
import type {
  ApiResponse,
  CourseCreateInput,
  CourseCreateResponse,
  CourseCodeCheckResponse,
} from "@journey-os/types";
import type { CourseService } from "../../services/course/course.service";
import type { HierarchyService } from "../../services/course/hierarchy.service";
import type { ProfileRepository } from "../../repositories/profile.repository";
import {
  DuplicateCourseCodeError,
  DirectorNotFoundError,
  CourseValidationError,
  ProfileNotFoundError,
} from "../../errors";

export class CourseWizardController {
  readonly #courseService: CourseService;
  readonly #hierarchyService: HierarchyService;
  readonly #profileRepo: ProfileRepository;

  constructor(
    courseService: CourseService,
    hierarchyService: HierarchyService,
    profileRepo: ProfileRepository,
  ) {
    this.#courseService = courseService;
    this.#hierarchyService = hierarchyService;
    this.#profileRepo = profileRepo;
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body as CourseCreateInput;
      const userId = req.user!.sub;

      // 1. Validate Course Director exists (if provided)
      if (input.director.course_director_id) {
        try {
          await this.#profileRepo.findByUserId(
            input.director.course_director_id,
          );
        } catch (error: unknown) {
          if (error instanceof ProfileNotFoundError) {
            throw new DirectorNotFoundError(input.director.course_director_id);
          }
          throw error;
        }
      }

      // 2. Create course record (service handles code uniqueness + Neo4j)
      const course = await this.#courseService.create({
        code: input.basic_info.code,
        name: input.basic_info.name,
        description: input.basic_info.description || undefined,
        academic_year: input.basic_info.academic_year,
        semester: input.basic_info.semester,
        program_id: input.basic_info.program_id,
        credit_hours: input.configuration.credit_hours,
        max_enrollment: input.configuration.max_enrollment,
        is_required: input.configuration.is_required,
        prerequisites: input.configuration.prerequisites,
        learning_objectives: input.configuration.learning_objectives,
        tags: input.configuration.tags,
        course_director_id: input.director.course_director_id ?? undefined,
        status: "draft",
      });

      // 3. Create sections and sessions
      let sessionCount = 0;
      for (const section of input.structure.sections) {
        const createdSection = await this.#hierarchyService.createSection(
          course.id,
          { title: section.title, position: section.position },
        );

        for (const session of section.sessions) {
          await this.#hierarchyService.createSession(createdSection.id, {
            title: session.title,
            week_number: session.week_number,
            day_of_week: session.day_of_week,
            start_time: session.start_time,
            end_time: session.end_time,
          });
          sessionCount++;
        }
      }

      // 4. Return response
      const responseData: CourseCreateResponse = {
        id: course.id,
        name: course.name,
        code: course.code,
        status: "draft",
        section_count: input.structure.sections.length,
        session_count: sessionCount,
        course_director_id: input.director.course_director_id ?? null,
        created_at: course.created_at,
      };

      const body: ApiResponse<CourseCreateResponse> = {
        data: responseData,
        error: null,
      };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleCheckCode(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code;
      if (typeof code !== "string" || code.length < 3) {
        throw new CourseValidationError(
          "Query parameter 'code' is required and must be at least 3 characters",
        );
      }

      let available = true;
      try {
        await this.#courseService.findByCode(code);
        available = false;
      } catch {
        // Code not found means it's available
        available = true;
      }

      const responseData: CourseCodeCheckResponse = { available, code };
      const body: ApiResponse<CourseCodeCheckResponse> = {
        data: responseData,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof CourseValidationError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(400).json(body);
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

    if (error instanceof DirectorNotFoundError) {
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
