import type { Request, Response } from "express";
import { z } from "zod";
import type { FieldMapping, MappingPresetCreateInput } from "@journey-os/types";
import { IMPORT_TARGET_FIELDS } from "@journey-os/types";
import { ImportUploadService } from "../../services/import/import-upload.service";
import { MappingPresetService } from "../../services/import/mapping-preset.service";
import { JourneyOSError } from "../../errors/base.errors";
import {
  UploadNotFoundError,
  MappingIncompleteError,
} from "../../errors/import-mapping.errors";

const FieldMappingSchema = z.object({
  source_column: z.string().min(1).max(255),
  target_field: z.enum(
    IMPORT_TARGET_FIELDS as unknown as [string, ...string[]],
  ),
  confidence: z.number().min(0).max(1).nullable(),
});

const PreviewRequestSchema = z.object({
  upload_id: z.string().uuid(),
  preview_rows: z.coerce.number().int().min(1).max(20).default(5),
});

const ConfirmRequestSchema = z.object({
  upload_id: z.string().uuid(),
  mappings: z.array(FieldMappingSchema).min(1),
});

const ExecuteRequestSchema = z.object({
  upload_id: z.string().uuid(),
  mappings: z.array(FieldMappingSchema).min(1),
  course_id: z.string().uuid(),
});

const PresetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  mappings: z.array(FieldMappingSchema).min(1),
  source_format: z.enum(["csv", "qti", "text"]),
});

export class ImportUploadController {
  readonly #uploadService: ImportUploadService;
  readonly #presetService: MappingPresetService;

  constructor(
    uploadService: ImportUploadService,
    presetService: MappingPresetService,
  ) {
    this.#uploadService = uploadService;
    this.#presetService = presetService;
  }

  async handleUpload(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const file = req.file;
      if (!file) {
        res.status(400).json({
          data: null,
          error: { code: "VALIDATION_ERROR", message: "No file attached" },
        });
        return;
      }

      const result = await this.#uploadService.upload(user.id, file);
      res.status(201).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handlePreview(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const parsed = PreviewRequestSchema.parse(req.body);
      const result = await this.#uploadService.preview(
        user.id,
        parsed.upload_id,
        parsed.preview_rows,
      );
      res.status(200).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleListPresets(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const presets = await this.#presetService.list(user.id);
      res.status(200).json({ data: presets, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleCreatePreset(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const parsed = PresetCreateSchema.parse(req.body);
      const preset = await this.#presetService.create(
        user.id,
        parsed as unknown as MappingPresetCreateInput,
      );
      res.status(201).json({ data: preset, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleDeletePreset(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const presetId = z.string().uuid().parse(req.params.id);
      await this.#presetService.delete(user.id, presetId);
      res.status(204).send();
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleConfirm(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const parsed = ConfirmRequestSchema.parse(req.body);
      const result = await this.#uploadService.confirm(
        user.id,
        parsed.upload_id,
        parsed.mappings as unknown as FieldMapping[],
      );
      res.status(200).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleExecute(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as {
        id: string;
      };
      const parsed = ExecuteRequestSchema.parse(req.body);
      // totalRows not known here; pass 0 — STORY-F-57 will look it up
      const result = await this.#uploadService.execute(
        user.id,
        parsed.upload_id,
        parsed.mappings as unknown as FieldMapping[],
        0,
      );
      res.status(202).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  #handleError(res: Response, err: unknown): void {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues.map((e) => e.message).join(", "),
        },
      });
      return;
    }

    if (err instanceof UploadNotFoundError) {
      res.status(404).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof MappingIncompleteError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof JourneyOSError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    console.error("[ImportUploadController] Unexpected error:", err);
    res.status(500).json({
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
}
