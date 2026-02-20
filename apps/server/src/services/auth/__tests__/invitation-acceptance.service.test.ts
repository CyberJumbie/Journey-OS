import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvitationAcceptanceService } from "../invitation-acceptance.service";
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
} from "../../../errors/invitation.error";
import { ValidationError } from "../../../errors/validation.error";
import { DuplicateEmailError } from "../../../errors/registration.error";
import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_INVITATION = {
  id: "inv-001",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-001",
  expires_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
  accepted_at: null,
  token: "valid-token-123",
  institutions: { name: "Morehouse School of Medicine" },
};

const VALID_ACCEPT_REQUEST = {
  token: "valid-token-123",
  password: "StrongP@ss1",
  full_name: "Dr. Jane Faculty",
};

function createMockSupabaseClient(overrides?: {
  selectSingle?: ReturnType<typeof vi.fn>;
  updateEq?: ReturnType<typeof vi.fn>;
  updateEqIs?: ReturnType<typeof vi.fn>;
  createUser?: ReturnType<typeof vi.fn>;
  profileUpdate?: ReturnType<typeof vi.fn>;
}) {
  const selectSingle =
    overrides?.selectSingle ??
    vi.fn().mockResolvedValue({
      data: VALID_INVITATION,
      error: null,
    });

  const updateEqIs =
    overrides?.updateEqIs ??
    vi.fn().mockResolvedValue({ data: null, error: null });

  const profileUpdate =
    overrides?.profileUpdate ??
    vi.fn().mockResolvedValue({ data: null, error: null });

  const createUser =
    overrides?.createUser ??
    vi.fn().mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    });

  // Track which table is being queried to route to correct mock
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "invitations") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: selectSingle,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: updateEqIs,
          }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        update: vi.fn().mockReturnValue({
          eq: profileUpdate,
        }),
      };
    }
    return {};
  });

  return {
    auth: { admin: { createUser } },
    from: fromMock,
  } as unknown as SupabaseClient;
}

describe("InvitationAcceptanceService", () => {
  let service: InvitationAcceptanceService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new InvitationAcceptanceService(mockClient);
  });

  describe("validateToken", () => {
    it("returns payload for a valid, unused, non-expired token", async () => {
      const result = await service.validateToken("valid-token-123");

      expect(result.invitation_id).toBe("inv-001");
      expect(result.email).toBe("faculty@msm.edu");
      expect(result.role).toBe("faculty");
      expect(result.institution_id).toBe("inst-001");
      expect(result.institution_name).toBe("Morehouse School of Medicine");
      expect(result.is_valid).toBe(true);
    });

    it("throws InvitationNotFoundError when token does not exist", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      await expect(svc.validateToken("bad-token")).rejects.toThrow(
        InvitationNotFoundError,
      );
    });

    it("throws InvitationAlreadyUsedError when accepted_at is set", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: { ...VALID_INVITATION, accepted_at: "2026-01-01T00:00:00Z" },
          error: null,
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      await expect(svc.validateToken("used-token")).rejects.toThrow(
        InvitationAlreadyUsedError,
      );
    });

    it("throws InvitationExpiredError when token is past expiry", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: {
            ...VALID_INVITATION,
            expires_at: new Date(Date.now() - 86400000).toISOString(), // -1 day
          },
          error: null,
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      await expect(svc.validateToken("expired-token")).rejects.toThrow(
        InvitationExpiredError,
      );
    });

    it("returns 'Unknown' when institution join has no name", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: { ...VALID_INVITATION, institutions: null },
          error: null,
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      const result = await svc.validateToken("token");
      expect(result.institution_name).toBe("Unknown");
    });
  });

  describe("acceptInvitation", () => {
    it("creates user, updates profile, and marks invitation consumed", async () => {
      const result = await service.acceptInvitation(VALID_ACCEPT_REQUEST);

      expect(result.user_id).toBe("user-001");
      expect(result.email).toBe("faculty@msm.edu");
      expect(result.role).toBe("faculty");
      expect(result.institution_id).toBe("inst-001");
      expect(result.institution_name).toBe("Morehouse School of Medicine");
      expect(result.accepted_at).toBeDefined();
    });

    it("throws ValidationError for weak password", async () => {
      const request = { ...VALID_ACCEPT_REQUEST, password: "weak" };

      await expect(service.acceptInvitation(request)).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws DuplicateEmailError when auth user already exists", async () => {
      const client = createMockSupabaseClient({
        createUser: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message:
              "A user with this email address has already been registered",
          },
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      await expect(svc.acceptInvitation(VALID_ACCEPT_REQUEST)).rejects.toThrow(
        DuplicateEmailError,
      );
    });

    it("throws generic error when auth creation fails for other reasons", async () => {
      const client = createMockSupabaseClient({
        createUser: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      await expect(svc.acceptInvitation(VALID_ACCEPT_REQUEST)).rejects.toThrow(
        "Failed to create auth user",
      );
    });

    it("succeeds even if profile update fails (best-effort)", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const client = createMockSupabaseClient({
        profileUpdate: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Profile update failed" },
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      const result = await svc.acceptInvitation(VALID_ACCEPT_REQUEST);

      expect(result.user_id).toBe("user-001");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("succeeds even if invitation consume fails (best-effort)", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const client = createMockSupabaseClient({
        updateEqIs: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Consume failed" },
        }),
      });
      const svc = new InvitationAcceptanceService(client);

      const result = await svc.acceptInvitation(VALID_ACCEPT_REQUEST);

      expect(result.user_id).toBe("user-001");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("calls admin.createUser with correct metadata", async () => {
      const createUserMock = vi.fn().mockResolvedValue({
        data: { user: { id: "user-001" } },
        error: null,
      });
      const client = createMockSupabaseClient({ createUser: createUserMock });
      const svc = new InvitationAcceptanceService(client);

      await svc.acceptInvitation(VALID_ACCEPT_REQUEST);

      expect(createUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "faculty@msm.edu",
          password: "StrongP@ss1",
          email_confirm: true,
          app_metadata: expect.objectContaining({
            role: "faculty",
            institution_id: "inst-001",
          }),
          user_metadata: expect.objectContaining({
            full_name: "Dr. Jane Faculty",
            role: "faculty",
          }),
        }),
      );
    });
  });
});
