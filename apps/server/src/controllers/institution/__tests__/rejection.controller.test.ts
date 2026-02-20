import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { RejectionController } from "../rejection.controller";
import { RejectionService } from "../../../services/institution/rejection.service";
import { ApplicationNotFoundError } from "../../../errors/application.error";
import {
  ApplicationAlreadyProcessedError,
  RejectionReasonRequiredError,
} from "../../../errors/rejection.error";

const VALID_RESULT = {
  application_id: "app-1",
  institution_name: "Example Medical School",
  status: "rejected" as const,
  rejection_reason: "Does not meet requirements for accreditation.",
  rejected_by: "sa-uuid-1",
  rejected_at: "2026-02-20T00:00:00Z",
};

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockRequest(
  opts: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    user?: { sub: string } | null;
  } = {},
): Request {
  const base: Record<string, unknown> = {
    params: opts.params ?? { id: "app-1" },
    body: opts.body ?? {
      reason: "Does not meet requirements for accreditation.",
    },
  };
  if (opts.user !== null) {
    base.user = opts.user ?? { sub: "sa-uuid-1" };
  }
  return base as unknown as Request;
}

describe("RejectionController", () => {
  let controller: RejectionController;
  let mockService: RejectionService;

  beforeEach(() => {
    mockService = {
      reject: vi.fn().mockResolvedValue(VALID_RESULT),
    } as unknown as RejectionService;

    controller = new RejectionController(mockService);
  });

  it("returns 200 on successful rejection", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          application_id: "app-1",
          status: "rejected",
        }),
        error: null,
      }),
    );
  });

  it("returns 400 when reason is missing", async () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Rejection reason is required",
        }),
      }),
    );
  });

  it("returns 400 when reason is too short (via service)", async () => {
    (mockService.reject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new RejectionReasonRequiredError(),
    );
    const req = createMockRequest({ body: { reason: "No." } });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
      }),
    );
  });

  it("returns 400 when application is already rejected", async () => {
    (mockService.reject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApplicationAlreadyProcessedError("app-2"),
    );
    const req = createMockRequest({ params: { id: "app-2" } });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "APPLICATION_ALREADY_PROCESSED",
        }),
      }),
    );
  });

  it("returns 400 when application is already approved", async () => {
    (mockService.reject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApplicationAlreadyProcessedError("app-3"),
    );
    const req = createMockRequest({ params: { id: "app-3" } });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "APPLICATION_ALREADY_PROCESSED",
        }),
      }),
    );
  });

  it("returns 404 when application does not exist", async () => {
    (mockService.reject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApplicationNotFoundError("nonexistent"),
    );
    const req = createMockRequest({ params: { id: "nonexistent" } });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "NOT_FOUND" }),
      }),
    );
  });

  it("returns 400 when user sub is missing from token", async () => {
    const req = createMockRequest({ user: null });
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "User ID not found in token",
        }),
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    (mockService.reject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unexpected"),
    );
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
      }),
    );
  });

  it("passes correct arguments to service.reject()", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.handleReject(req, res);

    expect(mockService.reject).toHaveBeenCalledWith(
      "app-1",
      "Does not meet requirements for accreditation.",
      "sa-uuid-1",
    );
  });
});
