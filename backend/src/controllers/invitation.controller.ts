import type { Request, Response } from 'express';
import { InvitationService } from '../services/invitation.service';
import { InviteUserSchema } from '@journey-os/shared-types';
import { AppError } from '../lib/errors';

export class InvitationController {
  private readonly service = new InvitationService();

  async invite(req: Request, res: Response): Promise<void> {
    try {
      const parsed = InviteUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.service.sendInvite(parsed.data, req.user);
      res.status(201).json({
        message: `Invite sent to ${result.email}`,
        user_id: result.userId,
      });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      console.error('Invitation failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
