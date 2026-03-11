import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';

const router: Router = Router();
const controller = new BatchController();

// POST /api/v1/batches — create a bulk generation batch
router.post('/', (req, res) => controller.create(req, res));

// GET /api/v1/batches — list user's batches
router.get('/', (req, res) => controller.list(req, res));

// GET /api/v1/batches/:id — get batch detail with item statuses
router.get('/:id', (req, res) => controller.getById(req, res));

// POST /api/v1/batches/:id/items/:itemId/retry — retry a failed batch item
router.post('/:id/items/:itemId/retry', (req, res) =>
  controller.retryItem(req, res),
);

export default router;
