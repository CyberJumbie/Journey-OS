import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StorageService } from "../storage.service";
import type { IMalwareScanService } from "../malware-scan.stub";
import {
  FileTooLargeError,
  UnsupportedFileTypeError,
  StorageError,
  StorageUploadNotFoundError,
} from "../../../errors/storage.error";
import { ForbiddenError } from "../../../errors/forbidden.error";

const MOCK_INSTITUTION_ID = "a0000001-0001-4001-a001-000000000001";
const MOCK_USER_ID = "a0000002-0002-4002-a002-000000000002";
const MOCK_COURSE_ID = "a0000003-0003-4003-a003-000000000003";

const VALID_CSV_BUFFER = Buffer.from(
  "stem,optionA,optionB,optionC,optionD,correctAnswer\n" +
    '"Test question?","A","B","C","D","A"\n',
);

function createMockMalwareScanner(): IMalwareScanService {
  return {
    scan: vi
      .fn<
        () => Promise<{
          clean: boolean;
          scanDurationMs: number;
          engine: string;
          threat: string | null;
        }>
      >()
      .mockResolvedValue({
        clean: true,
        scanDurationMs: 0,
        engine: "stub",
        threat: null,
      }),
  };
}

function createMockSupabase(overrides?: {
  uploadError?: { message: string } | null;
  insertData?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
  selectData?: Record<string, unknown> | null;
  selectError?: { message: string } | null;
  signedUrlData?: { signedUrl: string } | null;
  signedUrlError?: { message: string } | null;
}): SupabaseClient {
  const singleMock = vi.fn().mockResolvedValue({
    data: overrides?.insertData ?? {
      id: "a0000004-0004-4004-a004-000000000004",
      filename: "test.csv",
      storage_path: "path/to/file",
      size_bytes: 100,
      content_type: "text/csv",
      checksum_sha256: "abc123",
      document_type: "exam_export",
      parse_status: "pending",
      created_at: "2026-02-19T12:00:00Z",
    },
    error: overrides?.insertError ?? null,
  });

  const selectMock = vi.fn().mockReturnValue({ single: singleMock });

  const insertMock = vi.fn().mockReturnValue({ select: selectMock });

  // For findActiveUpload queries
  const isMock = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: overrides?.selectData ?? {
        id: "a0000004-0004-4004-a004-000000000004",
        institution_id: MOCK_INSTITUTION_ID,
        uploaded_by: MOCK_USER_ID,
        storage_path: "path/to/file",
        deleted_at: null,
      },
      error: overrides?.selectError ?? null,
    }),
  });

  const eqMock = vi.fn().mockReturnValue({ is: isMock });
  const selectAllMock = vi.fn().mockReturnValue({ eq: eqMock });

  // For update chain
  const updateSingleMock = vi.fn().mockResolvedValue({
    data: { id: "a0000004-0004-4004-a004-000000000004" },
    error: null,
  });
  const updateSelectMock = vi
    .fn()
    .mockReturnValue({ single: updateSingleMock });
  const updateEqMock = vi.fn().mockReturnValue({ select: updateSelectMock });
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "path/to/file" },
          error: overrides?.uploadError ?? null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: overrides?.signedUrlData ?? {
            signedUrl: "https://example.com/signed-url",
          },
          error: overrides?.signedUrlError ?? null,
        }),
      }),
    },
    from: vi.fn().mockImplementation(() => ({
      insert: insertMock,
      select: selectAllMock,
      update: updateMock,
    })),
  } as unknown as SupabaseClient;
}

describe("StorageService", () => {
  let service: StorageService;
  let mockSupabase: SupabaseClient;
  let mockScanner: IMalwareScanService;

  beforeEach(() => {
    mockScanner = createMockMalwareScanner();
    mockSupabase = createMockSupabase();
    service = new StorageService(mockSupabase, mockScanner);
  });

  describe("buildStorageKey", () => {
    it("builds correct path: {inst}/{course}/{file}/{filename}", () => {
      const key = service.buildStorageKey({
        institutionId: MOCK_INSTITUTION_ID,
        courseId: MOCK_COURSE_ID,
        fileId: "file-001",
        filename: "exam.csv",
      });
      expect(key).toBe(
        `${MOCK_INSTITUTION_ID}/${MOCK_COURSE_ID}/file-001/exam.csv`,
      );
    });

    it('uses "uncategorized" when course_id is empty', () => {
      const key = service.buildStorageKey({
        institutionId: MOCK_INSTITUTION_ID,
        courseId: "",
        fileId: "file-001",
        filename: "exam.csv",
      });
      expect(key).toBe(
        `${MOCK_INSTITUTION_ID}/uncategorized/file-001/exam.csv`,
      );
    });
  });

  describe("computeChecksum", () => {
    it("computes SHA-256 hex digest for buffer", () => {
      const checksum = service.computeChecksum(VALID_CSV_BUFFER);
      const expected = createHash("sha256")
        .update(VALID_CSV_BUFFER)
        .digest("hex");
      expect(checksum).toBe(expected);
    });

    it("returns consistent checksum for same content", () => {
      const first = service.computeChecksum(VALID_CSV_BUFFER);
      const second = service.computeChecksum(VALID_CSV_BUFFER);
      expect(first).toBe(second);
    });
  });

  describe("validateFile", () => {
    it("accepts allowed MIME types", () => {
      expect(() => service.validateFile("text/csv", 1024)).not.toThrow();
      expect(() => service.validateFile("application/pdf", 1024)).not.toThrow();
    });

    it("rejects disallowed MIME types", () => {
      expect(() => service.validateFile("image/png", 1024)).toThrow(
        UnsupportedFileTypeError,
      );
    });

    it("rejects files exceeding size limit", () => {
      const oversized = 51 * 1024 * 1024;
      expect(() => service.validateFile("text/csv", oversized)).toThrow(
        FileTooLargeError,
      );
    });
  });

  describe("upload", () => {
    const mockFile = {
      buffer: VALID_CSV_BUFFER,
      originalname: "exam.csv",
      mimetype: "text/csv",
      size: VALID_CSV_BUFFER.length,
    };

    it("calls Supabase storage.upload with correct bucket and key", async () => {
      await service.upload(
        mockFile,
        MOCK_USER_ID,
        MOCK_INSTITUTION_ID,
        "exam_export",
        MOCK_COURSE_ID,
      );

      const storageFrom = mockSupabase.storage.from as ReturnType<typeof vi.fn>;
      expect(storageFrom).toHaveBeenCalledWith("content-originals");
    });

    it("creates uploads table record with metadata", async () => {
      const result = await service.upload(
        mockFile,
        MOCK_USER_ID,
        MOCK_INSTITUTION_ID,
        "exam_export",
        MOCK_COURSE_ID,
      );

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("storage_path");

      const fromMock = mockSupabase.from as ReturnType<typeof vi.fn>;
      expect(fromMock).toHaveBeenCalledWith("uploads");
    });
  });
});
