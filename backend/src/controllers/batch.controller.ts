import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  BatchService,
  BatchNotFoundError,
  BatchForbiddenError,
  BatchItemNotFoundError,
  BatchItemNotRetryableError,
} from '../services/batch.service';

/**
 * Zod schema for POST /api/v1/batches request body.
 */
const CreateBatchBodySchema = z.object({
  courseId: z.string().uuid(),
  topicIds: z.array(z.string().min(1)).min(1).max(20),
  count: z.number().int().min(1).max(20),
});

/**
 * BatchController — parse request, Zod validate, call service, format response.
 * No business logic. No database access.
 */
export class BatchController {
  private readonly batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  /**
   * POST /api/v1/batches
   * Creates a bulk generation batch and fires the Inngest event.
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const parsed = CreateBatchBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await this.batchService.createBatch({
        courseId: parsed.data.courseId,
        topicIds: parsed.data.topicIds,
        count: parsed.data.count,
        userId: user.userId,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Failed to create batch:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/batches/:id
   * Returns batch detail with all item statuses.
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const batchId = req.params['id'] as string | undefined;
      if (!batchId) {
        res.status(400).json({ error: 'Missing batch ID' });
        return;
      }

      const detail = await this.batchService.getBatchDetail(batchId, user.userId);
      res.json(detail);
    } catch (err) {
      if (err instanceof BatchNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof BatchForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Failed to get batch:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/batches
   * Lists all batches for the authenticated user.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const batches = await this.batchService.listBatches(user.userId);
      res.json({ batches });
    } catch (err) {
      console.error('Failed to list batches:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/batches/:id/items/:itemId/retry
   * Retries a failed batch item.
   */
  async retryItem(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const batchId = req.params['id'] as string | undefined;
      const itemId = req.params['itemId'] as string | undefined;
      if (!batchId || !itemId) {
        res.status(400).json({ error: 'Missing batch ID or item ID' });
        return;
      }

      await this.batchService.retryItem(batchId, itemId, user.userId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof BatchNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof BatchForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      if (err instanceof BatchItemNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof BatchItemNotRetryableError) {
        res.status(409).json({ error: err.message });
        return;
      }
      console.error('Failed to retry batch item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
