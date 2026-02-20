import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Notification,
  CreateNotificationRequest,
  CreateBatchNotificationRequest,
} from "@journey-os/types";
import { NotificationService } from "../notification.service";
import type { NotificationRepository } from "../../../repositories/notification.repository";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
  InvalidNotificationTypeError,
} from "../../../errors";

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

const MOCK_READ_NOTIFICATION: Notification = {
  ...MOCK_NOTIFICATION,
  is_read: true,
  read_at: "2026-02-20T11:00:00Z",
};

function createMockRepository(): NotificationRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_NOTIFICATION),
    createBatch: vi.fn().mockResolvedValue([MOCK_NOTIFICATION]),
    findByUserId: vi.fn().mockResolvedValue({
      notifications: [MOCK_NOTIFICATION],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    getUnreadCount: vi.fn().mockResolvedValue(3),
    markAsRead: vi.fn().mockResolvedValue(MOCK_READ_NOTIFICATION),
    markAllAsRead: vi.fn().mockResolvedValue(5),
    findById: vi.fn().mockResolvedValue(MOCK_NOTIFICATION),
    deleteOld: vi.fn().mockResolvedValue(10),
  } as unknown as NotificationRepository;
}

describe("NotificationService", () => {
  let repo: NotificationRepository;
  let service: NotificationService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new NotificationService(repo);
  });

  describe("create", () => {
    it("creates notification and returns it", async () => {
      const request: CreateNotificationRequest = {
        user_id: "user-uuid-1",
        type: "system",
        title: "Welcome",
        body: "Welcome to Journey OS",
      };

      const result = await service.create(request);

      expect(result).toEqual(MOCK_NOTIFICATION);
      expect(repo.create).toHaveBeenCalledWith(request);
    });

    it("creates notification with metadata", async () => {
      const request: CreateNotificationRequest = {
        user_id: "user-uuid-1",
        type: "course",
        title: "New course",
        metadata: { courseId: "c-1" },
      };

      await service.create(request);

      expect(repo.create).toHaveBeenCalledWith(request);
    });

    it("throws InvalidNotificationTypeError for empty user_id", async () => {
      const request: CreateNotificationRequest = {
        user_id: "",
        type: "system",
        title: "Test",
      };

      await expect(service.create(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("throws InvalidNotificationTypeError for empty title", async () => {
      const request: CreateNotificationRequest = {
        user_id: "user-uuid-1",
        type: "system",
        title: "",
      };

      await expect(service.create(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("throws InvalidNotificationTypeError for whitespace-only title", async () => {
      const request: CreateNotificationRequest = {
        user_id: "user-uuid-1",
        type: "system",
        title: "   ",
      };

      await expect(service.create(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("throws InvalidNotificationTypeError for invalid type", async () => {
      const request = {
        user_id: "user-uuid-1",
        type: "invalid_type" as never,
        title: "Test",
      };

      await expect(service.create(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("accepts all valid notification types", async () => {
      const types = [
        "system",
        "course",
        "assessment",
        "enrollment",
        "announcement",
        "alert",
      ] as const;

      for (const type of types) {
        const request: CreateNotificationRequest = {
          user_id: "user-uuid-1",
          type,
          title: "Test",
        };
        await service.create(request);
      }

      expect(repo.create).toHaveBeenCalledTimes(types.length);
    });
  });

  describe("createBatch", () => {
    it("creates notifications for multiple users", async () => {
      const request: CreateBatchNotificationRequest = {
        user_ids: ["user-1", "user-2", "user-3"],
        type: "announcement",
        title: "System maintenance",
        body: "Scheduled downtime",
      };

      const result = await service.createBatch(request);

      expect(result).toEqual([MOCK_NOTIFICATION]);
      expect(repo.createBatch).toHaveBeenCalledWith({
        user_ids: ["user-1", "user-2", "user-3"],
        type: "announcement",
        title: "System maintenance",
        body: "Scheduled downtime",
        action_url: undefined,
        action_label: undefined,
        institution_id: undefined,
        metadata: undefined,
      });
    });

    it("throws for empty user_ids array", async () => {
      const request: CreateBatchNotificationRequest = {
        user_ids: [],
        type: "system",
        title: "Test",
      };

      await expect(service.createBatch(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("throws for empty title in batch", async () => {
      const request: CreateBatchNotificationRequest = {
        user_ids: ["user-1"],
        type: "system",
        title: "",
      };

      await expect(service.createBatch(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });

    it("throws for invalid type in batch", async () => {
      const request = {
        user_ids: ["user-1"],
        type: "bogus" as never,
        title: "Test",
      };

      await expect(service.createBatch(request)).rejects.toThrow(
        InvalidNotificationTypeError,
      );
    });
  });

  describe("findByUserId", () => {
    it("returns paginated notifications for user", async () => {
      const result = await service.findByUserId("user-uuid-1", {});

      expect(result.notifications).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(repo.findByUserId).toHaveBeenCalledWith("user-uuid-1", {});
    });

    it("passes unread_only filter to repository", async () => {
      await service.findByUserId("user-uuid-1", { unread_only: true });

      expect(repo.findByUserId).toHaveBeenCalledWith("user-uuid-1", {
        unread_only: true,
      });
    });

    it("passes type filter to repository", async () => {
      await service.findByUserId("user-uuid-1", { type: "course" });

      expect(repo.findByUserId).toHaveBeenCalledWith("user-uuid-1", {
        type: "course",
      });
    });

    it("passes page and limit to repository", async () => {
      await service.findByUserId("user-uuid-1", { page: 2, limit: 10 });

      expect(repo.findByUserId).toHaveBeenCalledWith("user-uuid-1", {
        page: 2,
        limit: 10,
      });
    });
  });

  describe("getUnreadCount", () => {
    it("returns unread count for user", async () => {
      const count = await service.getUnreadCount("user-uuid-1");

      expect(count).toBe(3);
      expect(repo.getUnreadCount).toHaveBeenCalledWith("user-uuid-1");
    });
  });

  describe("markAsRead", () => {
    it("marks notification as read when user owns it", async () => {
      const result = await service.markAsRead("notif-uuid-1", "user-uuid-1");

      expect(result.is_read).toBe(true);
      expect(result.read_at).toBe("2026-02-20T11:00:00Z");
      expect(repo.findById).toHaveBeenCalledWith("notif-uuid-1");
      expect(repo.markAsRead).toHaveBeenCalledWith("notif-uuid-1");
    });

    it("throws NotificationNotFoundError when notification does not exist", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(
        service.markAsRead("nonexistent", "user-uuid-1"),
      ).rejects.toThrow(NotificationNotFoundError);
    });

    it("throws NotificationForbiddenError when user does not own notification", async () => {
      await expect(
        service.markAsRead("notif-uuid-1", "different-user"),
      ).rejects.toThrow(NotificationForbiddenError);
    });

    it("is idempotent — marks already-read notification again", async () => {
      vi.mocked(repo.findById).mockResolvedValue(MOCK_READ_NOTIFICATION);

      const result = await service.markAsRead("notif-uuid-1", "user-uuid-1");

      expect(result.is_read).toBe(true);
      expect(repo.markAsRead).toHaveBeenCalledWith("notif-uuid-1");
    });
  });

  describe("markAllAsRead", () => {
    it("returns count of updated notifications", async () => {
      const count = await service.markAllAsRead("user-uuid-1");

      expect(count).toBe(5);
      expect(repo.markAllAsRead).toHaveBeenCalledWith("user-uuid-1");
    });

    it("returns 0 when no unread notifications", async () => {
      vi.mocked(repo.markAllAsRead).mockResolvedValue(0);

      const count = await service.markAllAsRead("user-uuid-1");

      expect(count).toBe(0);
    });
  });

  describe("deleteOld", () => {
    it("delegates to repository RPC call and returns count", async () => {
      const count = await service.deleteOld();

      expect(count).toBe(10);
      expect(repo.deleteOld).toHaveBeenCalled();
    });
  });
});
