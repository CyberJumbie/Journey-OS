import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new DashboardController();

// GET /api/v1/dashboard/admin — superadmin + institutional_admin
router.get(
  '/admin',
  requireRole(['superadmin', 'institutional_admin']),
  (req, res) => controller.getAdminDashboard(req, res),
);

// GET /api/v1/dashboard/faculty — faculty only
router.get(
  '/faculty',
  requireRole(['faculty']),
  (req, res) => controller.getFacultyDashboard(req, res),
);

// GET /api/v1/dashboard/student — student only
router.get(
  '/student',
  requireRole(['student']),
  (req, res) => controller.getStudentDashboard(req, res),
);

// GET /api/v1/dashboard/institution — institutional_admin only
router.get(
  '/institution',
  requireRole(['institutional_admin']),
  (req, res) => controller.getInstitutionDashboard(req, res),
);

// GET /api/v1/dashboard/institution/coverage — institutional_admin only
router.get(
  '/institution/coverage',
  requireRole(['institutional_admin']),
  (req, res) => controller.getInstitutionCoverage(req, res),
);

export default router;
