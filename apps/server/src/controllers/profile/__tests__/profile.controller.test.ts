import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { ProfileResponse } from "@journey-os/types";
import { ProfileController } from "../profile.controller";
import type { ProfileService } from "../../../services/profile/profile.service";
import {
  ProfileNotFoundError,
  ProfileValidationError,
  InvalidAvatarError,
} from "../../../errors";

const MOCK_PROFILE: ProfileResponse = {
  id: "user-uuid-001",
  email: "faculty@med.edu",
  display_name: "Dr. Jane Smith",
  bio: "Professor of Pharmacology",
  title: "Professor",
  department: "Pharmacology",
  avatar_url: null,
  role: "faculty",
  institution_id: "inst-uuid-001",
  institution_name: "Morehouse School of Medicine",
  is_course_director: true,
  onboarding_complete: true,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

function createMockService(): ProfileService {
  return {
    getProfile: vi.fn().mockResolvedValue(MOCK_PROFILE),
    updateProfile: vi.fn().mockResolvedValue(MOCK_PROFILE),
    uploadAvatar: vi.fn().mockResolvedValue({
      avatar_url: "https://example.com/avatar.jpg",
      updated_at: "2026-02-20T10:00:00Z",
    }),
    removeAvatar: vi.fn().mockResolvedValue({
      avatar_url: null,
      updated_at: "2026-02-20T10:00:00Z",
    }),
  } as unknown as ProfileService;
}

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

function createMockReq(overrides?: {
  user?: { id: string } | null;
  body?: unknown;
  file?: unknown;
}): unknown {
  return {
    user:
      overrides?.user !== null
        ? (overrides?.user ?? { id: "user-uuid-001" })
        : undefined,
    body: overrides?.body ?? {},
    file: overrides?.file,
  };
}

describe("ProfileController", () => {
  let profileService: ProfileService;
  let controller: ProfileController;

  beforeEach(() => {
    profileService = createMockService();
    controller = new ProfileController(profileService);
  });

  describe("GET /api/v1/profile", () => {
    it("returns 200 with profile data", async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.handleGetProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: MOCK_PROFILE, error: null });
    });

    it("returns 401 without auth token", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await controller.handleGetProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({
        data: null,
        error: { code: "UNAUTHORIZED", message: "No authenticated user" },
      });
    });

    it("returns 404 if profile missing", async () => {
      vi.mocked(profileService.getProfile).mockRejectedValue(
        new ProfileNotFoundError("user-uuid-001"),
      );
      const req = createMockReq();
      const res = createMockRes();

      await controller.handleGetProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/profile", () => {
    it("returns 200 with updated profile", async () => {
      const updated = { ...MOCK_PROFILE, display_name: "Dr. Jane A. Smith" };
      vi.mocked(profileService.updateProfile).mockResolvedValue(updated);

      const req = createMockReq({
        body: { display_name: "Dr. Jane A. Smith" },
      });
      const res = createMockRes();

      await controller.handleUpdateProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: updated, error: null });
    });

    it("returns 400 for invalid display_name", async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValue(
        new ProfileValidationError(
          "Display name must be at least 2 characters",
        ),
      );

      const req = createMockReq({ body: { display_name: "A" } });
      const res = createMockRes();

      await controller.handleUpdateProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("returns 400 for bio exceeding 500 chars", async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValue(
        new ProfileValidationError("Bio must be at most 500 characters"),
      );

      const req = createMockReq({ body: { bio: "A".repeat(501) } });
      const res = createMockRes();

      await controller.handleUpdateProfile(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/profile/avatar", () => {
    it("returns 200 with avatar_url", async () => {
      const req = createMockReq({
        file: {
          buffer: new Uint8Array(100),
          mimetype: "image/jpeg",
          size: 500_000,
          originalname: "profile.jpg",
        },
      });
      const res = createMockRes();

      await controller.handleUploadAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      expect(
        (res.body as { data: { avatar_url: string } }).data.avatar_url,
      ).toBe("https://example.com/avatar.jpg");
    });

    it("returns 400 for oversized file", async () => {
      vi.mocked(profileService.uploadAvatar).mockRejectedValue(
        new InvalidAvatarError("File size exceeds maximum"),
      );

      const req = createMockReq({
        file: {
          buffer: new Uint8Array(100),
          mimetype: "image/jpeg",
          size: 3_000_000,
          originalname: "big.jpg",
        },
      });
      const res = createMockRes();

      await controller.handleUploadAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INVALID_AVATAR",
      );
    });

    it("returns 400 for invalid MIME type", async () => {
      vi.mocked(profileService.uploadAvatar).mockRejectedValue(
        new InvalidAvatarError("File type not allowed"),
      );

      const req = createMockReq({
        file: {
          buffer: new Uint8Array(100),
          mimetype: "image/gif",
          size: 500_000,
          originalname: "profile.gif",
        },
      });
      const res = createMockRes();

      await controller.handleUploadAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when no file attached", async () => {
      const req = createMockReq({ file: undefined });
      const res = createMockRes();

      await controller.handleUploadAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("DELETE /api/v1/profile/avatar", () => {
    it("returns 200 with null avatar_url", async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.handleRemoveAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      expect(
        (res.body as { data: { avatar_url: null } }).data.avatar_url,
      ).toBeNull();
    });

    it("succeeds when no avatar exists", async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.handleRemoveAvatar(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
    });
  });
});
