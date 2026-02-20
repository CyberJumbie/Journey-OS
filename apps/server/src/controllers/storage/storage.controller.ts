import type { Request, Response } from "express";
import { z } from "zod";
import type { StorageDocumentType } from "@journey-os/types";
import { StorageService } from "../../services/storage/storage.service";
import { JourneyOSError } from "../../errors/base.errors";
import {
  StorageError,
  FileTooLargeError,
  UnsupportedFileTypeError,
  MalwareDetectedError,
  ChecksumMismatchError,
  StorageUploadNotFoundError,
} from "../../errors/storage.error";
import { ForbiddenError } from "../../errors/forbidden.error";

const DOCUMENT_TYPES: [string, ...string[]] = [
  "exam_export",
  "syllabus",
  "lecture_notes",
  "reference_material",
  "curriculum_map",
  "other",
];

const UploadBodySchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  course_id: z.string().uuid().optional(),
});

const ListQuerySchema = z.object({
  course_id: z.string().uuid().optional(),
  document_type: z.enum(DOCUMENT_TYPES).optional(),
  parse_status: z
    .enum(["pending", "processing", "completed", "failed"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export class StorageController {
  readonly #storageService: StorageService;

  constructor(storageService: StorageService) {
    this.#storageService = storageService;
  }

  #extractUser(
    req: Request,
    res: Response,
  ): { id: string; institution_id: string } | null {
    const user = (req as unknown as Record<string, unknown>).user as
      | { id: string; institution_id: string }
      | undefined;
    if (!user?.id || !user?.institution_id) {
      res.status(401).json({
        data: null,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Authentication required",
        },
      });
      return null;
    }
    return user;
  }

  async handleUpload(req: Request, res: Response): Promise<void> {
    try {
      const user = this.#extractUser(req, res);
      if (!user) return;

      const file = req.file;
      if (!file) {
        res.status(400).json({
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "No file attached",
          },
        });
        return;
      }

      const parsed = UploadBodySchema.parse(req.body);

      const result = await this.#storageService.upload(
        file,
        user.id,
        user.institution_id,
        parsed.document_type as StorageDocumentType,
        parsed.course_id ?? null,
      );

      res.status(201).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleGetPresignedUrl(req: Request, res: Response): Promise<void> {
    try {
      const user = this.#extractUser(req, res);
      if (!user) return;

      const uploadId = req.params.uploadId;
      if (typeof uploadId !== "string") {
        res.status(400).json({
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid upload ID",
          },
        });
        return;
      }

      const result = await this.#storageService.getPresignedUrl(
        uploadId,
        user.institution_id,
      );

      res.status(200).json({ data: result, error: null });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const user = this.#extractUser(req, res);
      if (!user) return;

      const parsed = ListQuerySchema.parse(req.query);

      const result = await this.#storageService.listUploads(
        user.institution_id,
        {
          ...parsed,
          document_type: parsed.document_type as
            | StorageDocumentType
            | undefined,
        },
      );

      res.status(200).json({
        data: result.uploads,
        error: null,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      this.#handleError(res, err);
    }
  }

  async handleSoftDelete(req: Request, res: Response): Promise<void> {
    try {
      const user = this.#extractUser(req, res);
      if (!user) return;

      const uploadId = req.params.uploadId;
      if (typeof uploadId !== "string") {
        res.status(400).json({
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid upload ID",
          },
        });
        return;
      }

      const result = await this.#storageService.softDelete(uploadId, user.id);
      res.status(200).json({ data: result, error: null });
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

    if (err instanceof FileTooLargeError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof UnsupportedFileTypeError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof MalwareDetectedError) {
      res.status(400).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof ChecksumMismatchError) {
      res.status(409).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof StorageUploadNotFoundError) {
      res.status(404).json({
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof ForbiddenError) {
      res.status(403).json({
        data: null,
        error: { code: "FORBIDDEN", message: err.message },
      });
      return;
    }

    if (err instanceof StorageError) {
      res.status(500).json({
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

    console.error("[StorageController] Unexpected error:", err);
    res.status(500).json({
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
}
