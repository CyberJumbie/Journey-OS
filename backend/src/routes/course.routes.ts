import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';

const router: Router = Router();
const controller = new CourseController();

// GET /api/v1/courses — list courses for authenticated user's institution
router.get('/', (req, res) => controller.list(req, res));

export default router;
