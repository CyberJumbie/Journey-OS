import neo4j, { type Driver, type Session } from "neo4j-driver";
import { envConfig } from "./env.config";
import { MissingEnvironmentError } from "../errors/auth.errors";

/**
 * Singleton Neo4j driver for server-side operations.
 * [CODE_STANDARDS SS 3.1] — private fields, public getter, constructor DI pattern.
 */
export class Neo4jClientConfig {
  static #instance: Neo4jClientConfig | null = null;
  readonly #driver: Driver;

  private constructor() {
    const missing: string[] = [];
    if (!envConfig.NEO4J_URI) missing.push("NEO4J_URI: NEO4J_URI is required");
    if (!envConfig.NEO4J_USERNAME)
      missing.push("NEO4J_USERNAME: NEO4J_USERNAME is required");
    if (!envConfig.NEO4J_PASSWORD)
      missing.push("NEO4J_PASSWORD: NEO4J_PASSWORD is required");

    if (missing.length > 0) {
      throw new MissingEnvironmentError(missing);
    }

    this.#driver = neo4j.driver(
      envConfig.NEO4J_URI as string,
      neo4j.auth.basic(
        envConfig.NEO4J_USERNAME as string,
        envConfig.NEO4J_PASSWORD as string,
      ),
    );
  }

  static getInstance(): Neo4jClientConfig {
    if (!Neo4jClientConfig.#instance) {
      Neo4jClientConfig.#instance = new Neo4jClientConfig();
    }
    return Neo4jClientConfig.#instance;
  }

  get driver(): Driver {
    return this.#driver;
  }

  createSession(): Session {
    return this.#driver.session();
  }

  async verifyConnectivity(): Promise<void> {
    await this.#driver.verifyConnectivity();
  }

  async close(): Promise<void> {
    await this.#driver.close();
  }

  /** For testing: reset singleton. */
  static resetInstance(): void {
    Neo4jClientConfig.#instance = null;
  }
}

export function getNeo4jDriver(): Driver {
  return Neo4jClientConfig.getInstance().driver;
}
