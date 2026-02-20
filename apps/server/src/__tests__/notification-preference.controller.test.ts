import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { NotificationPreferenceController } from "../controllers/user/notification-preference.controller";
import { NotificationPreferenceService } from "../services/user/notification-preference.service";
import { PreferenceValidationError } from "../errors";
import type { NotificationPreferenceMatrix } from "@journey-os/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@journey-os/types";

// ─── Fixtures ────────────────────────────────────────────────────

const MOCK_USER_ID = "user-uuid-001";

const DEFAULT_PREFS: NotificationPreferenceMatrix =
  DEFAULT_NOTIFICATION_PREFERENCES;

const CUSTOM_PREFS: NotificationPreferenceMatrix = {
  batch_complete: { in_app: true, email: true },
  review_request: { in_app: true, email: true },
  review_decision: { in_app: true, email: false },
  gap_scan: { in_app: false, email: false },
  lint_alert: { in_app: true, email: false },
  system: { in_app: true, email: false },
};

// ─── Mock Helpers ────────────────────────────────────────────────

function createMockReqRes(overrides: {
  body?: Record<string, unknown>;
  user?: { id: string } | null;
}): { req: Request; res: Response; json: ReturnType<typeof vi.fn> } {
  const req = {
    body: overrides.body ?? {},
    params: {},
    query: {},
    user:
      overrides.user === null
        ? undefined
        : (overrides.user ?? { id: MOCK_USER_ID }),
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res, json };
}

// ─── Supabase Mock ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

function createMockSupabase() {
  return { from: mockFrom } as unknown as Parameters<
    typeof NotificationPreferenceService extends new (s: infer S) => unknown
      ? () => S
      : never
  >;
}

function mockSelectReturning(data: unknown) {
  const single = vi.fn().mockResolvedValue({ data, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const select = vi.fn().mockReturnValue({ single, maybeSingle });
  const eq = vi.fn().mockReturnValue({ maybeSingle, select });
  const upsert = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });

  // Chain: from().select().eq().maybeSingle()
  // Chain: from().upsert().select().single()
  // Chain: from().update().eq().select().single()
  mockFrom.mockReturnValue({ select, upsert, update, eq });

  return { select, upsert, update, eq, single, maybeSingle };
}

// ─── Controller Tests ───────────────────────────────────────────

