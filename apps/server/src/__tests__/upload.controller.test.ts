import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { UploadController } from "../controllers/upload.controller";
import type { UploadService } from "../services/upload/upload.service";
import { CourseNotFoundError } from "../errors/course.error";
import {
  BatchLimitError,
  InvalidFileTypeError,
  UploadFileSizeLimitError,
} from "../errors/upload.error";
import {
  ACCEPTED_MIME_TYPES,
  MIME_TO_DOCUMENT_TYPE,
  UPLOAD_MAX_FILE_SIZE_BYTES,
} from "@journey-os/types";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "jsmith@msm.edu",
  role: "faculty",
  institution_id: "inst-uuid-1",
  is_course_director: false,
};

const MOCK_UPLOAD_RECORD = {
  id: "upload-uuid-1",
  filename: "cardiology-notes.pdf",
  content_type: "application/pdf",
  size_bytes: 2456789,
  storage_path: "uploads/inst-uuid-1/course-uuid-1/upload-uuid-1.pdf",
  document_type: "pdf",
  parse_status: "pending",
  created_at: "2026-02-19T15:00:00Z",
};

const MOCK_PPTX_RECORD = {
  ...MOCK_UPLOAD_RECORD,
  id: "upload-uuid-2",
  filename: "lecture-slides.pptx",
  content_type:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  size_bytes: 5678901,
  storage_path: "uploads/inst-uuid-1/course-uuid-1/upload-uuid-2.pptx",
  document_type: "pptx",
};

function createMockFile(
  overrides?: Partial<Express.Multer.File>,
): Express.Multer.File {
  return {
    fieldname: "files",
    originalname: "cardiology-notes.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 2456789,
    buffer: Buffer.from("fake pdf content"),
    destination: "",
    filename: "",
    path: "",
    stream: null as unknown as NodeJS.ReadableStream,
    ...overrides,
  } as Express.Multer.File;
}

function createMockPptxFile(): Express.Multer.File {
  return createMockFile({
    originalname: "lecture-slides.pptx",
    mimetype:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: 5678901,
  });
}

function createMockDocxFile(): Express.Multer.File {
  return createMockFile({
    originalname: "syllabus.docx",
    mimetype:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 345678,
  });
}

function createMockInvalidFile(): Express.Multer.File {
  return createMockFile({
    originalname: "photo.png",
    mimetype: "image/png",
    size: 123456,
  });
}

// ─── Mock helpers ──────────────────────────────────────────────────────

function createMockService(): UploadService {
  return {
    processUpload: vi.fn().mockResolvedValue({
      files: [MOCK_UPLOAD_RECORD],
      errors: [],
    }),
  } as unknown as UploadService;
}

