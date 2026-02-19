import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../env.config", () => ({
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
    auth: {},
    from: vi.fn(),
  })),
}));

import { SupabaseClientConfig, getSupabaseClient } from "../supabase.config";
import { createClient } from "@supabase/supabase-js";

describe("SupabaseClientConfig", () => {
  beforeEach(() => {
    SupabaseClientConfig.resetInstance();
    vi.clearAllMocks();
  });

  it("should create a Supabase client with service role key", () => {
    getSupabaseClient();
    expect(createClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-service-role-key",
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    );
  });

  it("should return the same instance on repeated calls (singleton)", () => {
    const client1 = getSupabaseClient();
    const client2 = getSupabaseClient();
    expect(client1).toBe(client2);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("should use SUPABASE_URL from environment config", () => {
    getSupabaseClient();
    expect(createClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      expect.any(String),
      expect.any(Object),
    );
  });

  it("should expose client via public getter, not direct field access", () => {
    const instance = SupabaseClientConfig.getInstance();
    expect(instance.client).toBeDefined();
    expect(
      (instance as unknown as Record<string, unknown>)["_client"],
    ).toBeUndefined();
  });
});
