import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionLifecycleController } from "../institution-lifecycle.controller";
import { InstitutionLifecycleService } from "../../../services/admin/institution-lifecycle.service";
import {
  InstitutionAlreadySuspendedError,
  InstitutionNotSuspendedError,
  SuspendReasonRequiredError,
} from "../../../errors/institution-lifecycle.error";
import { InstitutionNotFoundError } from "../../../errors/registration.error";
import type { Request, Response } from "express";
import type { InstitutionStatusChangeResult } from "@journey-os/types";

function createMockRes(): {
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

function createMockReq(overrides: {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { sub: string; role: string };
}): unknown {
  return {
    params: overrides.params ?? { id: "inst-1" },
    body: overrides.body ?? {},
    user: overrides.user ?? { sub: "sa-uuid-1", role: "superadmin" },
  } as unknown;
}

const MOCK_SUSPEND_RESULT: InstitutionStatusChangeResult = {
  institution_id: "inst-1",
  institution_name: "Morehouse School of Medicine",
  from_status: "approved",
  to_status: "suspended",
  reason: "Policy violation: unauthorized sharing of assessment content.",
  changed_by: "sa-uuid-1",
  changed_at: "2026-02-19T14:00:00Z",
  affected_users: 450,
};

const MOCK_REACTIVATE_RESULT: InstitutionStatusChangeResult = {
  institution_id: "inst-1",
  institution_name: "Morehouse School of Medicine",
  from_status: "suspended",
  to_status: "approved",
  reason: "Compliance verified.",
  changed_by: "sa-uuid-1",
  changed_at: "2026-02-19T16:00:00Z",
  affected_users: 450,
};

describe("InstitutionLifecycleController", () => {
  let mockService: {
    suspend: ReturnType<typeof vi.fn>;
    reactivate: ReturnType<typeof vi.fn>;
  };
  let controller: InstitutionLifecycleController;

  beforeEach(() => {
    mockService = {
      suspend: vi.fn().mockResolvedValue(MOCK_SUSPEND_RESULT),
      reactivate: vi.fn().mockResolvedValue(MOCK_REACTIVATE_RESULT),
    };
    controller = new InstitutionLifecycleController(
      mockService as unknown as InstitutionLifecycleService,
    );
  });

  describe("handleSuspend", () => {
    it("suspends active institution with reason (200)", async () => {
      const req = createMockReq({
        body: {
          reason:
            "Policy violation: unauthorized sharing of assessment content.",
        },
      });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: InstitutionStatusChangeResult };
      expect(body.data.to_status).toBe("suspended");
      expect(body.data.affected_users).toBe(450);
    });

    it("returns result with from_status, to_status, affected_users", async () => {
      const req = createMockReq({
        body: { reason: "Security breach investigation." },
      });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      const body = res.body as { data: InstitutionStatusChangeResult };
      expect(body.data.institution_id).toBe("inst-1");
      expect(body.data.from_status).toBe("approved");
      expect(body.data.to_status).toBe("suspended");
      expect(body.data.changed_by).toBe("sa-uuid-1");
    });

    it("rejects missing reason (400 VALIDATION_ERROR)", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("rejects reason shorter than 10 chars (400)", async () => {
      mockService.suspend.mockRejectedValue(new SuspendReasonRequiredError());
      const req = createMockReq({ body: { reason: "Bad." } });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "SUSPEND_REASON_REQUIRED",
      );
    });

    it("rejects already-suspended institution (400)", async () => {
      mockService.suspend.mockRejectedValue(
        new InstitutionAlreadySuspendedError("inst-1"),
      );
      const req = createMockReq({
        body: { reason: "Attempting to suspend again." },
      });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INSTITUTION_ALREADY_SUSPENDED",
      );
    });

    it("returns 404 for non-existent institution", async () => {
      mockService.suspend.mockRejectedValue(
        new InstitutionNotFoundError("inst-999"),
      );
      const req = createMockReq({
        params: { id: "inst-999" },
        body: { reason: "Suspending a ghost institution." },
      });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(404);
    });

    it("returns 500 for unexpected errors", async () => {
      mockService.suspend.mockRejectedValue(new Error("DB exploded"));
      const req = createMockReq({
        body: { reason: "This will fail unexpectedly." },
      });
      const res = createMockRes();

      await controller.handleSuspend(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(500);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INTERNAL_ERROR",
      );
    });
  });

  describe("handleReactivate", () => {
    it("reactivates suspended institution (200)", async () => {
      const req = createMockReq({
        body: { reason: "Compliance verified." },
      });
      const res = createMockRes();

      await controller.handleReactivate(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: InstitutionStatusChangeResult };
      expect(body.data.from_status).toBe("suspended");
      expect(body.data.to_status).toBe("approved");
    });

    it("returns result with from_status=suspended, to_status=approved", async () => {
      const req = createMockReq({});
      const res = createMockRes();

      await controller.handleReactivate(
        req as Request,
        res as unknown as Response,
      );

      const body = res.body as { data: InstitutionStatusChangeResult };
      expect(body.data.from_status).toBe("suspended");
      expect(body.data.to_status).toBe("approved");
      expect(body.data.affected_users).toBe(450);
    });

    it("rejects non-suspended institution (400)", async () => {
      mockService.reactivate.mockRejectedValue(
        new InstitutionNotSuspendedError("inst-1"),
      );
      const req = createMockReq({});
      const res = createMockRes();

      await controller.handleReactivate(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INSTITUTION_NOT_SUSPENDED",
      );
    });

    it("returns 404 for non-existent institution", async () => {
      mockService.reactivate.mockRejectedValue(
        new InstitutionNotFoundError("inst-999"),
      );
      const req = createMockReq({ params: { id: "inst-999" } });
      const res = createMockRes();

      await controller.handleReactivate(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(404);
    });

    it("returns 500 for unexpected errors", async () => {
      mockService.reactivate.mockRejectedValue(new Error("DB failure"));
      const req = createMockReq({});
      const res = createMockRes();

      await controller.handleReactivate(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(500);
    });
  });
});
