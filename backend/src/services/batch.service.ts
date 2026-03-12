import InngestClientSingleton from '../lib/InngestClient';
import {
  BatchRepository,
  type BulkBatchRow,
  type EnrichedBatchItemRow,
} from '../repositories/batch.repository';

/**
 * Shape of the Inngest event payload for batch generation.
 */
interface BatchRequestedPayload {
  batchId: string;
  courseId: string;
  topicIds: string[];
  count: number;
  userId: string;
  batchItemIds: string[];
}

/**
 * Response shape for batch detail (batch + enriched items).
 */
export interface BatchDetailResponse {
  batch: BulkBatchRow;
  items: EnrichedBatchItemRow[];
}

/**
 * Input for creating a batch.
 */
export interface CreateBatchInput {
  courseId: string;
  topicIds: string[];
  count: number;
  userId: string;
}

/** Estimated USD cost per item (Sonnet generation + Haiku tagging + Opus critic). */
const ESTIMATED_COST_PER_ITEM = 0.08;

/**
 * BatchService — business logic for bulk generation batches.
 * Calls BatchRepository for DB access. Fires Inngest events.
 * No direct DB queries. No HTTP concepts.
 */
export class BatchService {
  private readonly batchRepo: BatchRepository;

  constructor() {
    this.batchRepo = new BatchRepository();
  }

  /**
   * Create a new batch, insert placeholder items, and fire the Inngest event.
   * Returns the batch ID so the caller can poll status.
   */
  async createBatch(input: CreateBatchInput): Promise<{ batchId: string }> {
    const { courseId, topicIds, count, userId } = input;

    // Determine actual count: min(count, topicIds.length) capped at 20
    const actualCount = Math.min(count, topicIds.length, 20);

    if (actualCount < 1) {
      throw new Error('Must request at least 1 item to generate');
    }

    // 1. Create batch row in Supabase
    const batch = await this.batchRepo.createBatch({
      course_id: courseId,
      user_id: userId,
      total_count: actualCount,
      estimated_cost: actualCount * ESTIMATED_COST_PER_ITEM,
    });

    // 2. Create placeholder batch item rows
    const batchItems = await this.batchRepo.createBatchItems(batch.id, actualCount);
    const batchItemIds = batchItems.map((item) => item.id);

    // 3. Fire Inngest event to start background generation
    const inngest = InngestClientSingleton.getInstance();
    await inngest.send({
      name: 'journey/batch.requested',
      data: {
        batchId: batch.id,
        courseId,
        topicIds: topicIds.slice(0, actualCount),
        count: actualCount,
        userId,
        batchItemIds,
      } satisfies BatchRequestedPayload,
    });

    // 4. Mark batch as running
    await this.batchRepo.updateBatchStatus(batch.id, 'running');

    return { batchId: batch.id };
  }

  /**
   * Get batch detail with all items.
   */
  async getBatchDetail(batchId: string, userId: string): Promise<BatchDetailResponse> {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new BatchNotFoundError(batchId);
    }

    // Ownership check: only the user who created the batch can view it
    if (batch.user_id !== userId) {
      throw new BatchForbiddenError(batchId);
    }

    const items = await this.batchRepo.findEnrichedItemsByBatchId(batchId);

    return { batch, items };
  }

  /**
   * Retry a single failed batch item by resetting its status to pending
   * and firing a new Inngest event for it.
   */
  async retryItem(
    batchId: string,
    batchItemId: string,
    userId: string,
  ): Promise<void> {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new BatchNotFoundError(batchId);
    }
    if (batch.user_id !== userId) {
      throw new BatchForbiddenError(batchId);
    }

    const batchItem = await this.batchRepo.findBatchItemById(batchItemId);
    if (!batchItem) {
      throw new BatchItemNotFoundError(batchItemId);
    }
    if (batchItem.batch_id !== batchId) {
      throw new BatchItemNotFoundError(batchItemId);
    }
    if (batchItem.status !== 'failed') {
      throw new BatchItemNotRetryableError(batchItemId, batchItem.status);
    }

    // Reset the item to pending
    await this.batchRepo.updateBatchItem(batchItemId, {
      status: 'pending',
      error_message: undefined,
    });

    // Decrement the failed count
    await this.batchRepo.decrementFailedCount(batchId);

    // If batch was marked completed/failed, set it back to running
    if (batch.status === 'completed' || batch.status === 'failed') {
      await this.batchRepo.updateBatchStatus(batchId, 'running');
    }

    // Fire Inngest event for just this one item
    const inngest = InngestClientSingleton.getInstance();
    await inngest.send({
      name: 'journey/batch-item.retry',
      data: {
        batchId,
        batchItemId,
        courseId: batch.course_id,
        userId,
      },
    });
  }

  /**
   * List all batches for the authenticated user.
   */
  async listBatches(userId: string): Promise<BulkBatchRow[]> {
    return this.batchRepo.findByUserId(userId);
  }

  /**
   * Mark a single batch item as completed (called from Inngest function).
   */
  async markItemCompleted(
    batchId: string,
    batchItemId: string,
    itemId: string,
  ): Promise<void> {
    await this.batchRepo.updateBatchItem(batchItemId, {
      status: 'completed',
      item_id: itemId,
    });
    await this.batchRepo.incrementCompletedCount(batchId);
  }

  /**
   * Mark a single batch item as failed (called from Inngest function).
   */
  async markItemFailed(
    batchId: string,
    batchItemId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.batchRepo.updateBatchItem(batchItemId, {
      status: 'failed',
      error_message: errorMessage.slice(0, 500), // truncate long errors
    });
    await this.batchRepo.incrementFailedCount(batchId);
  }

  /**
   * Finalize a batch after all items have been processed.
   * Determines final status based on completed/failed counts.
   */
  async finalizeBatch(batchId: string): Promise<void> {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) return;

    const finalStatus: BulkBatchRow['status'] =
      batch.failed_count === batch.total_count ? 'failed' : 'completed';

    await this.batchRepo.updateBatchStatus(batchId, finalStatus);
  }
}

/**
 * Custom error for batch not found.
 */
export class BatchNotFoundError extends Error {
  constructor(batchId: string) {
    super(`Batch ${batchId} not found`);
    this.name = 'BatchNotFoundError';
  }
}

/**
 * Custom error for batch access forbidden.
 */
export class BatchForbiddenError extends Error {
  constructor(batchId: string) {
    super(`You do not have access to batch ${batchId}`);
    this.name = 'BatchForbiddenError';
  }
}

/**
 * Custom error for batch item not found.
 */
export class BatchItemNotFoundError extends Error {
  constructor(batchItemId: string) {
    super(`Batch item ${batchItemId} not found`);
    this.name = 'BatchItemNotFoundError';
  }
}

/**
 * Custom error for batch item not in retryable state.
 */
export class BatchItemNotRetryableError extends Error {
  constructor(batchItemId: string, currentStatus: string) {
    super(
      `Batch item ${batchItemId} cannot be retried (status: ${currentStatus})`,
    );
    this.name = 'BatchItemNotRetryableError';
  }
}
