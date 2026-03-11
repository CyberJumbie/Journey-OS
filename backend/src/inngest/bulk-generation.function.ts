import InngestClientSingleton from '../lib/InngestClient';
import SocketServer from '../lib/SocketServer';
import { runSingleGeneration } from '../pipeline/run-single';
import { BatchService } from '../services/batch.service';

/**
 * Inngest event payload shape for journey/batch.requested.
 */
interface BatchRequestedData {
  batchId: string;
  courseId: string;
  topicIds: string[];
  count: number;
  userId: string;
  batchItemIds: string[];
}

const batchService = new BatchService();

/**
 * Inngest function: bulk-generation
 *
 * Triggered by the 'journey/batch.requested' event.
 * Iterates over topic IDs and generates one assessment item per topic
 * using the existing LangGraph pipeline (via runSingleGeneration).
 *
 * Key rules:
 * - Rule 14: Every item is wrapped in `await step.run(...)`.
 * - INNGEST_NO_THROW: Errors inside step.run are caught, item marked failed, never rethrown.
 * - Concurrency limit: 5 parallel generations max.
 * - Max 2 retries at the function level (Inngest config).
 */
export const bulkGenerationFunction = InngestClientSingleton.getInstance().createFunction(
  {
    id: 'bulk-generation',
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: 'journey/batch.requested' },
  async ({ event, step }) => {
    const {
      batchId,
      courseId,
      topicIds,
      userId,
      batchItemIds,
    } = event.data as BatchRequestedData;

    // Process each topic sequentially with step boundaries
    // Each step.run is independently retriable by Inngest
    for (let i = 0; i < topicIds.length; i++) {
      const topicId = topicIds[i];
      const batchItemId = batchItemIds[i];

      if (!topicId || !batchItemId) continue;

      await step.run(`generate-item-${i}-${topicId}`, async () => {
        try {
          const result = await runSingleGeneration({
            courseId,
            topicId,
            userId,
          });

          // Mark this batch item as completed with the generated item ID
          await batchService.markItemCompleted(batchId, batchItemId, result.itemId);

          // Emit socket event for real-time UI update (P2-012)
          SocketServer.emitToUser(userId, 'batch:item:completed', {
            batchId,
            itemId: result.itemId,
            status: 'completed',
          });
        } catch (err: unknown) {
          // INNGEST_NO_THROW: never rethrow inside step.run
          // Catch, log, mark item failed, continue to next item
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(
            `[bulk-generation] Item ${i} failed for topic ${topicId}:`,
            errorMessage,
          );

          await batchService.markItemFailed(batchId, batchItemId, errorMessage);

          // Emit socket event for failed item (P2-012)
          SocketServer.emitToUser(userId, 'batch:item:completed', {
            batchId,
            itemId: batchItemId,
            status: 'failed',
          });
          // Intentionally NOT rethrowing — batch continues on single failure
        }
      });
    }

    // Finalize the batch after all items processed
    await step.run('finalize-batch', async () => {
      await batchService.finalizeBatch(batchId);
    });

    // Emit batch:completed socket event (P2-012)
    // Separate step so finalization is not blocked by socket emission
    await step.run('notify-batch-completed', async () => {
      try {
        const detail = await batchService.getBatchDetail(batchId, userId);
        SocketServer.emitToUser(userId, 'batch:completed', {
          batchId,
          completedCount: detail.batch.completed_count,
          failedCount: detail.batch.failed_count,
        });
      } catch {
        // Graceful degradation: if fetch fails, emit with best-effort counts
        SocketServer.emitToUser(userId, 'batch:completed', {
          batchId,
          completedCount: topicIds.length,
          failedCount: 0,
        });
      }
    });

    return { batchId, status: 'done' };
  },
);
