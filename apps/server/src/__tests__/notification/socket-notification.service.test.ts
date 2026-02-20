import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Notification,
  CreateNotificationRequest,
} from "@journey-os/types";
import { SocketNotificationService } from "../../services/notification/socket-notification.service";
import type { NotificationService } from "../../services/notification/notification.service";
import type { SocketManagerService } from "../../services/notification/socket-manager.service";
import { SocketNotificationError } from "../../errors/socket.errors";

const MOCK_NOTIFICATION: Notification = {
  id: "notif-uuid-1",
  user_id: "faculty-uuid-1",
  type: "system",
  title: "Question Set Ready",
  body: "Your 25-question set for Cardiology has been generated.",
  action_url: null,
  action_label: null,
  is_read: false,
  read_at: null,
  created_at: "2026-02-19T14:30:00Z",
  institution_id: "inst-uuid-1",
  metadata: { course_id: "course-uuid-1" },
};

const MOCK_READ_NOTIFICATION: Notification = {
  ...MOCK_NOTIFICATION,
  is_read: true,
  read_at: "2026-02-19T15:00:00Z",
};

function createMockNotificationService(): NotificationService {
  return {
    create: vi.fn().mockResolvedValue(MOCK_NOTIFICATION),
    createBatch: vi.fn().mockResolvedValue([MOCK_NOTIFICATION]),
    findByUserId: vi.fn().mockResolvedValue({
      notifications: [MOCK_NOTIFICATION],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    getUnreadCount: vi.fn().mockResolvedValue(1),
    markAsRead: vi.fn().mockResolvedValue(MOCK_READ_NOTIFICATION),
    markAllAsRead: vi.fn().mockResolvedValue(1),
    deleteOld: vi.fn().mockResolvedValue(0),
  } as unknown as NotificationService;
}

function createMockSocketManager(isOnline = true): SocketManagerService {
  return {
    isOnline: vi.fn().mockReturnValue(isOnline),
    emitToUser: vi.fn(),
    getOnlineCount: vi.fn().mockReturnValue(1),
    initialize: vi.fn(),
    setNotificationService: vi.fn(),
  } as unknown as SocketManagerService;
}

describe("SocketNotificationService", () => {
  let mockNotificationService: NotificationService;
  let mockSocketManager: SocketManagerService;
  let service: SocketNotificationService;

  beforeEach(() => {
    mockNotificationService = createMockNotificationService();
    mockSocketManager = createMockSocketManager(true);
    service = new SocketNotificationService(
      mockNotificationService,
      mockSocketManager,
    );
  });

  describe("push", () => {
    const CREATE_REQUEST: CreateNotificationRequest = {
      user_id: "faculty-uuid-1",
      type: "system",
      title: "Question Set Ready",
      body: "Your 25-question set for Cardiology has been generated.",
      metadata: { course_id: "course-uuid-1" },
      institution_id: "inst-uuid-1",
    };

    it("creates notification record in Supabase", async () => {
      await service.push(CREATE_REQUEST);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        CREATE_REQUEST,
      );
    });

    it("emits notification:new to user socket room when online", async () => {
      await service.push(CREATE_REQUEST);

      expect(mockSocketManager.emitToUser).toHaveBeenCalledWith(
        "faculty-uuid-1",
        {
          id: "notif-uuid-1",
          type: "system",
          title: "Question Set Ready",
          body: "Your 25-question set for Cardiology has been generated.",
          metadata: { course_id: "course-uuid-1" },
          created_at: "2026-02-19T14:30:00Z",
        },
      );
    });

    it("persists notification even when user is offline (no emit)", async () => {
      mockSocketManager = createMockSocketManager(false);
      service = new SocketNotificationService(
        mockNotificationService,
        mockSocketManager,
      );

      const result = await service.push(CREATE_REQUEST);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        CREATE_REQUEST,
      );
      expect(mockSocketManager.emitToUser).not.toHaveBeenCalled();
      expect(result).toEqual(MOCK_NOTIFICATION);
    });

    it("includes full payload in socket emission (id, type, title, body, metadata, created_at)", async () => {
      await service.push(CREATE_REQUEST);

      const emitCall = (
        mockSocketManager.emitToUser as ReturnType<typeof vi.fn>
      ).mock.calls[0]!;
      const payload = emitCall[1] as Record<string, unknown>;

      expect(payload).toHaveProperty("id");
      expect(payload).toHaveProperty("type");
      expect(payload).toHaveProperty("title");
      expect(payload).toHaveProperty("body");
      expect(payload).toHaveProperty("metadata");
      expect(payload).toHaveProperty("created_at");
    });

    it("throws SocketNotificationError on Supabase insert failure", async () => {
      (
        mockNotificationService.create as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Supabase insert failed"));

      await expect(service.push(CREATE_REQUEST)).rejects.toThrow(
        SocketNotificationError,
      );
    });
  });

  describe("markAsRead", () => {
    it("updates notification read=true and read_at timestamp", async () => {
      const result = await service.markAsRead("notif-uuid-1", "faculty-uuid-1");

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        "notif-uuid-1",
        "faculty-uuid-1",
      );
      expect(result.is_read).toBe(true);
      expect(result.read_at).not.toBeNull();
    });

    it("throws error if notification not found", async () => {
      (
        mockNotificationService.markAsRead as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Notification not found"));

      await expect(
        service.markAsRead("nonexistent-id", "faculty-uuid-1"),
      ).rejects.toThrow();
    });
  });

  describe("getUnread", () => {
    it("returns unread notifications for user ordered by created_at desc", async () => {
      const result = await service.getUnread("faculty-uuid-1");

      expect(mockNotificationService.findByUserId).toHaveBeenCalledWith(
        "faculty-uuid-1",
        { unread_only: true, limit: 50 },
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.is_read).toBe(false);
    });

    it("returns empty array when all notifications are read", async () => {
      (
        mockNotificationService.findByUserId as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        notifications: [],
        meta: { page: 1, limit: 50, total: 0, total_pages: 0 },
      });

      const result = await service.getUnread("faculty-uuid-1");

      expect(result).toHaveLength(0);
    });
  });
});
