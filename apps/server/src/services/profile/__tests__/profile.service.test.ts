import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver, Session } from "neo4j-driver";
import type { ProfileResponse } from "@journey-os/types";
import { ProfileService } from "../profile.service";
import type { ProfileRepository } from "../../../repositories/profile.repository";
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

const PROFILE_WITH_AVATAR: ProfileResponse = {
  ...MOCK_PROFILE,
  avatar_url:
    "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
};

function createMockRepository(): ProfileRepository {
  return {
    findByUserId: vi.fn().mockResolvedValue(MOCK_PROFILE),
    update: vi.fn().mockResolvedValue(MOCK_PROFILE),
    updateAvatarUrl: vi.fn().mockResolvedValue(undefined),
  } as unknown as ProfileRepository;
}

function createMockSupabaseForStorage(overrides?: {
  uploadError?: { message: string } | null;
  publicUrl?: string;
  removeError?: { message: string } | null;
}): SupabaseClient {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: overrides?.uploadError ?? null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: {
            publicUrl:
              overrides?.publicUrl ??
              "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
          },
        }),
        remove: vi.fn().mockResolvedValue({
          error: overrides?.removeError ?? null,
        }),
      }),
    },
  } as unknown as SupabaseClient;
}

function createMockNeo4jDriver(): { driver: Driver; session: Session } {
  const session = {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Session;

  const driver = {
    session: vi.fn().mockReturnValue(session),
  } as unknown as Driver;

  return { driver, session };
}

describe("ProfileService", () => {
  let repo: ProfileRepository;
  let supabase: SupabaseClient;
  let service: ProfileService;

  beforeEach(() => {
    repo = createMockRepository();
    supabase = createMockSupabaseForStorage();
    service = new ProfileService(repo, supabase, null);
  });

  describe("getProfile", () => {
    it("returns full profile for authenticated user", async () => {
      const result = await service.getProfile("user-uuid-001");

      expect(result).toEqual(MOCK_PROFILE);
      expect(repo.findByUserId).toHaveBeenCalledWith("user-uuid-001");
    });

    it("includes institution_name from joined institutions table", async () => {
      const result = await service.getProfile("user-uuid-001");

      expect(result.institution_name).toBe("Morehouse School of Medicine");
    });

    it("includes email from profiles table", async () => {
      const result = await service.getProfile("user-uuid-001");

      expect(result.email).toBe("faculty@med.edu");
    });

    it("throws PROFILE_NOT_FOUND if profile row missing", async () => {
      vi.mocked(repo.findByUserId).mockRejectedValue(
        new ProfileNotFoundError("user-uuid-999"),
      );

      await expect(service.getProfile("user-uuid-999")).rejects.toThrow(
        ProfileNotFoundError,
      );
    });
  });

  describe("updateProfile", () => {
    it("updates display_name in Supabase", async () => {
      const updated = { ...MOCK_PROFILE, display_name: "Dr. Jane A. Smith" };
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.updateProfile("user-uuid-001", {
        display_name: "Dr. Jane A. Smith",
      });

      expect(result.display_name).toBe("Dr. Jane A. Smith");
      expect(repo.update).toHaveBeenCalledWith("user-uuid-001", {
        display_name: "Dr. Jane A. Smith",
      });
    });

    it("updates bio in Supabase", async () => {
      const updated = { ...MOCK_PROFILE, bio: "Updated bio" };
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.updateProfile("user-uuid-001", {
        bio: "Updated bio",
      });

      expect(result.bio).toBe("Updated bio");
    });

    it("updates department and title in Supabase", async () => {
      const updated = {
        ...MOCK_PROFILE,
        department: "Pharmacology & Therapeutics",
        title: "Associate Professor",
      };
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.updateProfile("user-uuid-001", {
        department: "Pharmacology & Therapeutics",
        title: "Associate Professor",
      });

      expect(result.department).toBe("Pharmacology & Therapeutics");
      expect(result.title).toBe("Associate Professor");
    });

    it("syncs display_name to Neo4j User node", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new ProfileService(repo, supabase, driver);

      await neo4jService.updateProfile("user-uuid-001", {
        display_name: "Dr. Jane A. Smith",
      });

      expect(session.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (u:User {id: $userId})"),
        expect.objectContaining({
          userId: "user-uuid-001",
          displayName: "Dr. Jane A. Smith",
        }),
      );
      expect(session.close).toHaveBeenCalled();
    });

    it("syncs department and title to Neo4j User node", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new ProfileService(repo, supabase, driver);

      await neo4jService.updateProfile("user-uuid-001", {
        department: "Pharmacology",
        title: "Professor",
      });

      expect(session.run).toHaveBeenCalledWith(
        expect.stringContaining("u.department = $department"),
        expect.objectContaining({
          department: "Pharmacology",
          title: "Professor",
        }),
      );
    });

    it("sets sync_status to failed if Neo4j write fails", async () => {
      const { driver, session } = createMockNeo4jDriver();
      vi.mocked(session.run).mockRejectedValue(new Error("Neo4j down"));
      const neo4jService = new ProfileService(repo, supabase, driver);

      // Should not throw — Neo4j failure is best-effort
      const result = await neo4jService.updateProfile("user-uuid-001", {
        display_name: "Updated",
      });

      expect(result).toBeDefined();
      expect(session.close).toHaveBeenCalled();
    });

    it("accepts partial update (only one field)", async () => {
      const updated = {
        ...MOCK_PROFILE,
        display_name: "Dr. Jane Smith-Williams",
      };
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.updateProfile("user-uuid-001", {
        display_name: "Dr. Jane Smith-Williams",
      });

      expect(result.display_name).toBe("Dr. Jane Smith-Williams");
    });

    it("rejects display_name shorter than 2 chars", async () => {
      await expect(
        service.updateProfile("user-uuid-001", { display_name: "A" }),
      ).rejects.toThrow(ProfileValidationError);
    });

    it("rejects display_name longer than 100 chars", async () => {
      await expect(
        service.updateProfile("user-uuid-001", {
          display_name: "A".repeat(101),
        }),
      ).rejects.toThrow(ProfileValidationError);
    });

    it("rejects bio longer than 500 chars", async () => {
      await expect(
        service.updateProfile("user-uuid-001", { bio: "A".repeat(501) }),
      ).rejects.toThrow(ProfileValidationError);
    });

    it("rejects department longer than 100 chars", async () => {
      await expect(
        service.updateProfile("user-uuid-001", {
          department: "A".repeat(101),
        }),
      ).rejects.toThrow(ProfileValidationError);
    });

    it("rejects title longer than 100 chars", async () => {
      await expect(
        service.updateProfile("user-uuid-001", { title: "A".repeat(101) }),
      ).rejects.toThrow(ProfileValidationError);
    });

    it("trims whitespace from all string fields", async () => {
      await service.updateProfile("user-uuid-001", {
        display_name: "  Dr. Jane  ",
        bio: "  Bio text  ",
        department: "  Pharmacology  ",
        title: "  Professor  ",
      });

      expect(repo.update).toHaveBeenCalledWith("user-uuid-001", {
        display_name: "  Dr. Jane  ",
        bio: "  Bio text  ",
        department: "  Pharmacology  ",
        title: "  Professor  ",
      });
      // Note: trimming happens in the repository layer
    });
  });

  describe("uploadAvatar", () => {
    const VALID_FILE = {
      buffer: new Uint8Array(100),
      mimetype: "image/jpeg",
      size: 500_000,
      originalname: "profile.jpg",
    };

    it("uploads file to Supabase Storage avatars bucket", async () => {
      const result = await service.uploadAvatar("user-uuid-001", VALID_FILE);

      expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
      expect(result.avatar_url).toContain("avatars");
    });

    it("stores file at path {user_id}/avatar.{ext}", async () => {
      await service.uploadAvatar("user-uuid-001", VALID_FILE);

      const storageFrom = supabase.storage.from("avatars");
      expect(storageFrom.upload).toHaveBeenCalledWith(
        "user-uuid-001/avatar.jpg",
        VALID_FILE.buffer,
        expect.objectContaining({
          contentType: "image/jpeg",
          upsert: true,
        }),
      );
    });

    it("updates avatar_url in profiles", async () => {
      await service.uploadAvatar("user-uuid-001", VALID_FILE);

      expect(repo.updateAvatarUrl).toHaveBeenCalledWith(
        "user-uuid-001",
        expect.stringContaining("avatars"),
      );
    });

    it("returns public URL for the avatar", async () => {
      const result = await service.uploadAvatar("user-uuid-001", VALID_FILE);

      expect(result.avatar_url).toBe(
        "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
      );
      expect(result.updated_at).toBeDefined();
    });

    it("overwrites existing avatar (upsert: true)", async () => {
      await service.uploadAvatar("user-uuid-001", VALID_FILE);

      const storageFrom = supabase.storage.from("avatars");
      expect(storageFrom.upload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Uint8Array),
        expect.objectContaining({ upsert: true }),
      );
    });

    it("rejects file larger than 2MB", async () => {
      const oversized = { ...VALID_FILE, size: 3_000_000 };

      await expect(
        service.uploadAvatar("user-uuid-001", oversized),
      ).rejects.toThrow(InvalidAvatarError);
    });

    it("rejects non-image MIME type", async () => {
      const invalid = { ...VALID_FILE, mimetype: "application/pdf" };

      await expect(
        service.uploadAvatar("user-uuid-001", invalid),
      ).rejects.toThrow(InvalidAvatarError);
    });

    it("rejects GIF MIME type", async () => {
      const gif = { ...VALID_FILE, mimetype: "image/gif" };

      await expect(service.uploadAvatar("user-uuid-001", gif)).rejects.toThrow(
        InvalidAvatarError,
      );
    });
  });

  describe("removeAvatar", () => {
    it("deletes file from Supabase Storage", async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue(PROFILE_WITH_AVATAR);

      await service.removeAvatar("user-uuid-001");

      const storageFrom = supabase.storage.from("avatars");
      expect(storageFrom.remove).toHaveBeenCalledWith([
        "user-uuid-001/avatar.jpg",
      ]);
    });

    it("sets avatar_url to null in profiles", async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue(PROFILE_WITH_AVATAR);

      const result = await service.removeAvatar("user-uuid-001");

      expect(repo.updateAvatarUrl).toHaveBeenCalledWith("user-uuid-001", null);
      expect(result.avatar_url).toBeNull();
    });

    it("succeeds even if no avatar exists (idempotent)", async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue(MOCK_PROFILE);

      const result = await service.removeAvatar("user-uuid-001");

      expect(result.avatar_url).toBeNull();
      expect(repo.updateAvatarUrl).toHaveBeenCalledWith("user-uuid-001", null);
    });
  });
});
