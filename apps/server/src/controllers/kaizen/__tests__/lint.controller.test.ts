/**
 * LintController tests.
 * [STORY-IA-12] 5 tests: RBAC, validation, success responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { LintController } from "../lint.controller";
import type { LintEngineService } from "../../../services/kaizen/lint-engine.service";
import type { LintReportRepository } from "../../../repositories/lint-report.repository";
import { LintRuleRegistryService } from "../../../services/kaizen/lint-rule-registry.service";
import type { LintRule } from "@journey-os/types";

function mockRequest(overrides?: Record<string, unknown>): Partial<Request> {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" },
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Partial<Request>;
}

function mockResponse(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
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
  };
  return res;
}

function createMockEngine(): LintEngineService {
  return {
    runScan: vi.fn().mockResolvedValue({
      id: "report-uuid-new",
      institution_id: "inst-uuid-1",
      total_findings: 3,
      critical_count: 1,
      warning_count: 1,
      info_count: 1,
      duration_ms: 2890,
      mode: "full",
      created_at: "2026-02-19T03:00:00Z",
    }),
  } as unknown as LintEngineService;
}

function createMockRepository(): LintReportRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    listByInstitution: vi.fn().mockResolvedValue([
      {
        id: "report-uuid-1",
        institution_id: "inst-uuid-1",
        total_findings: 14,
        critical_count: 2,
        warning_count: 8,
        info_count: 4,
        mode: "full",
        duration_ms: 3420,
        created_at: "2026-02-19T03:00:00Z",
      },
    ]),
    getConfigs: vi.fn().mockResolvedValue([]),
    upsertConfig: vi.fn().mockResolvedValue({
      rule_id: "stale-items",
      enabled: false,
      severity_override: null,
      threshold: null,
    }),
  } as unknown as LintReportRepository;
}

function createMockRule(id: string): LintRule {
  return {
    id,
    name: `Rule ${id}`,
    description: `Description for ${id}`,
    default_severity: "warning",
    execute: vi.fn().mockResolvedValue([]),
  };
}

describe("LintController", () => {
  let controller: LintController;
  let engine: LintEngineService;
  let repository: LintReportRepository;
  let registry: LintRuleRegistryService;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createMockEngine();
    repository = createMockRepository();
    registry = new LintRuleRegistryService();
    registry.register(createMockRule("stale-items"));
    registry.register(createMockRule("orphan-concepts"));
    controller = new LintController(engine, repository, registry);
  });

  describe("handleListReports", () => {
    it("returns 200 with paginated report list for InstitutionalAdmin", async () => {
      const req = mockRequest({
        user: { institution_id: "inst-uuid-1" },
      });
      const res = mockResponse();

      await controller.handleListReports(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: { reports: unknown[] }; error: null };
      expect(body.data.reports).toHaveLength(1);
      expect(body.error).toBeNull();
    });

    it("returns 400 when institution_id is missing", async () => {
      const req = mockRequest({ user: {} });
      const res = mockResponse();

      await controller.handleListReports(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("handleRunScan", () => {
    it("returns 201 with scan summary after successful full scan", async () => {
      const req = mockRequest({
        user: { institution_id: "inst-uuid-1" },
        body: { mode: "full" },
      });
      const res = mockResponse();

      await controller.handleRunScan(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(201);
      const body = res.body as {
        data: { report_id: string; total_findings: number };
      };
      expect(body.data.report_id).toBe("report-uuid-new");
      expect(body.data.total_findings).toBe(3);
    });

    it("returns 400 when mode is invalid", async () => {
      const req = mockRequest({
        user: { institution_id: "inst-uuid-1" },
        body: { mode: "invalid" },
      });
      const res = mockResponse();

      await controller.handleRunScan(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("handleUpdateConfig", () => {
    it("returns 200 with updated config for valid rule_id", async () => {
      const req = mockRequest({
        user: { institution_id: "inst-uuid-1" },
        params: { ruleId: "stale-items" },
        body: { enabled: false },
      });
      const res = mockResponse();

      await controller.handleUpdateConfig(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as {
        data: { rule_id: string; enabled: boolean };
      };
      expect(body.data.rule_id).toBe("stale-items");
      expect(body.data.enabled).toBe(false);
    });
  });
});
