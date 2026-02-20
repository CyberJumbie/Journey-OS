import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { NotificationController } from "../notification.controller";
import type { NotificationService } from "../../../services/notification/notification.service";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
  InvalidNotificationTypeError,
} from "../../../errors";
import type { Notification } from "@journey-os/types";

const MOCK_NOTIFICATION: Notification = {
  id: "notif-uuid-1",
  user_id: "user-uuid-1",
  type: "system",
  title: "Welcome",
  body: "Welcome to Journey OS",
  action_url: null,
  action_label: null,
  is_read: false,
  read_at: null,
  created_at: "2026-02-20T10:00:00Z",
  institution_id: null,
  metadata: null,
};

function createMockService(): NotificationService {
  return {
    create: vi.fn().mockResolvedValue(MOCK_NOTIFICATION),
    createBatch: vi.fn().mockResolvedValue([MOCK_NOTIFICATION]),
    findByUserId: vi.fn().mockResolvedValue({
      notifications: [MOCK_NOTIFICATION],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    getUnreadCount: vi.fn().mockResolvedValue(3),
    markAsRead: vi
      .fn()
      .mockResolvedValue({ ...MOCK_NOTIFICATION, is_read: true }),
    markAllAsRead: vi.fn().mockResolvedValue(5),
    deleteOld: vi.fn().mockResolvedValue(10),
  } as unknown as NotificationService;
}

function createMockReqRes(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: { id: string } | null;
}): { req: Request; res: Response } {
  const req = {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    user:
      overrides.user === null
        ? undefined
        : (overrides.user ?? { id: "user-uuid-1" }),
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

describe("NotificationController", () => {
  let svc: NotificationService;
  let controller: NotificationController;

  beforeEach(() => {
    svc = createMockService();
    controller = new NotificationController(svc);
  });

  describe("handleList", () => {
    it("returns paginated notifications for authenticated user", async () => {
      const { req, res } = createMockReqRes({});

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
        .value.json.mock.calls[0]![0];
      expect(body.data.notifications).toHaveLength(1);
      expect(body.error).toBeNull();
    });

    it("returns 401 when user is not authenticated", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("passes query parameters to service", async () => {
      const { req, res } = createMockReqRes({
        query: { page: "2", limit: "10", unread_only: "true", type: "course" },
      });

      await controller.handleList(req, res);

      expect(svc.findByUserId).toHaveBeenCalledWith("user-uuid-1", {
        page: 2,
        limit: 10,
        unread_only: true,
        type: "course",
      });
    });
  });

  describe("handleUnreadCount", () => {
    it("returns unread count for authenticated user", async () => {
      const { req, res } = createMockReqRes({});

      await controller.handleUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
        .value.json.mock.calls[0]![0];
      expect(body.data.count).toBe(3);
    });

    it("returns 401 when user is not authenticated", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("handleMarkAsRead", () => {
    it("marks notification as read and returns 200", async () => {
      const { req, res } = createMockReqRes({
        params: { id: "notif-uuid-1" },
      });

      await controller.handleMarkAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.markAsRead).toHaveBeenCalledWith(
        "notif-uuid-1",
        "user-uuid-1",
      );
    });

    it("returns 404 when notification not found", async () => {
      vi.mocked(svc.markAsRead).mockRejectedValue(
        new NotificationNotFoundError("notif-uuid-1"),
      );
      const { req, res } = createMockReqRes({
        params: { id: "notif-uuid-1" },
      });

      await controller.handleMarkAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own notification", async () => {
      vi.mocked(svc.markAsRead).mockRejectedValue(
        new NotificationForbiddenError("notif-uuid-1"),
      );
      const { req, res } = createMockReqRes({
        params: { id: "notif-uuid-1" },
      });

      await controller.handleMarkAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 401 when user is not authenticated", async () => {
      const { req, res } = createMockReqRes({
        params: { id: "notif-uuid-1" },
        user: null,
      });

      await controller.handleMarkAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 500 for unexpected errors", async () => {
      vi.mocked(svc.markAsRead).mockRejectedValue(new Error("DB exploded"));
      const { req, res } = createMockReqRes({
        params: { id: "notif-uuid-1" },
      });

      await controller.handleMarkAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
        .value.json.mock.calls[0]![0];
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("handleMarkAllAsRead", () => {
    it("marks all as read and returns updated count", async () => {
      const { req, res } = createMockReqRes({});

      await controller.handleMarkAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
        .value.json.mock.calls[0]![0];
      expect(body.data.updated_count).toBe(5);
    });

    it("returns 401 when user is not authenticated", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleMarkAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
