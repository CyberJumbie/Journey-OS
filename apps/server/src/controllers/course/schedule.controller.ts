/**
 * ScheduleController — handles GET /api/v1/courses/:id/schedule
 * [STORY-IA-7] Weekly schedule view for course sessions.
 */

import { Request, Response } from "express";
import type { ApiResponse, WeeklySchedule } from "@journey-os/types";
import { ScheduleService } from "../../services/course/schedule.service";
import { CourseNotFoundError } from "../../errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ScheduleController {
  readonly #scheduleService: ScheduleService;

  constructor(scheduleService: ScheduleService) {
    this.#scheduleService = scheduleService;
  }

  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Narrow req.params.id (Express strict mode: string | string[])
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Course ID must be a valid UUID",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Parse and validate week query param
      const rawWeek = req.query.week;
      let weekNumber = 1;

      if (rawWeek !== undefined) {
        const parsed = Number(rawWeek);
        if (!Number.isInteger(parsed) || parsed < 1) {
          const body: ApiResponse<null> = {
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Week must be a positive integer",
            },
          };
          res.status(400).json(body);
          return;
        }
        weekNumber = parsed;
      }

      const schedule = await this.#scheduleService.getWeeklySchedule(
        id,
        weekNumber,
      );

      const body: ApiResponse<WeeklySchedule> = {
        data: schedule,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
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
}