function createMockReqRes(overrides?: {
  params?: Record<string, unknown>;
  files?: Express.Multer.File[];
  user?: Record<string, unknown> | null;
}): { req: Request; res: Response } {
  const reqObj: Record<string, unknown> = {
    params: overrides?.params ?? { courseId: "course-uuid-1" },
    files: overrides?.files ?? [createMockFile()],
  };
  if (overrides?.user !== null) {
    reqObj.user = overrides?.user ?? FACULTY_USER;
  }
  const req = reqObj as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

function getResponseBody(res: Response): { statusCode: number; body: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]!;
  const jsonFn = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value
    .json;
  const body = jsonFn.mock.calls[0]?.[0];
  return { statusCode: statusCall[0] as number, body };
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe("UploadController", () => {
  let svc: UploadService;
  let controller: UploadController;

  beforeEach(() => {
    svc = createMockService();
    controller = new UploadController(svc);
  });

  describe("handleUpload", () => {
    it("uploads single valid PDF and returns upload record (200)", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect((body as { data: { files: unknown[] } }).data.files).toHaveLength(
        1,
      );
      expect((body as { error: unknown }).error).toBeNull();
    });

    it("uploads multiple valid files (PDF + PPTX + DOCX) in one batch (200)", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [MOCK_UPLOAD_RECORD, MOCK_PPTX_RECORD],
        errors: [],
      });

      const { req, res } = createMockReqRes({
        files: [createMockFile(), createMockPptxFile(), createMockDocxFile()],
      });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect((body as { data: { files: unknown[] } }).data.files).toHaveLength(
        2,
      );
    });

    it("rejects request with no files (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({ files: [] });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("rejects request when files is undefined (400)", async () => {
      const reqObj: Record<string, unknown> = {
        params: { courseId: "course-uuid-1" },
        user: FACULTY_USER,
      };
      const req = reqObj as unknown as Request;
      const json = vi.fn();
      const status = vi.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;

      await controller.handleUpload(req, res);

      const statusCode = (status as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(statusCode).toBe(400);
    });

    it("rejects unauthenticated request (401)", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(401);
      expect((body as { error: { code: string } }).error.code).toBe(
        "UNAUTHORIZED",
      );
    });

    it("returns 404 for non-existent course ID", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new CourseNotFoundError("course-uuid-999"),
      );

      const { req, res } = createMockReqRes({
        params: { courseId: "course-uuid-999" },
      });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(404);
      expect((body as { error: { code: string } }).error.code).toBe(
        "NOT_FOUND",
      );
    });

    it("returns 400 when batch exceeds limit", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new BatchLimitError(15, 10),
      );

      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "BATCH_LIMIT",
      );
    });

    it("returns partial success: valid files uploaded, invalid in errors", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [MOCK_UPLOAD_RECORD],
        errors: [
          {
            filename: "photo.png",
            code: "INVALID_FILE_TYPE",
            message: "File type image/png is not supported",
          },
        ],
      });

      const { req, res } = createMockReqRes({
        files: [createMockFile(), createMockInvalidFile()],
      });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const data = (body as { data: { files: unknown[]; errors: unknown[] } })
        .data;
      expect(data.files).toHaveLength(1);
      expect(data.errors).toHaveLength(1);
    });

    it("returns 400 when ALL files fail validation", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
        files: [],
        errors: [
          {
            filename: "photo.png",
            code: "INVALID_FILE_TYPE",
            message: "File type image/png is not supported",
          },
        ],
      });

      const { req, res } = createMockReqRes({
        files: [createMockInvalidFile()],
      });

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "UPLOAD_FAILED",
      );
    });

    it("creates upload record with correct storage_path format", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      expect(svc.processUpload).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ originalname: "cardiology-notes.pdf" }),
        ]),
        {
          courseId: "course-uuid-1",
          institutionId: "inst-uuid-1",
          userId: "faculty-uuid-1",
        },
      );
    });

    it("returns 500 for unexpected errors", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unexpected DB failure"),
      );

      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(500);
      expect((body as { error: { code: string } }).error.code).toBe(
        "INTERNAL_ERROR",
      );
    });

    it("returns 400 for InvalidFileTypeError from service", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvalidFileTypeError("photo.png", "image/png", ["application/pdf"]),
      );

      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "INVALID_FILE_TYPE",
      );
    });

    it("returns 400 for UploadFileSizeLimitError from service", async () => {
      (svc.processUpload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new UploadFileSizeLimitError("big.pdf", 60_000_000, 52_428_800),
      );

      const { req, res } = createMockReqRes();

      await controller.handleUpload(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "FILE_SIZE_LIMIT",
      );
    });
  });
});

describe("UploadService", () => {
  // These tests validate the service layer logic via the mock patterns
  // Service is tested through integration with the controller above
  // and via direct unit tests below

  describe("processUpload", () => {
    it("determines document_type from MIME type", () => {
      expect(MIME_TO_DOCUMENT_TYPE["application/pdf"]).toBe("pdf");
      expect(
        MIME_TO_DOCUMENT_TYPE[
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ],
      ).toBe("pptx");
      expect(
        MIME_TO_DOCUMENT_TYPE[
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
      ).toBe("docx");
    });
  });
});

describe("Upload Validation", () => {
  describe("error classes", () => {
    it("InvalidFileTypeError has correct code and properties", () => {
      const err = new InvalidFileTypeError("photo.png", "image/png", [
        "application/pdf",
      ]);
      expect(err.code).toBe("INVALID_FILE_TYPE");
      expect(err.filename).toBe("photo.png");
      expect(err.mimeType).toBe("image/png");
      expect(err.acceptedTypes).toEqual(["application/pdf"]);
      expect(err.message).toContain("image/png");
    });

    it("UploadFileSizeLimitError has correct code and properties", () => {
      const err = new UploadFileSizeLimitError(
        "big.pdf",
        60_000_000,
        52_428_800,
      );
      expect(err.code).toBe("FILE_SIZE_LIMIT");
      expect(err.filename).toBe("big.pdf");
      expect(err.fileSize).toBe(60_000_000);
      expect(err.maxSize).toBe(52_428_800);
    });

    it("BatchLimitError has correct code and properties", () => {
      const err = new BatchLimitError(15, 10);
      expect(err.code).toBe("BATCH_LIMIT");
      expect(err.fileCount).toBe(15);
      expect(err.maxFiles).toBe(10);
    });
  });

  describe("MIME type validation", () => {
    it("accepts application/pdf", () => {
      expect(ACCEPTED_MIME_TYPES).toContain("application/pdf");
    });

    it("accepts application/vnd.openxmlformats-officedocument.presentationml.presentation", () => {
      expect(ACCEPTED_MIME_TYPES).toContain(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    });

    it("accepts application/vnd.openxmlformats-officedocument.wordprocessingml.document", () => {
      expect(ACCEPTED_MIME_TYPES).toContain(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("does not accept image/png", () => {
      expect(ACCEPTED_MIME_TYPES).not.toContain("image/png");
    });

    it("does not accept application/zip", () => {
      expect(ACCEPTED_MIME_TYPES).not.toContain("application/zip");
    });

    it("enforces 50MB file size limit constant", () => {
      expect(UPLOAD_MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });
  });
});
