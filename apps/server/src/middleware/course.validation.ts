/**
 * Course creation validation middleware using Zod.
 * [STORY-F-20] Validates the CourseCreateInput payload from the wizard.
 */

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { CourseValidationError } from "../errors";

const SessionSchema = z
  .object({
    title: z.string().min(1, "Session title is required").max(200),
    week_number: z.number().int().min(1).max(52),
    day_of_week: z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
    session_type: z.enum(["lecture", "lab", "clinical", "discussion", "exam"]),
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "end_time must be after start_time",
  });

const SectionSchema = z.object({
  title: z.string().min(1, "Section title is required").max(200),
  position: z.number().int().min(1),
  sessions: z.array(SessionSchema),
});

export const CourseCreateSchema = z.object({
  basic_info: z.object({
    name: z
      .string()
      .min(3, "Course name must be at least 3 characters")
      .max(200),
    code: z
      .string()
      .min(3, "Course code must be at least 3 characters")
      .max(50)
      .regex(
        /^[A-Z0-9-]+$/,
        "Course code must be uppercase alphanumeric with hyphens",
      ),
    description: z.string().max(2000).optional().default(""),
    academic_year: z.string().min(4).max(10),
    semester: z.enum(["fall", "spring", "summer", "year_long"]),
    program_id: z.string().uuid().nullable(),
  }),
  configuration: z.object({
    credit_hours: z.number().int().min(1).max(20),
    max_enrollment: z.number().int().min(1).max(1000),
    is_required: z.boolean(),
    prerequisites: z.array(z.string()).default([]),
    learning_objectives: z
      .array(z.string().min(1))
      .min(1, "At least one learning objective is required"),
    tags: z.array(z.string()).default([]),
  }),
  structure: z.object({
    sections: z.array(SectionSchema).min(1, "At least one section is required"),
  }),
  director: z.object({
    course_director_id: z.string().uuid().nullable(),
  }),
});

export function validateCourseCreate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = CourseCreateSchema.safeParse(req.body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const message = firstError
      ? `${firstError.path.join(".")}: ${firstError.message}`
      : "Invalid course creation input";
    throw new CourseValidationError(message);
  }

  req.body = result.data;
  next();
}