describe("NotificationPreferenceController", () => {
  describe("handleGet", () => {
    it("creates default preferences row if none exists and returns defaults (200)", async () => {
      // First query: maybeSingle returns null (no row)
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const selectEq = vi.fn().mockReturnValue({ maybeSingle });
      const selectFirst = vi.fn().mockReturnValue({ eq: selectEq });

      // Second query (upsert): returns defaults
      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const selectSecond = vi.fn().mockReturnValue({ single });
      const upsert = vi.fn().mockReturnValue({ select: selectSecond });

      mockFrom
        .mockReturnValueOnce({ select: selectFirst })
        .mockReturnValueOnce({ upsert });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({});

      await controller.handleGet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(
        (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value.json,
      ).toHaveBeenCalledWith({
        data: { preferences: DEFAULT_PREFS },
        error: null,
      });
    });

    it("returns existing preferences when row exists (200)", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { notification_preferences: CUSTOM_PREFS },
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({});

      await controller.handleGet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(
        (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value.json,
      ).toHaveBeenCalledWith({
        data: { preferences: CUSTOM_PREFS },
        error: null,
      });
    });

    it("returns 401 when not authenticated", async () => {
      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleGet(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("handleUpdate", () => {
    it("merges partial update into existing preferences (200)", async () => {
      const merged: NotificationPreferenceMatrix = {
        ...DEFAULT_PREFS,
        batch_complete: { in_app: true, email: true },
        gap_scan: { in_app: false, email: false },
      };

      // First call: getForUser returns existing prefs
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const selectEq = vi.fn().mockReturnValue({ maybeSingle });
      const selectFirst = vi.fn().mockReturnValue({ eq: selectEq });

      // Second call: update returns merged
      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: merged },
        error: null,
      });
      const selectSecond = vi.fn().mockReturnValue({ single });
      const updateEq = vi.fn().mockReturnValue({ select: selectSecond });
      const update = vi.fn().mockReturnValue({ eq: updateEq });

      mockFrom
        .mockReturnValueOnce({ select: selectFirst })
        .mockReturnValueOnce({ update });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({
        body: {
          preferences: {
            batch_complete: { email: true },
            gap_scan: { in_app: false },
          },
        },
      });

      await controller.handleUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects unknown notification type (400 VALIDATION_ERROR)", async () => {
      mockSelectReturning({ notification_preferences: DEFAULT_PREFS });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({
        body: {
          preferences: {
            unknown_type: { in_app: true, email: false },
          },
        },
      });

      await controller.handleUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(
        (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value.json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("rejects non-boolean channel values (400 VALIDATION_ERROR)", async () => {
      mockSelectReturning({ notification_preferences: DEFAULT_PREFS });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({
        body: {
          preferences: {
            batch_complete: { in_app: "yes" },
          },
        },
      });

      await controller.handleUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates preferences row with merged defaults if none exists (200)", async () => {
      const merged: NotificationPreferenceMatrix = {
        ...DEFAULT_PREFS,
        batch_complete: { in_app: true, email: true },
      };

      // First call: getForUser — maybeSingle returns null
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const selectEq = vi.fn().mockReturnValue({ maybeSingle });
      const selectFirst = vi.fn().mockReturnValue({ eq: selectEq });

      // Second call: upsert (from getForUser creating defaults)
      const singleUpsert = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const selectUpsert = vi.fn().mockReturnValue({ single: singleUpsert });
      const upsert = vi.fn().mockReturnValue({ select: selectUpsert });

      // Third call: update with merged
      const singleUpdate = vi.fn().mockResolvedValue({
        data: { notification_preferences: merged },
        error: null,
      });
      const selectUpdate = vi.fn().mockReturnValue({ single: singleUpdate });
      const updateEq = vi.fn().mockReturnValue({ select: selectUpdate });
      const update = vi.fn().mockReturnValue({ eq: updateEq });

      mockFrom
        .mockReturnValueOnce({ select: selectFirst })
        .mockReturnValueOnce({ upsert })
        .mockReturnValueOnce({ update });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({
        body: {
          preferences: { batch_complete: { email: true } },
        },
      });

      await controller.handleUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("handleReset", () => {
    it("resets all preferences to defaults (200)", async () => {
      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const select = vi.fn().mockReturnValue({ single });
      const upsert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ upsert });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({});

      await controller.handleReset(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(
        (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value.json,
      ).toHaveBeenCalledWith({
        data: { preferences: DEFAULT_PREFS },
        error: null,
      });
    });

    it("returns defaults even if no row existed (200)", async () => {
      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const select = vi.fn().mockReturnValue({ single });
      const upsert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ upsert });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const controller = new NotificationPreferenceController(service);
      const { req, res } = createMockReqRes({});

      await controller.handleReset(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(upsert).toHaveBeenCalled();
    });
  });
});

// ─── Service Unit Tests ─────────────────────────────────────────

describe("NotificationPreferenceService", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  describe("getForUser", () => {
    it("returns defaults when no row exists", async () => {
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });

      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const selectUpsert = vi.fn().mockReturnValue({ single });
      const upsert = vi.fn().mockReturnValue({ select: selectUpsert });

      mockFrom.mockReturnValueOnce({ select }).mockReturnValueOnce({ upsert });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const result = await service.getForUser(MOCK_USER_ID);

      expect(result).toEqual(DEFAULT_PREFS);
      expect(upsert).toHaveBeenCalled();
    });

    it("returns stored preferences when row exists", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { notification_preferences: CUSTOM_PREFS },
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ select });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const result = await service.getForUser(MOCK_USER_ID);

      expect(result).toEqual(CUSTOM_PREFS);
    });
  });

  describe("updateForUser", () => {
    it("deep-merges partial update with existing preferences", async () => {
      // getForUser returns existing
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { notification_preferences: DEFAULT_PREFS },
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const selectGet = vi.fn().mockReturnValue({ eq });

      const expected: NotificationPreferenceMatrix = {
        ...DEFAULT_PREFS,
        batch_complete: { in_app: true, email: true },
      };

      const single = vi.fn().mockResolvedValue({
        data: { notification_preferences: expected },
        error: null,
      });
      const selectUpdate = vi.fn().mockReturnValue({ single });
      const updateEq = vi.fn().mockReturnValue({ select: selectUpdate });
      const update = vi.fn().mockReturnValue({ eq: updateEq });

      mockFrom
        .mockReturnValueOnce({ select: selectGet })
        .mockReturnValueOnce({ update });

      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);
      const result = await service.updateForUser(MOCK_USER_ID, {
        preferences: { batch_complete: { email: true } },
      });

      expect(result).toEqual(expected);
    });

    it("validates notification type names", async () => {
      const service = new NotificationPreferenceService({
        from: mockFrom,
      } as never);

      await expect(
        service.updateForUser(MOCK_USER_ID, {
          preferences: {
            unknown_type: { in_app: true },
          } as never,
        }),
      ).rejects.toThrow(PreferenceValidationError);
    });
  });
});
