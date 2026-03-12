import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new AdminController();

// All admin routes require superadmin or institutional_admin auth
router.use(authMiddleware, requireRole(['superadmin', 'institutional_admin']));

// GET /api/v1/admin/lint-results — fetch latest lint run results
router.get('/lint-results', (req, res) => controller.getLintResults(req, res));

// POST /api/v1/admin/lint-run — manually trigger a lint run
router.post('/lint-run', (req, res) => controller.triggerLintRun(req, res));

// GET /api/v1/admin/golden-dataset — shows golden items + latest regression scores
router.get('/golden-dataset', (req, res) => controller.getGoldenDataset(req, res));

// POST /api/v1/admin/golden-run — manually trigger golden regression
router.post('/golden-run', (req, res) => controller.triggerGoldenRun(req, res));

export default router;
