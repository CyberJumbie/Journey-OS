import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const controller = new UploadController();

// All upload routes require faculty auth
router.use(authMiddleware, requireRole(['faculty', 'superadmin']));

// Multer config: memory storage, 50MB limit, PDF only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/v1/uploads — upload a PDF syllabus
router.post('/', upload.single('file'), (req, res) => controller.upload(req, res));

// POST /api/v1/uploads/:id/parse — trigger PDF parsing
router.post('/:id/parse', (req, res) => controller.parseUpload(req, res));

// GET /api/v1/uploads/:id — get upload status
router.get('/:id', (req, res) => controller.getUpload(req, res));

export default router;
