import { Router } from 'express';
import { ItemController } from '../controllers/item.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new ItemController();

// All item routes require faculty auth
router.use(authMiddleware, requireRole(['faculty', 'superadmin']));

// GET /api/v1/items — list assessment items (paginated, filterable)
router.get('/', (req, res) => controller.list(req, res));

// GET /api/v1/items/:id/versions — list version history (before /:id to avoid catch)
router.get('/:id/versions', (req, res) => controller.getVersions(req, res));

// GET /api/v1/items/:id — get single assessment item with options
router.get('/:id', (req, res) => controller.getById(req, res));

// PATCH /api/v1/items/:id/content — update item content (review mode save)
router.patch('/:id/content', (req, res) => controller.updateContent(req, res));

// PATCH /api/v1/items/:id — update item status (approve/reject)
router.patch('/:id', (req, res) => controller.updateStatus(req, res));

export default router;
