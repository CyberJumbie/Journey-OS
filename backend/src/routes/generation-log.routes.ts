import { Router } from 'express';
import { GenerationLogController } from '../controllers/generation-log.controller';
import { requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new GenerationLogController();

// All generation-log routes require faculty+ role
router.use(requireRole(['faculty', 'institutional_admin', 'superadmin']));

// GET /api/v1/generation-logs — paginated history for authenticated user
router.get('/', (req, res) => controller.list(req, res));

export default router;
