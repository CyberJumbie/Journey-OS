import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new CourseController();

// All course routes require auth
router.use(authMiddleware, requireRole(['faculty', 'institutional_admin', 'superadmin']));

// GET /api/v1/courses — list courses for authenticated user's institution
router.get('/', (req, res) => controller.list(req, res));

export default router;
