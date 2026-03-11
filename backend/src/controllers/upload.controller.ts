import type { Request, Response } from 'express';
import { z } from 'zod';
import { UploadService, UploadValidationError } from '../services/upload.service';
import { IngestionService } from '../services/ingestion.service';

const uploadBodySchema = z.object({
  courseId: z.string().uuid('courseId must be a valid UUID'),
});

const uploadParamsSchema = z.object({
  id: z.string().uuid('Upload ID must be a valid UUID'),
});

export class UploadController {
  private readonly uploadService: UploadService;
  private readonly ingestionService: IngestionService;

  constructor() {
    this.uploadService = new UploadService();
    this.ingestionService = new IngestionService();
  }

  async upload(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const body = uploadBodySchema.parse(req.body);

      // Validate file presence
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      // TODO: Extract from JWT auth middleware (P1-003 scope)
      // For now, use placeholder values that will be replaced when auth is wired
      const institutionId = req.headers['x-institution-id'] as string;
      const uploadedBy = req.headers['x-user-id'] as string;

      if (!institutionId || !uploadedBy) {
        res.status(401).json({ error: 'Missing authentication headers' });
        return;
      }

      const result = await this.uploadService.uploadFile({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        courseId: body.courseId,
        institutionId,
        uploadedBy,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      if (err instanceof UploadValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error('Upload failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async parseUpload(req: Request, res: Response): Promise<void> {
    try {
      const params = uploadParamsSchema.parse(req.params);

      // Run full ingestion pipeline: parse -> chunk -> classify -> embed -> extract -> align
      const result = await this.ingestionService.ingest(params.id);

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      if (err instanceof UploadValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error('Parse upload failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUpload(req: Request, res: Response): Promise<void> {
    try {
      const params = uploadParamsSchema.parse(req.params);
      const upload = await this.uploadService.getUpload(params.id);

      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }

      res.json(upload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      console.error('Get upload failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
