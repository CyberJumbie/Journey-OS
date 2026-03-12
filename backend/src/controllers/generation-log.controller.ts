import type { Request, Response } from 'express';
import { GenerationHistoryQuerySchema } from '@journey-os/shared-types';
import { GenerationLogService } from '../services/generation-log.service';

/**
 * GenerationLogController — parse request, Zod-validate, call service, respond.
 * No business logic. No DB access.
 */
export class GenerationLogController {
  private readonly service: GenerationLogService;

  constructor() {
    this.service = new GenerationLogService();
  }

  /**
   * GET /api/v1/generation-logs
   * Returns paginated generation history for the authenticated user.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const parsed = GenerationHistoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { page, limit, courseId, autoRoute, dateFrom, dateTo } = parsed.data;

      const result = await this.service.getHistory({
        userId: user.userId,
        page,
        limit,
        courseId,
        autoRoute,
        dateFrom,
        dateTo,
      });

      res.json(result);
    } catch (err) {
      console.error('Failed to fetch generation history:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
