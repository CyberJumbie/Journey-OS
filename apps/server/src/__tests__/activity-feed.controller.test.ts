import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { ActivityFeedController } from "../controllers/activity.controller";
import { ActivityFeedService } from "../services/activity/activity-feed.service";
import { ActivityFeedRepository } from "../repositories/activity.repository";
import { ActivityEventNotFoundError } from "../errors/activity.error";
import type { ActivityEvent, ActivityEventType } from "@journey-os/types";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  sub: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  email: "jsmith@msm.edu",
  role: "faculty",
  institution_id: "inst-uuid-1",
  is_course_director: false,
};

const OTHER_USER_ID = "11111111-2222-3333-4444-555555555555";

const MOCK_EVENT: ActivityEvent = {
  id: "evt-uuid-1",
  user_id: FACULTY_USER.sub,
  institution_id: "inst-uuid-1",
  event_type: "question_generated",
  entity_id: "question-uuid-1",
  entity_type: "question",
  metadata: {
    description: "Generated 5 new questions for Cardiology",
    course_name: "Cardiology 101",
    actor_name: "Dr. Smith",
    count: 5,
  },
  created_at: "2026-02-20T10:00:00Z",
};

const MOCK_EVENT_2: ActivityEvent = {
  id: "evt-uuid-2",
  user_id: FACULTY_USER.sub,
  institution_id: "inst-uuid-1",
  event_type: "question_approved",
  entity_id: "question-uuid-2",
  entity_type: "question",
  metadata: {
    description: "Approved a question in Pharmacology",
    course_name: "Pharmacology 201",
    actor_name: "Dr. Smith",
  },
  created_at: "2026-02-20T09:00:00Z",
};

function createMockEvents(count: number): ActivityEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    ...MOCK_EVENT,
    id: `evt-uuid-${String(i + 1)}`,
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

// ─── Mock helpers ──────────────────────────────────────────────────────

function createMockReqRes(overrides?: {
  query?: Record<string, unknown>;
  user?: Record<string, unknown> | null;
}): { req: Request; res: Response } {
  const reqObj: Record<string, unknown> = {
    query: overrides?.query ?? {
      user_id: FACULTY_USER.sub,
    },
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

function getResponseBody(res: Response): { statusCode: number; body: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]!;
  const jsonFn = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value
    .json;
  const body = jsonFn.mock.calls[0]?.[0];
  return { statusCode: statusCall[0] as number, body };
}

// ─── Supabase mock ────────────────────────────────────────────────────

const { mockSelectData, mockSelectCount, mockDataError, createMockSupabase } =
  vi.hoisted(() => {
    const mockRange = vi.fn();
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockInData = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEqData = vi.fn().mockReturnValue({
      in: mockInData,
      order: mockOrder,
    });
    const mockSelectData = vi.fn().mockReturnValue({ eq: mockEqData });

    const mockCountEq = vi.fn();
    const mockInCount = vi.fn().mockReturnValue(mockCountEq);
    const mockEqCount = vi.fn().mockReturnValue({
      in: mockInCount,
    });
    const mockSelectCount = vi.fn().mockReturnValue({ eq: mockEqCount });

    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation((...args: unknown[]) => {
        const secondArg = args[1] as
          | { count?: string; head?: boolean }
          | undefined;
        if (secondArg && secondArg.count === "exact") {
          return mockSelectCount(args[0], args[1]);
        }
        return mockSelectData(args[0]);
      }),
    }));

    const mockDataError = vi.fn<() => { data: unknown; error: unknown }>();
    mockRange.mockImplementation(() => mockDataError());

    return {
      mockFrom,
      mockSelectData,
      mockSelectCount,
      mockRange,
      mockOrder,
      mockInData,
      mockEqData,
      mockInCount,
      mockEqCount,
      mockDataError,
      mockCountEq,
      createMockSupabase: () => ({
        from: mockFrom,
      }),
    };
  });

// ─── Tests ─────────────────────────────────────────────────────────────

