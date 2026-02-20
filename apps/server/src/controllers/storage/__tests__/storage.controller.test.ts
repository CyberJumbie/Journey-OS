import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { StorageController } from "../storage.controller";
import type { StorageService } from "../../../services/storage/storage.service";
import {
  FileTooLargeError,
  UnsupportedFileTypeError,
  StorageUploadNotFoundError,
  StorageError,
} from "../../../errors/storage.error";
import { ForbiddenError } from "../../../errors/forbidden.error";

const MOCK_INSTITUTION_ID = "a0000001-0001-4001-a001-000000000001";
const MOCK_USER_ID = "a0000002-0002-4002-a002-000000000002";
const MOCK_UPLOAD_ID = "a0000004-0004-4004-a004-000000000004";

function createMockStorageService(): StorageService {
  return {
    upload: vi.fn().mockResolvedValue({
      id: MOCK_UPLOAD_ID,
      filename: "exam.csv",
      storage_path: "path/to/file",
      size_bytes: 1024,
      content_type: "text/csv",
      checksum_sha256: "abc123",
      document_type: "exam_export",
      parse_status: "pending",
      created_at: "2026-02-19T12:00:00Z",
    }),
    getPresignedUrl: vi.fn().mockResolvedValue({
      url: "https://example.com/signed-url",
      expires_at: "2026-02-19T13:00:00Z",
    }),
    listUploads: vi.fn().mockResolvedValue({
      uploads: [],
      total: 0,
      page: 1,
      limit: 25,
      total_pages: 0,
    }),
    softDelete: vi.fn().mockResolvedValue({
      id: MOCK_UPLOAD_ID,
      deleted_at: "2026-02-19T14:00:00Z",
    }),
    validateFile: vi.fn(),
    buildStorageKey: vi.fn(),
    computeChecksum: vi.fn(),
  } as unknown as StorageService;
}

function createMockReq(overrides?: {
  user?: { id: string; institution_id: string } | null;
  file?: Record<string, unknown> | null;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
}): Request {
  return {
    file:
      overrides?.file === null
        ? undefined
        : (overrides?.file ?? {
            buffer: Buffer.from("test"),
            originalname: "exam.csv",
            mimetype: "text/csv",
            size: 4,
          }),
    body: overrides?.body ?? { document_type: "exam_export" },
    params: overrides?.params ?? { uploadId: MOCK_UPLOAD_ID },
    query: overrides?.query ?? {},
    user:
      overrides?.user === null
        ? undefined
        : (overrides?.user ?? {
            id: MOCK_USER_ID,
            institution_id: MOCK_INSTITUTION_ID,
          }),
  } as unknown as Request;
}

interface MockResState {
  statusCode: number;
  body: unknown;
  res: Response;
}

function createMockRes(): MockResState {
  const state: MockResState = {
    statusCode: 0,
    body: null,
    res: null as unknown as Response,
  };
  const json = vi.fn().mockImplementation((data: unknown) => {
    state.body = data;
  });
  const send = vi.fn();
  const status = vi.fn().mockImplementation((code: number) => {
    state.statusCode = code;
    return { json, send };
  });
  state.res = { status, json, send } as unknown as Response;
  return state;
}

