import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.config", () => ({
  envConfig: {
    SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SUPABASE_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters",
    NODE_ENV: "test",
    PORT: 3001,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

import { AuthService } from "../auth.service";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AuthenticationError } from "../../../errors/auth.errors";
import { AuthRole } from "@journey-os/types";

interface MockGetUser {
  mockResolvedValue: (value: unknown) => void;
}

interface MockSupabaseClient extends SupabaseClient {
  auth: SupabaseClient["auth"] & {
    getUser: MockGetUser & SupabaseClient["auth"]["getUser"];
  };
}

const VALID_JWT_PAYLOAD = {
  sub: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "dr.osei@msm.edu",
  role: "faculty",
  institution_id: "inst-0001-0002-0003-000000000001",
  is_course_director: true,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

function createMockSupabaseClient(): MockSupabaseClient {
  return vi.mocked(createClient)(
    "https://test-project.supabase.co",
    "test-service-role-key",
  ) as unknown as MockSupabaseClient;
}

describe("AuthService", () => {
  let authService: AuthService;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    authService = new AuthService(mockClient);
  });

  describe("extractBearerToken", () => {
    it("should extract token from valid Bearer header", () => {
      const token = authService.extractBearerToken("Bearer abc123");
      expect(token).toBe("abc123");
    });

    it("should throw AuthenticationError when header is undefined", () => {
      expect(() => authService.extractBearerToken(undefined)).toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when header is empty string", () => {
      expect(() => authService.extractBearerToken("")).toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when header does not start with Bearer", () => {
      expect(() => authService.extractBearerToken("Basic abc123")).toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when Bearer token is empty", () => {
      expect(() => authService.extractBearerToken("Bearer ")).toThrow(
        AuthenticationError,
      );
    });
  });

  describe("verifyToken", () => {
    it("should return AuthTokenPayload for a valid token", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              role: VALID_JWT_PAYLOAD.role,
              institution_id: VALID_JWT_PAYLOAD.institution_id,
              is_course_director: VALID_JWT_PAYLOAD.is_course_director,
            },
            created_at: new Date(VALID_JWT_PAYLOAD.iat * 1000).toISOString(),
            updated_at: new Date(VALID_JWT_PAYLOAD.exp * 1000).toISOString(),
          },
        },
        error: null,
      });

      const payload = await authService.verifyToken("valid-token");

      expect(payload.sub).toBe(VALID_JWT_PAYLOAD.sub);
      expect(payload.email).toBe(VALID_JWT_PAYLOAD.email);
      expect(payload.role).toBe(AuthRole.FACULTY);
      expect(payload.institution_id).toBe(VALID_JWT_PAYLOAD.institution_id);
      expect(payload.is_course_director).toBe(true);
      expect(payload.aud).toBe("authenticated");
    });

    it("should throw AuthenticationError when Supabase returns an error", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      await expect(authService.verifyToken("bad-token")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when Supabase returns no user", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(authService.verifyToken("no-user-token")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when user has no role in app_metadata", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              institution_id: VALID_JWT_PAYLOAD.institution_id,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      await expect(authService.verifyToken("no-role-token")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError when role is invalid", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              role: "hacker",
              institution_id: VALID_JWT_PAYLOAD.institution_id,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      await expect(
        authService.verifyToken("invalid-role-token"),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError when user has no institution_id", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              role: VALID_JWT_PAYLOAD.role,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      await expect(authService.verifyToken("no-inst-token")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should default is_course_director to false when not in app_metadata", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              role: VALID_JWT_PAYLOAD.role,
              institution_id: VALID_JWT_PAYLOAD.institution_id,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      const payload = await authService.verifyToken("valid-token");
      expect(payload.is_course_director).toBe(false);
    });

    it("should default email to empty string when user has no email", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: null,
            app_metadata: {
              role: VALID_JWT_PAYLOAD.role,
              institution_id: VALID_JWT_PAYLOAD.institution_id,
              is_course_director: false,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      const payload = await authService.verifyToken("no-email-token");
      expect(payload.email).toBe("");
    });

    it("should call supabase.auth.getUser with the provided token", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: VALID_JWT_PAYLOAD.sub,
            email: VALID_JWT_PAYLOAD.email,
            app_metadata: {
              role: VALID_JWT_PAYLOAD.role,
              institution_id: VALID_JWT_PAYLOAD.institution_id,
              is_course_director: true,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      await authService.verifyToken("my-specific-token");
      expect(mockClient.auth.getUser).toHaveBeenCalledWith("my-specific-token");
    });
  });
});
