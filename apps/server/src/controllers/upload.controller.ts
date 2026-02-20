import type { Request, Response } from "express";
import type { UploadService } from "../services/upload/upload.service";
import {
  BatchLimitError,
  InvalidFileTypeError,
  UploadError,
  UploadFileSizeLimitError,
} from "../errors/upload.error";
import { CourseNotFoundError } from "../errors/course.error";
import { ValidationError } from "../errors/validation.error";

export class UploadController {
  readonly #uploadService: UploadService;

  constructor(uploadService: UploadService) {
    this.#uploadService = uploadService;
  }

  async handleUpload(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      if (typeof courseId !== "string") {
        res.status(400).json({
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid course ID" },
        });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({
          data: null,
          error: { code: "VALIDATION_ERROR", message: "No files provided" },
        });
        return;
      }

      const user = (req as unknown as Record<string, unknown>).user as
        | {
            sub: string;
            institution_id: string;
          }
        | undefined;

      if (!user) {
        res.status(401).json({
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      const result = await this.#uploadService.processUpload(files, {
        courseId,
        institutionId: user.institution_id,
        userId: user.sub,
      });

      if (result.files.length === 0 && result.errors.length > 0) {
        res.status(400).json({
          data: result,
          error: {
            code: "UPLOAD_FAILED",
            message: "All files failed validation",
          },
        });
        return;
      }

      res.status(200).json({ data: result, error: null });
    } catch (err) {
      if (err instanceof CourseNotFoundError) {
        res.status(404).json({
          data: null,
          error: { code: "NOT_FOUND", message: err.message },
        });
        return;
      }

      if (err instanceof BatchLimitError) {
        res.status(400).json({
          data: null,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      if (err instanceof InvalidFileTypeError) {
        res.status(400).json({
          data: null,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      if (err instanceof UploadFileSizeLimitError) {
        res.status(400).json({
          data: null,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      if (err instanceof UploadError) {
        res.status(400).json({
          data: null,
          error: { code: err.code, message: err.message },
        });
        return;
      }

      if (err instanceof ValidationError) {
        res.status(400).json({
          data: null,
          error: { code: "VALIDATION_ERROR", message: err.message },
        });
        return;
      }

      res.status(500).json({
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  }
}
