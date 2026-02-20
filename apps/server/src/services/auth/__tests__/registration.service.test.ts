import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistrationService } from "../registration.service";
import { ValidationError } from "../../../errors/validation.error";
import {
  DuplicateEmailError,
  InvalidRegistrationError,
  InstitutionNotFoundError,
} from "../../../errors/registration.error";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistrationRequest } from "@journey-os/types";

const VALID_REQUEST: RegistrationRequest = {
  role: "student",
  email: "student@msm.edu",
  password: "Passw0rd1",
  display_name: "Test Student",
  institution_id: "inst-001",
  consented: true,
  consent_version: "1.0",
};

function createMockSupabaseClient(overrides?: {
  signUp?: ReturnType<typeof vi.fn>;
  selectSingle?: ReturnType<typeof vi.fn>;
  upsert?: ReturnType<typeof vi.fn>;
}) {
  const selectSingle =
    overrides?.selectSingle ??
    vi.fn().mockResolvedValue({
      data: { id: "inst-001", status: "approved" },
      error: null,
    });

  const upsert =
    overrides?.upsert ?? vi.fn().mockResolvedValue({ data: null, error: null });

  const signUp =
    overrides?.signUp ??
    vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-001",
          email: "student@msm.edu",
          identities: [{ id: "id-1" }],
        },
        session: null,
      },
      error: null,
    });

  return {
    auth: { signUp },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: selectSingle,
        }),
      }),
      upsert,
    }),
  } as unknown as SupabaseClient;
}

describe("RegistrationService", () => {
  let service: RegistrationService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new RegistrationService(mockClient);
  });

  it("registers a user successfully with all valid fields", async () => {
    const result = await service.register(VALID_REQUEST, "192.168.1.1");

    expect(result.user_id).toBe("user-001");
    expect(result.email).toBe("student@msm.edu");
    expect(result.requires_verification).toBe(true);
  });

  it("rejects superadmin role", async () => {
    const req = { ...VALID_REQUEST, role: "superadmin" as never };
    await expect(service.register(req, "127.0.0.1")).rejects.toThrow(
      InvalidRegistrationError,
    );
  });

  it("rejects institutional_admin role", async () => {
    const req = { ...VALID_REQUEST, role: "institutional_admin" as never };
    await expect(service.register(req, "127.0.0.1")).rejects.toThrow(
      InvalidRegistrationError,
    );
  });

  it("rejects weak password — too short", async () => {
    const req = { ...VALID_REQUEST, password: "Short1" };
    await expect(service.register(req, "127.0.0.1")).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects weak password — no uppercase", async () => {
    const req = { ...VALID_REQUEST, password: "password1" };
    await expect(service.register(req, "127.0.0.1")).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects weak password — no number", async () => {
    const req = { ...VALID_REQUEST, password: "Password" };
    await expect(service.register(req, "127.0.0.1")).rejects.toThrow(
      ValidationError,
    );
  });

  it("detects duplicate email via empty identities array", async () => {
    const client = createMockSupabaseClient({
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: { id: "fake-id", email: "student@msm.edu", identities: [] },
          session: null,
        },
        error: null,
      }),
    });
    const svc = new RegistrationService(client);

    await expect(svc.register(VALID_REQUEST, "127.0.0.1")).rejects.toThrow(
      DuplicateEmailError,
    );
  });

  it("throws InstitutionNotFoundError when institution does not exist", async () => {
    const client = createMockSupabaseClient({
      selectSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });
    const svc = new RegistrationService(client);

    await expect(svc.register(VALID_REQUEST, "127.0.0.1")).rejects.toThrow(
      InstitutionNotFoundError,
    );
  });

  it("throws InstitutionNotFoundError when institution is not approved", async () => {
    const client = createMockSupabaseClient({
      selectSingle: vi.fn().mockResolvedValue({
        data: { id: "inst-001", status: "waitlisted" },
        error: null,
      }),
    });
    const svc = new RegistrationService(client);

    await expect(svc.register(VALID_REQUEST, "127.0.0.1")).rejects.toThrow(
      InstitutionNotFoundError,
    );
  });

  it("stores FERPA consent fields in profile upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = createMockSupabaseClient({ upsert: upsertMock });
    const svc = new RegistrationService(client);

    await svc.register(VALID_REQUEST, "10.0.0.1");

    // from() returns an object with .upsert(), so grab the call
    const fromMock = client.from as ReturnType<typeof vi.fn>;
    expect(fromMock).toHaveBeenCalledWith("profiles");

    const upsertCall = upsertMock.mock.calls[0]![0];
    expect(upsertCall.ferpa_consent_version).toBe("1.0");
    expect(upsertCall.ferpa_consent_ip).toBe("10.0.0.1");
    expect(upsertCall.ferpa_consent_at).toBeDefined();
  });
});
