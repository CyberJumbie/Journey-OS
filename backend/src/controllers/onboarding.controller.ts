import type { Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { OnboardingUpdateSchema } from '@journey-os/shared-types';

export class OnboardingController {
  private readonly service = new OnboardingService();

  async getState(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const state = await this.service.getOnboardingState(req.user.userId);
      res.json(state);
    } catch (err) {
      console.error('Get onboarding state failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateStep(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const parsed = OnboardingUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
        return;
      }

      const result = await this.service.updateOnboarding(req.user.userId, parsed.data);
      res.json(result);
    } catch (err) {
      console.error('Update onboarding failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { display_name, is_course_director } = req.body;
      await this.service.updateProfile(req.user.userId, {
        ...(display_name !== undefined ? { display_name } : {}),
        ...(is_course_director !== undefined ? { is_course_director } : {}),
      });
      res.json({ message: 'Profile updated' });
    } catch (err) {
      console.error('Update profile failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
