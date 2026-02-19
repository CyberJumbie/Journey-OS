import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../env.config", () => ({
  envConfig: {
    SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SUPABASE_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters",
    NODE_ENV: "test",
    PORT: 3001,
    NEO4J_URI: "bolt://localhost:7687",
    NEO4J_USERNAME: "neo4j",
    NEO4J_PASSWORD: "test-password-123",
  },
}));

const { mockDriver, mockAuth } = vi.hoisted(() => {
  const mockSession = {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockDriver = {
    session: vi.fn().mockReturnValue(mockSession),
    close: vi.fn().mockResolvedValue(undefined),
    verifyConnectivity: vi.fn().mockResolvedValue(undefined),
  };

  const mockAuth = {
    basic: vi.fn().mockReturnValue({ scheme: "basic" }),
  };

  return { mockDriver, mockAuth };
});

vi.mock("neo4j-driver", () => ({
  default: {
    driver: vi.fn().mockReturnValue(mockDriver),
    auth: mockAuth,
  },
}));

import { Neo4jClientConfig, getNeo4jDriver } from "../neo4j.config";
import neo4j from "neo4j-driver";

describe("Neo4jClientConfig", () => {
  beforeEach(() => {
    Neo4jClientConfig.resetInstance();
    vi.clearAllMocks();
  });

  it("should create a Neo4j driver with URI from environment config", () => {
    Neo4jClientConfig.getInstance();

    expect(neo4j.driver).toHaveBeenCalledWith(
      "bolt://localhost:7687",
      expect.objectContaining({ scheme: "basic" }),
    );
  });

  it("should return the same instance on repeated calls (singleton)", () => {
    const instance1 = Neo4jClientConfig.getInstance();
    const instance2 = Neo4jClientConfig.getInstance();

    expect(instance1).toBe(instance2);
    expect(neo4j.driver).toHaveBeenCalledTimes(1);
  });

  it("should expose driver via public getter", () => {
    const instance = Neo4jClientConfig.getInstance();

    expect(instance.driver).toBe(mockDriver);
    expect(
      (instance as unknown as Record<string, unknown>)["_driver"],
    ).toBeUndefined();
  });

  it("should throw MissingEnvironmentError if NEO4J_URI is missing", async () => {
    const { envConfig } = await import("../env.config");
    const originalUri = envConfig.NEO4J_URI;

    (envConfig as Record<string, unknown>).NEO4J_URI = undefined;

    expect(() => Neo4jClientConfig.getInstance()).toThrow(
      "Missing or invalid environment variables",
    );

    (envConfig as Record<string, unknown>).NEO4J_URI = originalUri;
  });

  it("should use neo4j credentials from env config", () => {
    getNeo4jDriver();

    expect(mockAuth.basic).toHaveBeenCalledWith("neo4j", "test-password-123");
  });
});
