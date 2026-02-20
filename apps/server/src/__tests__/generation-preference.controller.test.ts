import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { GenerationPreferences, AutomationLevel } from "@journey-os/types";
import { DEFAULT_GENERATION_PREFERENCES } from "@journey-os/types";
import { GenerationPreferenceController } from "../controllers/user/generation-preference.controller";
import {
  GenerationPreferenceService,
  computeEffectiveLevel,
} from "../services/user/generation-preference.service";
import { PreferenceValidationError } from "../errors";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  id: "user-uuid-001",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-uuid-1",
};

const CUSTOM_PREFS: GenerationPreferences = {
  automation_level: "manual",
  pause_before_critic: true,
  difficulty_distribution: { easy: 20, medium: 40, hard: 40 },
  bloom_focus: [3, 4, 5, 6],
};

// ─── Mock helpers ──────────────────────────────────────────────────────

function createMockReqRes(overrides?: {
  body?: Record<string, unknown>;
  user?: Record<string, unknown> | null;
}): { req: Request; res: Response } {
  const reqObj: Record<string, unknown> = {
    body: overrides?.body ?? {},
    query: {},
    params: {},
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

function getResponseBody(res: Response): {
  statusCode: number;
  body: unknown;
} {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]!;
  const jsonFn = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value
    .json;
  const body = jsonFn.mock.calls[0]?.[0];
  return { statusCode: statusCall[0] as number, body };
}

// ─── Supabase mock ────────────────────────────────────────────────────

const {
  mockMaybeSingle,
  mockUpsertSelect,
  mockUpdateSelect,
  mockProfileMaybeSingle,
  mockInstMaybeSingle,
  createMockSupabase,
} = vi.hoisted(() => {
  // user_preferences read chain
  const mockMaybeSingle = vi.fn();
  const mockEqRead = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockSelectRead = vi.fn().mockReturnValue({ eq: mockEqRead });

  // user_preferences upsert chain
  const mockUpsertSingle = vi.fn();
  const mockUpsertSelectFn = vi
    .fn()
    .mockReturnValue({ single: mockUpsertSingle });
  const mockUpsertSelect = mockUpsertSingle;
  const mockUpsert = vi.fn().mockReturnValue({ select: mockUpsertSelectFn });

  // user_preferences update chain
  const mockUpdateSingle = vi.fn();
  const mockUpdateSelectFn = vi
    .fn()
    .mockReturnValue({ single: mockUpdateSingle });
  const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelectFn });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
  const mockUpdateSelect = mockUpdateSingle;

  // profiles read chain (for institution_id lookup)
  const mockProfileMaybeSingle = vi.fn();
  const mockProfileEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: mockProfileMaybeSingle });
  const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

  // institutions read chain
  const mockInstMaybeSingle = vi.fn();
  const mockInstEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: mockInstMaybeSingle });
  const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "user_preferences") {
      return {
        select: mockSelectRead,
        upsert: mockUpsert,
        update: mockUpdate,
      };
    }
    if (table === "profiles") {
      return { select: mockProfileSelect };
    }
    if (table === "institutions") {
      return { select: mockInstSelect };
    }
    return {};
  });

  const createMockSupabase = () => ({ from: mockFrom });

  return {
    mockMaybeSingle,
    mockUpsertSelect,
    mockUpdateSelect,
    mockProfileMaybeSingle,
    mockInstMaybeSingle,
    createMockSupabase,
  };
});

// ─── Test setup ───────────────────────────────────────────────────────

let controller: GenerationPreferenceController;

beforeEach(() => {
  vi.clearAllMocks();

  const supabase = createMockSupabase();
  const service = new GenerationPreferenceService(
    supabase as unknown as ConstructorParameters<
      typeof GenerationPreferenceService
    >[0],
  );
  controller = new GenerationPreferenceController(service);

  // Default: profile exists with institution
  mockProfileMaybeSingle.mockResolvedValue({
    data: { institution_id: "inst-uuid-1" },
    error: null,
  });

  // Default: no institution override
  mockInstMaybeSingle.mockResolvedValue({
    data: { settings: {} },
    error: null,
  });
});

// ─── computeEffectiveLevel (pure function) ───────────────────────────

describe("computeEffectiveLevel", () => {
  it("returns user level when no institution override", () => {
    expect(computeEffectiveLevel("full_auto", null)).toBe("full_auto");
    expect(computeEffectiveLevel("manual", null)).toBe("manual");
  });

  it("returns institution level when stricter than user", () => {
    expect(computeEffectiveLevel("full_auto", "checkpoints")).toBe(
      "checkpoints",
    );
    expect(computeEffectiveLevel("full_auto", "manual")).toBe("manual");
    expect(computeEffectiveLevel("checkpoints", "manual")).toBe("manual");
  });

  it("returns user level when stricter than institution", () => {
    expect(computeEffectiveLevel("manual", "checkpoints")).toBe("manual");
    expect(computeEffectiveLevel("manual", "full_auto")).toBe("manual");
    expect(computeEffectiveLevel("checkpoints", "full_auto")).toBe(
      "checkpoints",
    );
  });
});

// ─── GenerationPreferenceService validation ──────────────────────────