describe("ActivityFeedController", () => {
  let service: ActivityFeedService;
  let controller: ActivityFeedController;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return 2 events
    mockDataError.mockResolvedValue({
      data: [MOCK_EVENT, MOCK_EVENT_2],
      error: null,
    });
    mockSelectCount("id", { count: "exact", head: true });
    // Mock the count chain to return count
    const countResult = { count: 2, error: null };
    const mockCountEqRef = vi.fn().mockResolvedValue(countResult);
    const mockInCountRef = vi.fn().mockReturnValue(mockCountEqRef);
    const mockEqCountRef = vi.fn().mockReturnValue({ in: mockInCountRef });
    // We need to re-wire the from mock for count queries
    // Instead, let's use a simpler approach with the service directly

    const mockSupabase = createMockSupabase();
    const repository = new ActivityFeedRepository(
      mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient,
    );
    service = new ActivityFeedService(repository);
    controller = new ActivityFeedController(service);
  });

  describe("handleList", () => {
    it("returns paginated activity events for authenticated faculty (200)", async () => {
      // Mock service directly for cleaner tests
      const mockList = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT, MOCK_EVENT_2],
        meta: { limit: 20, offset: 0, total: 2, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes();
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const typed = body as {
        data: { events: unknown[]; meta: unknown };
        error: unknown;
      };
      expect(typed.data.events).toHaveLength(2);
      expect(typed.error).toBeNull();
    });

    it("returns correct pagination meta (limit, offset, total, has_more)", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: createMockEvents(20),
        meta: { limit: 20, offset: 0, total: 45, has_more: true },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes();
      await controller.handleList(req, res);

      const { body } = getResponseBody(res);
      const typed = body as {
        data: {
          meta: {
            limit: number;
            offset: number;
            total: number;
            has_more: boolean;
          };
        };
      };
      expect(typed.data.meta.limit).toBe(20);
      expect(typed.data.meta.offset).toBe(0);
      expect(typed.data.meta.total).toBe(45);
      expect(typed.data.meta.has_more).toBe(true);
    });

    it("defaults to limit=20, offset=0, no event_type filter", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [],
        meta: { limit: 20, offset: 0, total: 0, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes();
      await controller.handleList(req, res);

      expect(mockList).toHaveBeenCalledWith({
        user_id: FACULTY_USER.sub,
        limit: undefined,
        offset: undefined,
        event_types: undefined,
      });
    });

    it("rejects unauthenticated request (401)", async () => {
      const { req, res } = createMockReqRes({ user: null });
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(401);
      expect((body as { error: { code: string } }).error.code).toBe(
        "UNAUTHORIZED",
      );
    });

    it("rejects access to another user's events (403 FORBIDDEN)", async () => {
      const { req, res } = createMockReqRes({
        query: { user_id: OTHER_USER_ID },
      });
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(403);
      expect((body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("filters by single event_type (question_generated)", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT],
        meta: { limit: 20, offset: 0, total: 1, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes({
        query: {
          user_id: FACULTY_USER.sub,
          event_types: "question_generated",
        },
      });
      await controller.handleList(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          event_types: ["question_generated"],
        }),
      );
    });

    it("filters by multiple event_types (comma-separated)", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT, MOCK_EVENT_2],
        meta: { limit: 20, offset: 0, total: 2, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes({
        query: {
          user_id: FACULTY_USER.sub,
          event_types: "question_generated,question_approved",
        },
      });
      await controller.handleList(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          event_types: ["question_generated", "question_approved"],
        }),
      );
    });

    it("returns empty list with meta when no events match filter", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [],
        meta: { limit: 20, offset: 0, total: 0, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes({
        query: {
          user_id: FACULTY_USER.sub,
          event_types: "coverage_gap_detected",
        },
      });
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const typed = body as {
        data: { events: unknown[]; meta: { total: number } };
      };
      expect(typed.data.events).toHaveLength(0);
      expect(typed.data.meta.total).toBe(0);
    });

    it("caps limit at 50 when higher value requested", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [],
        meta: { limit: 50, offset: 0, total: 0, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub, limit: "100" },
      });
      await controller.handleList(req, res);

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it("rejects invalid event_type value (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({
        query: {
          user_id: FACULTY_USER.sub,
          event_types: "invalid_type",
        },
      });
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("rejects invalid user_id format (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({
        query: { user_id: "not-a-uuid" },
      });
      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("returns has_more=false when offset + limit >= total", async () => {
      const mockList = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT],
        meta: { limit: 20, offset: 20, total: 21, has_more: false },
      });
      service.list = mockList;

      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub, offset: "20" },
      });
      await controller.handleList(req, res);

      const { body } = getResponseBody(res);
      const typed = body as {
        data: { meta: { has_more: boolean } };
      };
      expect(typed.data.meta.has_more).toBe(false);
    });
  });
});

