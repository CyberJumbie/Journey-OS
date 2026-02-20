/**
 * Template Controller — REST endpoint handlers.
 * [STORY-F-4] Maps HTTP requests to TemplateService calls with Zod validation.
 */

import { Request, Response } from "express";
import { z } from "zod";
import type {
  ApiResponse,
  TemplateDTO,
  TemplateListResponse,
  TemplateVersionDTO,
} from "@journey-os/types";
import type { TemplateService } from "../../services/template/template.service";
import {
  TemplateNotFoundError,
  TemplatePermissionError,
  TemplateVersionNotFoundError,
  ValidationError,
} from "../../errors";

const DifficultyDistributionSchema = z
  .object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
  })
  .refine((d) => Math.abs(d.easy + d.medium + d.hard - 1.0) < 0.001, {
    message: "Difficulty distribution must sum to 1.0",
  });

const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  question_type: z.enum([
    "single_best_answer",
    "extended_matching",
    "sequential_item_set",
  ]),
  difficulty_distribution: DifficultyDistributionSchema,
  bloom_levels: z.array(z.number().int().min(1).max(6)).min(1).max(6),
  scope_config: z
    .object({
      course_id: z.string().uuid().optional(),
      session_ids: z.array(z.string().uuid()).optional(),
      subconcept_ids: z.array(z.string().uuid()).optional(),
      usmle_systems: z.array(z.string()).optional(),
      usmle_disciplines: z.array(z.string()).optional(),
    })
    .optional(),
  prompt_overrides: z
    .object({
      vignette_instructions: z.string().max(1000).optional(),
      stem_instructions: z.string().max(1000).optional(),
      distractor_instructions: z.string().max(1000).optional(),
      clinical_setting: z.string().max(200).optional(),
      patient_demographics: z.string().max(500).optional(),
    })
    .optional(),
  metadata: z
    .object({
      category: z.string().max(100).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      notes: z.string().max(2000).optional(),
    })
    .optional(),
  sharing_level: z
    .enum(["private", "shared_course", "shared_institution", "public"])
    .optional(),
});

const TemplateUpdateSchema = TemplateCreateSchema.partial();

const TemplateDuplicateSchema = z.object({
  new_name: z.string().min(1).max(200).optional(),
});

interface UserContext {
  id: string;
  institution_id: string;
}

export class TemplateController {
  readonly #templateService: TemplateService;

  constructor(templateService: TemplateService) {
    this.#templateService = templateService;
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    try {
      const parsed = TemplateCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid request body",
          },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      const template = await this.#templateService.create(
        parsed.data,
        user.id,
        user.institution_id,
      );

      const body: ApiResponse<TemplateDTO> = { data: template, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const user = this.#getUser(req);
      const query = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        sharing_level: req.query.sharing_level as
          | TemplateDTO["sharing_level"]
          | undefined,
        question_type: req.query.question_type as
          | TemplateDTO["question_type"]
          | undefined,
        course_id: req.query.course_id as string | undefined,
        search: req.query.search as string | undefined,
        owner_only: req.query.owner_only === "true" ? true : undefined,
      };

      const result = await this.#templateService.list(
        query,
        user.id,
        user.institution_id,
      );

      const body: ApiResponse<TemplateListResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
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
          error: { code: "VALIDATION_ERROR", message: "Invalid template ID" },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      const template = await this.#templateService.getById(
        id,
        user.id,
        user.institution_id,
      );

      const body: ApiResponse<TemplateDTO> = { data: template, error: null };
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
          error: { code: "VALIDATION_ERROR", message: "Invalid template ID" },
        };
        res.status(400).json(body);
        return;
      }

      const parsed = TemplateUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid request body",
          },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      const template = await this.#templateService.update(
        id,
        parsed.data,
        user.id,
      );

      const body: ApiResponse<TemplateDTO> = { data: template, error: null };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid template ID" },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      await this.#templateService.delete(id, user.id);

      res.status(204).send();
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleDuplicate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid template ID" },
        };
        res.status(400).json(body);
        return;
      }

      const parsed = TemplateDuplicateSchema.safeParse(req.body);
      if (!parsed.success) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid request body",
          },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      const template = await this.#templateService.duplicate(
        id,
        parsed.data.new_name,
        user.id,
        user.institution_id,
      );

      const body: ApiResponse<TemplateDTO> = { data: template, error: null };
      res.status(201).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  async handleGetVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid template ID" },
        };
        res.status(400).json(body);
        return;
      }

      const user = this.#getUser(req);
      const versions = await this.#templateService.getVersions(
        id,
        user.id,
        user.institution_id,
      );

      const body: ApiResponse<TemplateVersionDTO[]> = {
        data: versions,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #getUser(req: Request): UserContext {
    const reqObj = req as unknown as Record<string, unknown>;
    const user = reqObj.user as UserContext | undefined;
    if (!user) {
      throw new ValidationError("User context not found");
    }
    return user;
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof TemplateNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof TemplatePermissionError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(403).json(body);
      return;
    }

    if (error instanceof TemplateVersionNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
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
