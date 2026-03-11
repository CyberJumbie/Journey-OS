import { Router } from 'express';
import { ConceptMappingController } from '../controllers/concept-mapping.controller';
import { requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new ConceptMappingController();

// All concept mapping routes require faculty+ role
router.use(requireRole(['faculty', 'institutional_admin', 'superadmin']));

// GET /api/v1/courses/:courseId/concept-mappings — list pending TEACHES edges
router.get(
  '/courses/:courseId/concept-mappings',
  (req, res) => controller.getMappings(req, res),
);

// PATCH /api/v1/concept-mappings/:chunkUuid/:subConceptUuid/verify — verify or reject
router.patch(
  '/concept-mappings/:chunkUuid/:subConceptUuid/verify',
  (req, res) => controller.verifyMapping(req, res),
);

// POST /api/v1/courses/:courseId/concept-mappings/bulk-verify — bulk verify high confidence
router.post(
  '/courses/:courseId/concept-mappings/bulk-verify',
  (req, res) => controller.bulkVerify(req, res),
);

export default router;
