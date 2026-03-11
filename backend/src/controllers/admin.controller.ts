import type { Request, Response } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/admin.service';
import { AdminRepository } from '../repositories/admin.repository';

/**
 * Zod schema for GET /api/v1/admin/lint-results query params.
 */
const LintResultsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 50;
      return isNaN(parsed) ? 50 : Math.min(Math.max(parsed, 1), 200);
    }),
});

/**
 * AdminController — parse request, Zod validate, call service, format response.
 * No business logic. No database access.
 */
export class AdminController {
  private readonly adminService: AdminService;

  constructor() {
    this.adminService = new AdminService(new AdminRepository());
  }

  /**
   * GET /api/v1/admin/lint-results
   * Returns the latest lint run results.
   */
  async getLintResults(req: Request, res: Response): Promise<void> {
    try {
      const parsed = LintResultsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const results = await this.adminService.getLintResults(parsed.data.limit);
      res.json({ results });
    } catch (err) {
      console.error('Failed to get lint results:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/admin/lint-run
   * Manually triggers the data-lint Inngest function.
   */
  async triggerLintRun(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.adminService.triggerLintRun();
      res.json({ success: true, eventId: result.eventId });
    } catch (err) {
      console.error('Failed to trigger lint run:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/admin/golden-dataset
   * Returns golden dataset items with latest regression scores.
   */
  async getGoldenDataset(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.adminService.getGoldenDataset();
      res.json(result);
    } catch (err) {
      console.error('Failed to get golden dataset:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/admin/golden-run
   * Manually triggers the golden regression Inngest function.
   */
  async triggerGoldenRun(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.adminService.triggerGoldenRun();
      res.json({ success: true, eventId: result.eventId });
    } catch (err) {
      console.error('Failed to trigger golden regression:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
