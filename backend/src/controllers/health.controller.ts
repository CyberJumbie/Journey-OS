import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

const healthService = new HealthService();

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const result = await healthService.check();
    res.json(result);
  }
}