describe("StorageController", () => {
  let controller: StorageController;
  let mockService: StorageService;

  beforeEach(() => {
    mockService = createMockStorageService();
    controller = new StorageController(mockService);
  });

  describe("handleUpload (POST /api/v1/uploads)", () => {
    it("uploads valid CSV file and returns upload record (201)", async () => {
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(201);
      expect((mock.body as Record<string, unknown>).data).toHaveProperty(
        "id",
        MOCK_UPLOAD_ID,
      );
      expect((mock.body as Record<string, unknown>).error).toBeNull();
    });

    it("uploads valid PDF file and returns upload record (201)", async () => {
      const req = createMockReq({
        file: {
          buffer: Buffer.from("%PDF"),
          originalname: "doc.pdf",
          mimetype: "application/pdf",
          size: 4,
        },
      });
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);
      expect(mock.statusCode).toBe(201);
    });

    it("rejects file exceeding 50MB size limit (400 FILE_TOO_LARGE)", async () => {
      (mockService.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new FileTooLargeError(51 * 1024 * 1024, 50 * 1024 * 1024),
      );
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(400);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "FILE_TOO_LARGE",
      );
    });

    it("rejects unsupported MIME type (400 UNSUPPORTED_FILE_TYPE)", async () => {
      (mockService.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new UnsupportedFileTypeError("image/png", []),
      );
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(400);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "UNSUPPORTED_FILE_TYPE",
      );
    });

    it("rejects request with no file attached (400 VALIDATION_ERROR)", async () => {
      const req = createMockReq({ file: null });
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(400);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "VALIDATION_ERROR",
      );
    });

    it("rejects request with missing document_type (400 VALIDATION_ERROR)", async () => {
      const req = createMockReq({ body: {} });
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(400);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "VALIDATION_ERROR",
      );
    });

    it("stores file at correct storage key path", async () => {
      const req = createMockReq({
        body: {
          document_type: "exam_export",
          course_id: "a0000003-0003-4003-a003-000000000003",
        },
      });
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mockService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: "exam.csv" }),
        MOCK_USER_ID,
        MOCK_INSTITUTION_ID,
        "exam_export",
        "a0000003-0003-4003-a003-000000000003",
      );
    });

    it('sets parse_status to "pending" for new uploads', async () => {
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      const data = (mock.body as Record<string, unknown>).data as Record<
        string,
        unknown
      >;
      expect(data.parse_status).toBe("pending");
    });

    it("returns 401 when not authenticated", async () => {
      const req = createMockReq({ user: null });
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(401);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "AUTHENTICATION_ERROR",
      );
    });

    it("returns 500 when storage upload fails", async () => {
      (mockService.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new StorageError("Bucket not found"),
      );
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleUpload(req, mock.res);

      expect(mock.statusCode).toBe(500);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "STORAGE_ERROR",
      );
    });
  });

  describe("handleGetPresignedUrl (GET /api/v1/uploads/:uploadId/url)", () => {
    it("returns presigned URL with 1-hour expiry (200)", async () => {
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleGetPresignedUrl(req, mock.res);

      expect(mock.statusCode).toBe(200);
      const data = (mock.body as Record<string, unknown>).data as Record<
        string,
        unknown
      >;
      expect(data).toHaveProperty("url");
      expect(data).toHaveProperty("expires_at");
    });

    it("returns 404 for non-existent upload ID", async () => {
      (
        mockService.getPresignedUrl as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new StorageUploadNotFoundError("nonexistent"));
      const req = createMockReq({ params: { uploadId: "nonexistent" } });
      const mock = createMockRes();

      await controller.handleGetPresignedUrl(req, mock.res);

      expect(mock.statusCode).toBe(404);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "NOT_FOUND",
      );
    });

    it("returns 404 for soft-deleted upload", async () => {
      (
        mockService.getPresignedUrl as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new StorageUploadNotFoundError(MOCK_UPLOAD_ID));
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleGetPresignedUrl(req, mock.res);

      expect(mock.statusCode).toBe(404);
    });

    it("returns 403 for upload from different institution", async () => {
      (
        mockService.getPresignedUrl as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(
        new ForbiddenError("Upload belongs to a different institution"),
      );
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleGetPresignedUrl(req, mock.res);

      expect(mock.statusCode).toBe(403);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "FORBIDDEN",
      );
    });
  });

  describe("handleSoftDelete (DELETE /api/v1/uploads/:uploadId)", () => {
    it("soft-deletes upload by setting deleted_at (200)", async () => {
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleSoftDelete(req, mock.res);

      expect(mock.statusCode).toBe(200);
      const data = (mock.body as Record<string, unknown>).data as Record<
        string,
        unknown
      >;
      expect(data).toHaveProperty("id", MOCK_UPLOAD_ID);
      expect(data).toHaveProperty("deleted_at");
    });

    it("returns 404 for already soft-deleted upload", async () => {
      (
        mockService.softDelete as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new StorageUploadNotFoundError(MOCK_UPLOAD_ID));
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleSoftDelete(req, mock.res);

      expect(mock.statusCode).toBe(404);
    });

    it("returns 403 when user is not the upload owner", async () => {
      (
        mockService.softDelete as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(
        new ForbiddenError("Only the upload owner can delete this file"),
      );
      const req = createMockReq();
      const mock = createMockRes();

      await controller.handleSoftDelete(req, mock.res);

      expect(mock.statusCode).toBe(403);
      expect((mock.body as Record<string, unknown>).error).toHaveProperty(
        "code",
        "FORBIDDEN",
      );
    });
  });

  describe("handleList (GET /api/v1/uploads)", () => {
    it("returns paginated upload list (200)", async () => {
      const req = createMockReq({ query: {} });
      const mock = createMockRes();

      await controller.handleList(req, mock.res);

      expect(mock.statusCode).toBe(200);
      const response = mock.body as Record<string, unknown>;
      expect(response).toHaveProperty("data");
      expect(response).toHaveProperty("meta");
      expect(response.error).toBeNull();
    });

    it("passes query filters to service", async () => {
      const req = createMockReq({
        query: { document_type: "exam_export", page: "2", limit: "10" },
      });
      const mock = createMockRes();

      await controller.handleList(req, mock.res);

      expect(mockService.listUploads).toHaveBeenCalledWith(
        MOCK_INSTITUTION_ID,
        expect.objectContaining({
          document_type: "exam_export",
          page: 2,
          limit: 10,
        }),
      );
    });
  });
});
