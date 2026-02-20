import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { ImportUploadController } from "../import-upload.controller";
import type { ImportUploadService } from "../../../services/import/import-upload.service";
import type { MappingPresetService } from "../../../services/import/mapping-preset.service";
import {
  UploadNotFoundError,
  MappingIncompleteError,
} from "../../../errors/import-mapping.errors";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  email: "dr.carter@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-0001-0001-0001-000000000001",
};

const UPLOAD_RESPONSE = {
  upload_id: "a0000001-0001-4001-a001-000000000001",
  filename: "exam_questions.csv",
  size_bytes: 450,
  storage_path:
    "import-temp/aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa/a0000001/exam_questions.csv",
};

const PREVIEW_RESPONSE = {
  format: "csv" as const,
  columns: [
    "stem",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctAnswer",
    "topic",
  ],
  preview_rows: [
    [
      "A 45-year-old patient...",
      "Acute MI",
      "PE",
      "Pneumothorax",
      "Costochondritis",
      "A",
      "Cardiovascular",
    ],
    [
      "Which enzyme...",
      "AST",
      "ALT",
      "Troponin I",
      "LDH",
      "C",
      "Cardiovascular",
    ],
  ],
  total_rows: 3,
  suggested_mappings: [
    { source_column: "stem", target_field: "stem" as const, confidence: 1.0 },
    {
      source_column: "optionA",
      target_field: "answer_choice_a" as const,
      confidence: 0.85,
    },
  ],
  file_info: {
    filename: "exam_questions.csv",
    size_bytes: 450,
    upload_id: "a0000001-0001-4001-a001-000000000001",
  },
};

const CONFIRM_RESPONSE = {
  upload_id: "a0000001-0001-4001-a001-000000000001",
  filename: "exam_questions.csv",
  format: "csv" as const,
  total_rows: 3,
  mapped_fields: [
    { source_column: "stem", target_field: "stem" as const, confidence: null },
  ],
  unmapped_columns: ["topic"],
  validation_warnings: ["Optional field 'rationale' is not mapped"],
  estimated_duration_seconds: 1,
};

const JOB_STATUS = {
  job_id: "job-uuid-1",
  status: "queued" as const,
  progress_percent: 0,
  rows_processed: 0,
  rows_total: 3,
  errors: [],
  created_at: "2026-02-15T12:05:00Z",
};

const PRESET_FIXTURE = {
  id: "preset-0001-0001-0001-000000000001",
  user_id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  name: "ExamSoft CSV Format",
  description: "Column mapping for ExamSoft CSV exports",
  mappings: [
    {
      source_column: "Item Stem",
      target_field: "stem" as const,
      confidence: null,
    },
  ],
  source_format: "csv" as const,
  created_at: "2026-02-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
};

const VALID_MAPPINGS = [
  { source_column: "stem", target_field: "stem", confidence: null },
  {
    source_column: "optionA",
    target_field: "answer_choice_a",
    confidence: null,
  },
  {
    source_column: "optionB",
    target_field: "answer_choice_b",
    confidence: null,
  },
  {
    source_column: "optionC",
    target_field: "answer_choice_c",
    confidence: null,
  },
  {
    source_column: "optionD",
    target_field: "answer_choice_d",
    confidence: null,
  },
  {
    source_column: "correctAnswer",
    target_field: "correct_answer",
    confidence: null,
  },
];

// ─── Mocks ──────────────────────────────────────────────────────────

function createMockUploadService(): ImportUploadService {
  return {
    upload: vi.fn(),
    preview: vi.fn(),
    confirm: vi.fn(),
    execute: vi.fn(),
  } as unknown as ImportUploadService;
}

function createMockPresetService(): MappingPresetService {
  return {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  } as unknown as MappingPresetService;
}

