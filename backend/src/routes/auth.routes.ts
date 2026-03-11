import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new AuthController();

// POST /api/v1/auth/login — email + password login
router.post('/login', (req, res) => controller.login(req, res));

// POST /api/v1/auth/register — faculty registration (Phase 1)
router.post('/register', (req, res) => controller.register(req, res));

// GET /api/v1/auth/me — get current user profile (requires auth)
router.get('/me', authMiddleware, (req, res) => controller.me(req, res));

export default router;