describe("GenerationPreferenceService validation", () => {
  it("accepts difficulty distribution summing to 100", async () => {
    // Setup: existing row with defaults
    mockMaybeSingle.mockResolvedValue({
      data: { generation_preferences: DEFAULT_GENERATION_PREFERENCES },
      error: null,
    });
    mockUpdateSelect.mockResolvedValue({
      data: {
        generation_preferences: {
          ...DEFAULT_GENERATION_PREFERENCES,
          difficulty_distribution: { easy: 20, medium: 50, hard: 30 },
        },
      },
      error: null,
    });
    mockInstMaybeSingle.mockResolvedValue({
      data: { settings: {} },
      error: null,
    });

    const { req, res } = createMockReqRes({
      body: { difficulty_distribution: { easy: 20, medium: 50, hard: 30 } },
    });
    await controller.handleUpdate(req, res);
    const { statusCode } = getResponseBody(res);
    expect(statusCode).toBe(200);
  });

  it("rejects difficulty distribution not summing to 100", async () => {
    const { req, res } = createMockReqRes({
      body: { difficulty_distribution: { easy: 30, medium: 30, hard: 30 } },
    });
    await controller.handleUpdate(req, res);
    const { statusCode, body } = getResponseBody(res);
    expect(statusCode).toBe(400);
    expect((body as { error: { code: string } }).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });
});

// ─── GenerationPreferenceController ──────────────────────────────────

describe("GenerationPreferenceController", () => {
  describe("getPreferences", () => {
    it("returns default preferences when no generation_preferences exist", async () => {
      // No row
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      // Upsert creates defaults
      mockUpsertSelect.mockResolvedValue({
        data: { generation_preferences: DEFAULT_GENERATION_PREFERENCES },
        error: null,
      });

      const { req, res } = createMockReqRes();
      await controller.handleGet(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(200);
      const data = (body as { data: { preferences: GenerationPreferences } })
        .data;
      expect(data.preferences).toEqual(DEFAULT_GENERATION_PREFERENCES);
    });

    it("returns stored preferences with effective level computed", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { generation_preferences: CUSTOM_PREFS },
        error: null,
      });

      const { req, res } = createMockReqRes();
      await controller.handleGet(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(200);
      const data = (
        body as {
          data: {
            preferences: GenerationPreferences;
            effective_automation_level: AutomationLevel;
          };
        }
      ).data;
      expect(data.preferences).toEqual(CUSTOM_PREFS);
      expect(data.effective_automation_level).toBe("manual");
    });

    it("computes effective level as max(institution, user)", async () => {
      // User selects full_auto, institution requires checkpoints
      mockMaybeSingle.mockResolvedValue({
        data: {
          generation_preferences: {
            ...DEFAULT_GENERATION_PREFERENCES,
            automation_level: "full_auto",
          },
        },
        error: null,
      });
      mockInstMaybeSingle.mockResolvedValue({
        data: { settings: { min_automation_level: "checkpoints" } },
        error: null,
      });

      const { req, res } = createMockReqRes();
      await controller.handleGet(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(200);
      const data = (
        body as {
          data: {
            preferences: GenerationPreferences;
            institution_minimum: AutomationLevel;
            effective_automation_level: AutomationLevel;
          };
        }
      ).data;
      expect(data.preferences.automation_level).toBe("full_auto");
      expect(data.institution_minimum).toBe("checkpoints");
      expect(data.effective_automation_level).toBe("checkpoints");
    });

    it("returns 401 when not authenticated", async () => {
      const { req, res } = createMockReqRes({ user: null });
      await controller.handleGet(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(401);
      expect((body as { error: { code: string } }).error.code).toBe(
        "AUTHENTICATION_ERROR",
      );
    });
  });

  describe("updatePreferences", () => {
    it("updates automation level and returns new effective level", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { generation_preferences: DEFAULT_GENERATION_PREFERENCES },
        error: null,
      });
      mockUpdateSelect.mockResolvedValue({
        data: {
          generation_preferences: {
            ...DEFAULT_GENERATION_PREFERENCES,
            automation_level: "manual",
          },
        },
        error: null,
      });

      const { req, res } = createMockReqRes({
        body: { automation_level: "manual" },
      });
      await controller.handleUpdate(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(200);
      const data = (
        body as {
          data: {
            preferences: GenerationPreferences;
            effective_automation_level: AutomationLevel;
          };
        }
      ).data;
      expect(data.preferences.automation_level).toBe("manual");
      expect(data.effective_automation_level).toBe("manual");
    });

    it("rejects invalid automation level string", async () => {
      const { req, res } = createMockReqRes({
        body: { automation_level: "turbo" },
      });
      await controller.handleUpdate(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
      expect((body as { error: { message: string } }).error.message).toContain(
        "turbo",
      );
    });

    it("rejects difficulty distribution not summing to 100", async () => {
      const { req, res } = createMockReqRes({
        body: {
          difficulty_distribution: { easy: 30, medium: 30, hard: 30 },
        },
      });
      await controller.handleUpdate(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
      expect((body as { error: { message: string } }).error.message).toContain(
        "sum to 100",
      );
    });

    it("rejects bloom levels outside 1-6 range", async () => {
      const { req, res } = createMockReqRes({
        body: { bloom_focus: [0, 7, 8] },
      });
      await controller.handleUpdate(req, res);
      const { statusCode, body } = getResponseBody(res);

      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });
});
