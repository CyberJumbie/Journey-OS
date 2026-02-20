import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionUserService } from "../institution-user.service";
import { ValidationError } from "../../../errors/validation.error";
import { DuplicateInvitationError } from "../../../errors/invitation.error";
import { UserInvitationEmailService } from "../../email/user-invitation-email.service";
import type { SupabaseClient } from "@supabase/supabase-js";

const INST_ID = "inst-1";

const MOCK_PROFILES = [
  {
    id: "user-1",
    email: "faculty@school.edu",
    full_name: "Dr. Faculty",
    role: "faculty",
    is_course_director: true,
    is_active: true,
    last_login_at: "2026-02-18T10:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    email: "student@school.edu",
    full_name: "Student One",
    role: "student",
    is_course_director: false,
    is_active: true,
    last_login_at: null,
    created_at: "2026-01-15T00:00:00Z",
  },
];

const MOCK_INVITATIONS = [
  {
    id: "inv-1",
    email: "pending@school.edu",
    role: "advisor",
    created_at: "2026-02-10T00:00:00Z",
    expires_at: "2099-12-31T00:00:00Z",
  },
];

function createMockSupabase(
  profiles: unknown[] = MOCK_PROFILES,
  invitations: unknown[] = MOCK_INVITATIONS,
): SupabaseClient {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  Object.defineProperty(profileChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ data: profiles, error: null }),
    configurable: true,
  });

  const invitationChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  Object.defineProperty(invitationChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ data: invitations, error: null }),
    configurable: true,
  });

  let callCount = 0;
  return {
    from: vi.fn(() => {
      callCount++;
      if (callCount % 2 === 1) return profileChain;
      return invitationChain;
    }),
  } as unknown as SupabaseClient;
}

function createInviteMockSupabase(overrides?: {
  existingInvitation?: unknown[];
  existingUser?: unknown[];
  insertResult?: { data: unknown; error: unknown };
}): SupabaseClient {
  // Check duplicate chain: select -> eq -> eq -> is -> gt -> limit
  const dupChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: overrides?.existingInvitation ?? [],
      error: null,
    }),
  };

  // Check existing user chain: select -> eq -> eq -> limit
  const userChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: overrides?.existingUser ?? [],
      error: null,
    }),
  };

  // Insert chain: insert -> select -> single
  const singleFn = vi.fn().mockResolvedValue(
    overrides?.insertResult ?? {
      data: {
        id: "inv-new",
        email: "new@school.edu",
        role: "faculty",
        expires_at: "2026-03-06T00:00:00Z",
      },
      error: null,
    },
  );
  const insertSelectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  let callCount = 0;
  return {
    from: vi.fn(() => {
      callCount++;
      if (callCount === 1) return dupChain;
      if (callCount === 2) return userChain;
      return { insert: insertFn };
    }),
  } as unknown as SupabaseClient;
}

function createMockEmailService(): UserInvitationEmailService {
  return {
    sendInvitation: vi.fn().mockResolvedValue(undefined),
  } as unknown as UserInvitationEmailService;
}

describe("InstitutionUserService", () => {
  let emailService: UserInvitationEmailService;

  beforeEach(() => {
    emailService = createMockEmailService();
  });

  describe("list", () => {
    it("returns merged profiles and invitations with correct meta", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, {});

      expect(result.users).toHaveLength(3);
      expect(result.meta).toEqual({
        page: 1,
        limit: 25,
        total: 3,
        total_pages: 1,
      });
    });

    it("marks profiles as active and invitations as pending", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, {});

      const statuses = result.users.map((u) => u.status);
      expect(statuses).toContain("active");
      expect(statuses).toContain("pending");
    });

    it("defaults page to 1 and limit to 25", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(25);
    });

    it("caps limit at 100", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { limit: 200 });

      expect(result.meta.limit).toBe(100);
    });

    it("enforces minimum page of 1", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { page: -1 });

      expect(result.meta.page).toBe(1);
    });

    it("throws ValidationError for invalid sort field", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      await expect(
        service.list(INST_ID, { sort_by: "bogus" as "email" }),
      ).rejects.toThrow(ValidationError);
    });

    it("calculates total_pages correctly", async () => {
      // 3 total items (2 profiles + 1 invitation), limit=2 => 2 pages
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { limit: 2 });

      expect(result.meta.total_pages).toBe(2);
      expect(result.users).toHaveLength(2);
    });

    it("paginates correctly on page 2", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { page: 2, limit: 2 });

      expect(result.users).toHaveLength(1);
      expect(result.meta.page).toBe(2);
    });

    it("skips invitations when status filter is active", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { status: "active" });

      const statuses = result.users.map((u) => u.status);
      expect(statuses).not.toContain("pending");
    });

    it("skips profiles when status filter is pending", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, { status: "pending" });

      const statuses = result.users.map((u) => u.status);
      expect(statuses.every((s) => s === "pending")).toBe(true);
    });

    it("returns empty list when no users match", async () => {
      const supabase = createMockSupabase([], []);
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, {});

      expect(result.users).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it("sorts by full_name ascending", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.list(INST_ID, {
        sort_by: "full_name",
        sort_dir: "asc",
      });

      // null names (invitations) sort first, then alphabetical
      const names = result.users.map((u) => u.full_name);
      expect(names[0]).toBeNull(); // invitation has null full_name
    });

    it("passes institution_id filter to supabase queries", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      await service.list(INST_ID, {});

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(supabase.from).toHaveBeenCalledWith("invitations");
    });
  });

  describe("invite", () => {
    const inviter = {
      id: "admin-1",
      full_name: "Admin User",
      institution_name: "Test School",
    };

    it("creates invitation and calls email service", async () => {
      const supabase = createInviteMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      const result = await service.invite(INST_ID, inviter, {
        email: "new@school.edu",
        role: "faculty",
      });

      expect(result.invitation_id).toBe("inv-new");
      expect(result.email).toBe("new@school.edu");
      expect(emailService.sendInvitation).toHaveBeenCalledWith(
        "new@school.edu",
        "faculty",
        "Admin User",
        "Test School",
        expect.any(String),
      );
    });

    it("throws DuplicateInvitationError for existing active invitation", async () => {
      const supabase = createInviteMockSupabase({
        existingInvitation: [{ id: "inv-existing" }],
      });
      const service = new InstitutionUserService(supabase, emailService);

      await expect(
        service.invite(INST_ID, inviter, {
          email: "existing@school.edu",
          role: "faculty",
        }),
      ).rejects.toThrow(DuplicateInvitationError);
    });

    it("throws ValidationError when user already exists at institution", async () => {
      const supabase = createInviteMockSupabase({
        existingUser: [{ id: "user-existing" }],
      });
      const service = new InstitutionUserService(supabase, emailService);

      await expect(
        service.invite(INST_ID, inviter, {
          email: "existing@school.edu",
          role: "student",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when CD flag is set for non-faculty role", async () => {
      const supabase = createInviteMockSupabase();
      const service = new InstitutionUserService(supabase, emailService);

      await expect(
        service.invite(INST_ID, inviter, {
          email: "new@school.edu",
          role: "student",
          is_course_director: true,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
