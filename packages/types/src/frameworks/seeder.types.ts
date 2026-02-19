import type { Neo4jFrameworkLabel } from "./framework-node.types";

/**
 * Result of a single seeder's execution.
 */
export interface SeedResult {
  readonly framework: string;
  readonly label: Neo4jFrameworkLabel;
  readonly nodesCreated: number;
  readonly nodesUpdated: number;
  readonly relationshipsCreated: number;
  readonly durationMs: number;
  readonly errors: readonly SeedNodeError[];
}

/**
 * Error for a single node that failed to seed.
 */
export interface SeedNodeError {
  readonly nodeId: string;
  readonly label: Neo4jFrameworkLabel;
  readonly message: string;
}

/**
 * Result of verification after seeding.
 */
export interface VerificationResult {
  readonly framework: string;
  readonly label: Neo4jFrameworkLabel;
  readonly expectedCount: number;
  readonly actualCount: number;
  readonly passed: boolean;
  readonly orphanCount: number;
  readonly details: string;
}

/**
 * Interface that all framework seeders must implement.
 */
export interface Seeder {
  readonly name: string;
  readonly label: Neo4jFrameworkLabel;
  seed(): Promise<SeedResult>;
  verify(): Promise<VerificationResult>;
}

/**
 * Configuration for SeedRunner.
 */
export interface SeedRunnerConfig {
  readonly batchSize: number;
  readonly dryRun: boolean;
  readonly frameworks?: string[];
}

/**
 * A batch of MERGE operations to execute in a single transaction.
 */
export interface SeedBatch<T> {
  readonly label: Neo4jFrameworkLabel;
  readonly items: readonly T[];
  readonly mergeQuery: string;
}

/**
 * Aggregate result from SeedRunner.
 */
export interface SeedRunReport {
  readonly results: readonly SeedResult[];
  readonly verifications: readonly VerificationResult[];
  readonly totalNodes: number;
  readonly totalRelationships: number;
  readonly totalDurationMs: number;
  readonly allPassed: boolean;
}