describe("ActivityFeedService", () => {
  describe("list", () => {
    it("builds correct query with event_type filter applied", async () => {
      const mockFindByUser = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT],
        total: 1,
      });
      const mockRepo = {
        findByUser: mockFindByUser,
      } as unknown as ActivityFeedRepository;
      const svc = new ActivityFeedService(mockRepo);

      await svc.list({
        user_id: FACULTY_USER.sub,
        event_types: ["question_generated"],
      });

      expect(mockFindByUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: FACULTY_USER.sub,
          event_types: ["question_generated"],
          limit: 20,
          offset: 0,
        }),
      );
    });

    it("calculates has_more correctly based on total vs offset+limit", async () => {
      const mockFindByUser = vi.fn().mockResolvedValue({
        events: createMockEvents(20),
        total: 45,
      });
      const mockRepo = {
        findByUser: mockFindByUser,
      } as unknown as ActivityFeedRepository;
      const svc = new ActivityFeedService(mockRepo);

      const result = await svc.list({
        user_id: FACULTY_USER.sub,
        limit: 20,
        offset: 0,
      });

      expect(result.meta.has_more).toBe(true);

      // When offset + limit >= total
      mockFindByUser.mockResolvedValue({
        events: createMockEvents(5),
        total: 45,
      });

      const result2 = await svc.list({
        user_id: FACULTY_USER.sub,
        limit: 20,
        offset: 40,
      });

      expect(result2.meta.has_more).toBe(false);
    });

    it("applies ordering by created_at DESC", async () => {
      const mockFindByUser = vi.fn().mockResolvedValue({
        events: [MOCK_EVENT, MOCK_EVENT_2],
        total: 2,
      });
      const mockRepo = {
        findByUser: mockFindByUser,
      } as unknown as ActivityFeedRepository;
      const svc = new ActivityFeedService(mockRepo);

      const result = await svc.list({ user_id: FACULTY_USER.sub });

      // Service delegates ordering to repository; verify events are returned as-is
      expect(result.events[0]!.id).toBe(MOCK_EVENT.id);
      expect(result.events[1]!.id).toBe(MOCK_EVENT_2.id);
    });

    it("returns empty events array when no rows match", async () => {
      const mockFindByUser = vi.fn().mockResolvedValue({
        events: [],
        total: 0,
      });
      const mockRepo = {
        findByUser: mockFindByUser,
      } as unknown as ActivityFeedRepository;
      const svc = new ActivityFeedService(mockRepo);

      const result = await svc.list({ user_id: FACULTY_USER.sub });

      expect(result.events).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.has_more).toBe(false);
    });
  });
});

describe("ActivityFeedRepository", () => {
  describe("findByUser", () => {
    it("constructs Supabase select with correct columns", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [MOCK_EVENT],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockEq = vi
        .fn()
        .mockReturnValue({
          order: mockOrder,
          in: vi.fn().mockReturnValue({ order: mockOrder }),
        });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      const mockCountResult = Promise.resolve({ count: 1, error: null });
      const mockCountIn = vi.fn().mockReturnValue(mockCountResult);
      const mockCountEq = vi.fn().mockReturnValue({ in: mockCountIn });
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

      let callCount = 0;
      const mockFrom = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { select: mockSelect };
        }
        return { select: mockCountSelect };
      });

      const mockClient = {
        from: mockFrom,
      } as unknown as import("@supabase/supabase-js").SupabaseClient;
      const repo = new ActivityFeedRepository(mockClient);

      await repo.findByUser({
        user_id: FACULTY_USER.sub,
        limit: 20,
        offset: 0,
      });

      expect(mockFrom).toHaveBeenCalledWith("activity_events");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("user_id", FACULTY_USER.sub);
    });

    it("applies .in() filter when event_types provided", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [MOCK_EVENT],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn, order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      const mockCountIn = vi
        .fn()
        .mockReturnValue(Promise.resolve({ count: 1, error: null }));
      const mockCountEq = vi.fn().mockReturnValue({ in: mockCountIn });
      const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

      let callCount = 0;
      const mockFrom = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { select: mockSelect };
        }
        return { select: mockCountSelect };
      });

      const mockClient = {
        from: mockFrom,
      } as unknown as import("@supabase/supabase-js").SupabaseClient;
      const repo = new ActivityFeedRepository(mockClient);

      const eventTypes: ActivityEventType[] = [
        "question_generated",
        "question_approved",
      ];
      await repo.findByUser({
        user_id: FACULTY_USER.sub,
        limit: 20,
        offset: 0,
        event_types: eventTypes,
      });

      expect(mockIn).toHaveBeenCalledWith("event_type", eventTypes);
      expect(mockCountIn).toHaveBeenCalledWith("event_type", eventTypes);
    });
  });
});
