import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const VALID_ENV = {
  SUPABASE_URL: "https://test-project.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key",
  SUPABASE_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters",
  NODE_ENV: "test",
};

describe("EnvironmentConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadEnvConfig() {
    return import("../env.config");
  }

  it("should parse valid environment variables without throwing", async () => {
    Object.assign(process.env, VALID_ENV);
    const { envConfig } = await loadEnvConfig();
    expect(envConfig.SUPABASE_URL).toBe(VALID_ENV.SUPABASE_URL);
    expect(envConfig.NODE_ENV).toBe("test");
  });

  it("should throw MissingEnvironmentError when SUPABASE_URL is missing", async () => {
    const { SUPABASE_URL: _, ...envWithoutUrl } = VALID_ENV;
    Object.assign(process.env, envWithoutUrl);
    delete process.env.SUPABASE_URL;
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should throw MissingEnvironmentError when SUPABASE_ANON_KEY is missing", async () => {
    const { SUPABASE_ANON_KEY: _, ...envWithout } = VALID_ENV;
    Object.assign(process.env, envWithout);
    delete process.env.SUPABASE_ANON_KEY;
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should throw MissingEnvironmentError when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _, ...envWithout } = VALID_ENV;
    Object.assign(process.env, envWithout);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should throw MissingEnvironmentError when SUPABASE_JWT_SECRET is missing", async () => {
    const { SUPABASE_JWT_SECRET: _, ...envWithout } = VALID_ENV;
    Object.assign(process.env, envWithout);
    delete process.env.SUPABASE_JWT_SECRET;
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should accept valid NODE_ENV values: development, test, production", async () => {
    for (const env of ["development", "test", "production"]) {
      vi.resetModules();
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: env });
      const { envConfig } = await loadEnvConfig();
      expect(envConfig.NODE_ENV).toBe(env);
    }
  });

  it("should reject invalid NODE_ENV values", async () => {
    Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "staging" });
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should validate SUPABASE_URL is a valid URL format", async () => {
    Object.assign(process.env, {
      ...VALID_ENV,
      SUPABASE_URL: "not-a-url",
    });
    await expect(loadEnvConfig()).rejects.toThrow(
      "Missing or invalid environment variables",
    );
  });

  it("should export a frozen config object (immutable)", async () => {
    Object.assign(process.env, VALID_ENV);
    const { envConfig } = await loadEnvConfig();
    expect(Object.isFrozen(envConfig)).toBe(true);
  });
});
