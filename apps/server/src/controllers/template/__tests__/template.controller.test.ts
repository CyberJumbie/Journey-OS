import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { TemplateController } from "../template.controller";
import type { TemplateService } from "../../../services/template/template.service";
import type { TemplateDTO, TemplateVersionDTO } from "@journey-os/types";
import {
  TemplateNotFoundError,
  TemplatePermissionError,
} from "../../../errors";

const OWNER_ID = "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa";
const INSTITUTION_ID = "inst-0001-0001-0001-000000000001";
const OTHER_USER_ID = "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb";

const MOCK_TEMPLATE: TemplateDTO = {
  id: "tmpl-0001",
  institution_id: INSTITUTION_ID,
  owner_id: OWNER_ID,
  name: "Board Prep - Cardiovascular",
  description: "High-difficulty cardiovascular questions",
  question_type: "single_best_answer",
  difficulty_distribution: { easy: 0.1, medium: 0.3, hard: 0.6 },
  bloom_levels: [4, 5, 6],
  scope_config: {},
  prompt_overrides: {},
  metadata: { category: "board_prep" },
  sharing_level: "private",
  current_version: 1,
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-20T10:00:00Z",
  updated_at: "2026-02-20T10:00:00Z",
};

const MOCK_VERSION: TemplateVersionDTO = {
  id: "ver-0001",
  template_id: "tmpl-0001",
  version_number: 1,
  name: "Board Prep - Cardiovascular",
  description: "Initial version",
  question_type: "single_best_answer",
  difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  bloom_levels: [3, 4, 5],
  scope_config: {},
  prompt_overrides: {},
  metadata: {},
  sharing_level: "private",
  created_by: OWNER_ID,
  created_at: "2026-02-20T10:00:00Z",
};

function createMockService(): TemplateService {
  return {
    create: vi.fn().mockResolvedValue(MOCK_TEMPLATE),
    getById: vi.fn().mockResolvedValue(MOCK_TEMPLATE),
    list: vi.fn().mockResolvedValue({
      templates: [MOCK_TEMPLATE],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockResolvedValue({
      ...MOCK_TEMPLATE,
      current_version: 2,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn().mockResolvedValue({
      ...MOCK_TEMPLATE,
      id: "tmpl-dup-001",
      owner_id: OTHER_USER_ID,
      sharing_level: "private",
    }),
    getVersions: vi.fn().mockResolvedValue([MOCK_VERSION]),
  } as unknown as TemplateService;
}

function createMockReqRes(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: { id: string; institution_id: string } | null;
}): {
  req: Request;
  res: Response;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ json, send });

  const req = {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    user:
      overrides.user === null
        ? undefined
        : (overrides.user ?? { id: OWNER_ID, institution_id: INSTITUTION_ID }),
  } as unknown as Request;

  const res = { status, json, send } as unknown as Response;

  return { req, res, json, status, send };
}

describe("TemplateController", () => {
  let svc: TemplateService;
  let controller: TemplateController;

  beforeEach(() => {
    svc = createMockService();
    controller = new TemplateController(svc);
  });

  describe("POST /api/v1/templates", () => {
    it("201 on valid input", async () => {
      const { req, res, status, json } = createMockReqRes({
        body: {
          name: "Board Prep",
          question_type: "single_best_answer",
          difficulty_distribution: { easy: 0.1, medium: 0.3, hard: 0.6 },
          bloom_levels: [4, 5, 6],
        },
      });

      await controller.handleCreate(req, res);

      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: "tmpl-0001" }),
          error: null,
        }),
      );
    });

    it("400 on invalid body — missing name", async () => {
      const { req, res, status, json } = createMockReqRes({
        body: {
          question_type: "single_best_answer",
          difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
          bloom_levels: [3],
        },
      });

      await controller.handleCreate(req, res);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });
  });

  describe("GET /api/v1/templates", () => {
    it("200 with pagination", async () => {
      const { req, res, status, json } = createMockReqRes({
        query: { page: "1", limit: "20" },
      });

      await controller.handleList(req, res);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templates: expect.any(Array),
            meta: expect.objectContaining({ page: 1, total: 1 }),
          }),
        }),
      );
    });
  });

  describe("GET /api/v1/templates/:id", () => {
    it("404 for non-existent", async () => {
      vi.mocked(svc.getById).mockRejectedValueOnce(
        new TemplateNotFoundError("tmpl-missing"),
      );

      const { req, res, status, json } = createMockReqRes({
        params: { id: "tmpl-missing" },
      });

      await controller.handleGetById(req, res);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({ code: "TEMPLATE_NOT_FOUND" }),
        }),
      );
    });
  });

  describe("PUT /api/v1/templates/:id", () => {
    it("403 for non-owner", async () => {
      vi.mocked(svc.update).mockRejectedValueOnce(
        new TemplatePermissionError("update", "tmpl-0001"),
      );

      const { req, res, status, json } = createMockReqRes({
        params: { id: "tmpl-0001" },
        body: { name: "Hijacked" },
        user: { id: OTHER_USER_ID, institution_id: INSTITUTION_ID },
      });

      await controller.handleUpdate(req, res);

      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "TEMPLATE_PERMISSION_ERROR",
          }),
        }),
      );
    });
  });

  describe("DELETE /api/v1/templates/:id", () => {
    it("204 on success", async () => {
      const { req, res, status, send } = createMockReqRes({
        params: { id: "tmpl-0001" },
      });

      await controller.handleDelete(req, res);

      expect(status).toHaveBeenCalledWith(204);
      expect(send).toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/templates/:id/duplicate", () => {
    it("201 with new owner", async () => {
      const { req, res, status, json } = createMockReqRes({
        params: { id: "tmpl-0001" },
        body: { new_name: "My Copy" },
        user: { id: OTHER_USER_ID, institution_id: INSTITUTION_ID },
      });

      await controller.handleDuplicate(req, res);

      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            owner_id: OTHER_USER_ID,
            sharing_level: "private",
          }),
        }),
      );
    });
  });

  describe("GET /api/v1/templates/:id/versions", () => {
    it("returns version history", async () => {
      const { req, res, status, json } = createMockReqRes({
        params: { id: "tmpl-0001" },
      });

      await controller.handleGetVersions(req, res);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              version_number: 1,
              template_id: "tmpl-0001",
            }),
          ]),
        }),
      );
    });
  });
});
