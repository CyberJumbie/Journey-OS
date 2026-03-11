import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { InvitationController } from '../controllers/invitation.controller';

const router: Router = Router();
const controller = new InvitationController();

// POST /api/v1/invitations — send an invite
router.post(
  '/',
  authMiddleware,
  requireRole(['superadmin', 'institutional_admin']),
  (req, res) => controller.invite(req, res),
);

export default router;
