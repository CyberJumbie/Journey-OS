import type { Driver } from "neo4j-driver";
import type {
  Seeder,
  SeedResult,
  SeedBatch,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";

const DEFAULT_BATCH_SIZE = 50;

/**
 * Abstract base class for all framework seeders.
 * Provides transaction batching and node counting utilities.
 * Subclasses implement seed() and verify() for their specific framework.
 *
 * [CODE_STANDARDS SS 3.1] — JS #private fields, public getters, constructor DI.
 */
export abstract class BaseSeeder implements Seeder {
  abstract readonly name: string;
  abstract readonly label: Neo4jFrameworkLabel;

  readonly #driver: Driver;
  readonly #batchSize: number;

  constructor(driver: Driver, batchSize: number = DEFAULT_BATCH_SIZE) {
    this.#driver = driver;
    this.#batchSize = batchSize;
  }

  abstract seed(): Promise<SeedResult>;
  abstract verify(): Promise<VerificationResult>;

  get batchSize(): number {
    return this.#batchSize;
  }

  /**
   * Execute MERGE queries in transaction batches.
   * Batches items into groups of batchSize and runs each group
   * in a separate write transaction.
   */
  protected async executeBatch<T>(batch: SeedBatch<T>): Promise<{
    nodesCreated: number;
    nodesUpdated: number;
    errors: SeedNodeError[];
  }> {
    let nodesCreated = 0;
    let nodesUpdated = 0;
    const errors: SeedNodeError[] = [];

    const chunks = this.#chunkArray(batch.items, this.#batchSize);

    for (const chunk of chunks) {
      const session = this.#driver.session();
      try {
        await session.executeWrite(async (tx) => {
          for (const item of chunk) {
            try {
              const result = await tx.run(
                batch.mergeQuery,
                item as Record<string, unknown>,
              );
              const counters = result.summary.counters.updates();
              nodesCreated += counters.nodesCreated;
              // If node wasn't created but properties were set, it was updated
              if (counters.nodesCreated === 0 && counters.propertiesSet > 0) {
                nodesUpdated += 1;
              }
            } catch (err) {
              errors.push({
                nodeId: String(
                  (item as Record<string, unknown>).id ?? "unknown",
                ),
                label: batch.label,
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }
        });
      } finally {
        await session.close();
      }
    }

    return { nodesCreated, nodesUpdated, errors };
  }

  /**
   * Count nodes of a specific label in Neo4j.
   */
  protected async countNodes(label: Neo4jFrameworkLabel): Promise<number> {
    const session = this.#driver.session();
    try {
      const result = await session.run(
        `MATCH (n:${label}) RETURN count(n) AS count`,
      );
      const record = result.records[0];
      if (!record) {
        return 0;
      }
      return record.get("count").toNumber();
    } finally {
      await session.close();
    }
  }

  #chunkArray<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size) as T[]);
    }
    return chunks;
  }
}