function createMockReq(overrides?: Record<string, unknown>): Request {
  return {
    body: {},
    params: {},
    file: undefined,
    user: FACULTY_USER,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
  send: () => unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
    send() {
      return res;
    },
  };
  return res;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("ImportUploadController", () => {
  let uploadService: ImportUploadService;
  let presetService: MappingPresetService;
  let controller: ImportUploadController;

  beforeEach(() => {
    uploadService = createMockUploadService();
    presetService = createMockPresetService();
    controller = new ImportUploadController(uploadService, presetService);
  });

  describe("POST /api/v1/import/upload", () => {
    it("uploads file and returns upload_id (201)", async () => {
      vi.mocked(uploadService.upload).mockResolvedValue(UPLOAD_RESPONSE);
      const req = createMockReq({
        file: {
          buffer: Buffer.from("csv content"),
          originalname: "exam_questions.csv",
          mimetype: "text/csv",
          size: 450,
        },
      });
      const res = createMockRes();

      await controller.handleUpload(req, res as unknown as Response);

      expect(res.statusCode).toBe(201);
      expect((res.body as { data: unknown }).data).toEqual(UPLOAD_RESPONSE);
    });

    it("rejects request with no file (400)", async () => {
      const req = createMockReq({ file: undefined });
      const res = createMockRes();

      await controller.handleUpload(req, res as unknown as Response);

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("POST /api/v1/import/preview", () => {
    it("returns preview with columns and rows (200)", async () => {
      vi.mocked(uploadService.preview).mockResolvedValue(PREVIEW_RESPONSE);
      const req = createMockReq({
        body: {
          upload_id: "a0000001-0001-4001-a001-000000000001",
          preview_rows: 5,
        },
      });
      const res = createMockRes();

      await controller.handlePreview(req, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      const data = (res.body as { data: typeof PREVIEW_RESPONSE }).data;
      expect(data.columns.length).toBeGreaterThan(0);
      expect(data.preview_rows.length).toBeLessThanOrEqual(5);
      expect(data.suggested_mappings.length).toBeGreaterThan(0);
    });

    it("returns 404 for expired upload", async () => {
      vi.mocked(uploadService.preview).mockRejectedValue(
        new UploadNotFoundError("expired-uuid"),
      );
      const req = createMockReq({
        body: {
          upload_id: "00000000-0000-0000-0000-000000000000",
          preview_rows: 5,
        },
      });
      const res = createMockRes();

      await controller.handlePreview(req, res as unknown as Response);

      expect(res.statusCode).toBe(404);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "UPLOAD_NOT_FOUND",
      );
    });
  });

  describe("GET /api/v1/import/presets", () => {
    it("returns user presets (200)", async () => {
      vi.mocked(presetService.list).mockResolvedValue([PRESET_FIXTURE]);
      const req = createMockReq();
      const res = createMockRes();

      await controller.handleListPresets(req, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      const data = (res.body as { data: unknown[] }).data;
      expect(data).toHaveLength(1);
      expect(vi.mocked(presetService.list)).toHaveBeenCalledWith(
        FACULTY_USER.id,
      );
    });
  });

  describe("POST /api/v1/import/presets", () => {
    it("creates mapping preset (201)", async () => {
      vi.mocked(presetService.create).mockResolvedValue(PRESET_FIXTURE);
      const req = createMockReq({
        body: {
          name: "ExamSoft CSV Format",
          mappings: [
            {
              source_column: "Item Stem",
              target_field: "stem",
              confidence: null,
            },
          ],
          source_format: "csv",
        },
      });
      const res = createMockRes();

      await controller.handleCreatePreset(req, res as unknown as Response);

      expect(res.statusCode).toBe(201);
      expect((res.body as { data: { name: string } }).data.name).toBe(
        "ExamSoft CSV Format",
      );
    });

    it("rejects preset with empty name (400)", async () => {
      const req = createMockReq({
        body: {
          name: "",
          mappings: [
            { source_column: "stem", target_field: "stem", confidence: null },
          ],
          source_format: "csv",
        },
      });
      const res = createMockRes();

      await controller.handleCreatePreset(req, res as unknown as Response);

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("POST /api/v1/import/confirm", () => {
    it("returns confirmation summary (200)", async () => {
      vi.mocked(uploadService.confirm).mockResolvedValue(CONFIRM_RESPONSE);
      const req = createMockReq({
        body: {
          upload_id: "a0000001-0001-4001-a001-000000000001",
          mappings: VALID_MAPPINGS,
        },
      });
      const res = createMockRes();

      await controller.handleConfirm(req, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      const data = (res.body as { data: typeof CONFIRM_RESPONSE }).data;
      expect(data.total_rows).toBe(3);
      expect(data.estimated_duration_seconds).toBeGreaterThan(0);
    });

    it("rejects incomplete mapping (400)", async () => {
      vi.mocked(uploadService.confirm).mockRejectedValue(
        new MappingIncompleteError(["stem", "correct_answer"]),
      );
      const req = createMockReq({
        body: {
          upload_id: "a0000001-0001-4001-a001-000000000001",
          mappings: [
            {
              source_column: "optionA",
              target_field: "answer_choice_a",
              confidence: null,
            },
          ],
        },
      });
      const res = createMockRes();

      await controller.handleConfirm(req, res as unknown as Response);

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "MAPPING_INCOMPLETE",
      );
    });
  });

  describe("DELETE /api/v1/import/presets/:id", () => {
    it("deletes a preset (204)", async () => {
      vi.mocked(presetService.delete).mockResolvedValue(undefined);
      const req = createMockReq({
        params: { id: "b0000001-0001-4001-a001-000000000001" },
      });
      const res = createMockRes();

      await controller.handleDeletePreset(req, res as unknown as Response);

      expect(res.statusCode).toBe(204);
      expect(vi.mocked(presetService.delete)).toHaveBeenCalledWith(
        FACULTY_USER.id,
        "b0000001-0001-4001-a001-000000000001",
      );
    });
  });

  describe("POST /api/v1/import/execute", () => {
    it("queues import job and returns 202", async () => {
      vi.mocked(uploadService.execute).mockResolvedValue(JOB_STATUS);
      const req = createMockReq({
        body: {
          upload_id: "a0000001-0001-4001-a001-000000000001",
          mappings: VALID_MAPPINGS,
          course_id: "00000000-0000-0000-0000-000000000000",
        },
      });
      const res = createMockRes();

      await controller.handleExecute(req, res as unknown as Response);

      expect(res.statusCode).toBe(202);
      const data = (res.body as { data: typeof JOB_STATUS }).data;
      expect(data.job_id).toBeDefined();
      expect(data.status).toBe("queued");
      expect(data.rows_total).toBe(3);
    });

    it("rejects execute with missing course_id (400)", async () => {
      const req = createMockReq({
        body: {
          upload_id: "a0000001-0001-4001-a001-000000000001",
          mappings: VALID_MAPPINGS,
        },
      });
      const res = createMockRes();

      await controller.handleExecute(req, res as unknown as Response);

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });
});
