import type { Request, Response } from 'express';
import { z } from 'zod';
import { ConceptMappingService } from '../services/concept-mapping.service';

/**
 * Zod schema for PATCH /api/v1/concept-mappings/:chunkUuid/:subConceptUuid/verify body.
 */
const VerifyMappingSchema = z.object({
  action: z.enum(['verify', 'reject']),
});

/**
 * Zod schema for POST /api/v1/courses/:courseId/concept-mappings/bulk-verify body.
 */
const BulkVerifySchema = z.object({
  threshold: z.coerce.number().min(0).max(1).default(0.85),
});

/**
 * ConceptMappingController — parse request, Zod validate, call service, format response.
 * No business logic. No DB access.
 */
export class ConceptMappingController {
  private readonly service: ConceptMappingService;

  constructor() {
    this.service = new ConceptMappingService();
  }

  /**
   * GET /api/v1/courses/:courseId/concept-mappings
   * Returns pending TEACHES edges for a course with chunk excerpt, concept name, confidence.
   */
  async getMappings(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const courseId = req.params.courseId as string | undefined;
      if (!courseId) {
        res.status(400).json({ error: 'Missing courseId parameter' });
        return;
      }

      const mappings = await this.service.getMappings(courseId);
      res.json({ mappings });
    } catch (err) {
      console.error('Failed to get concept mappings:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PATCH /api/v1/concept-mappings/:chunkUuid/:subConceptUuid/verify
   * Verify or reject a single TEACHES mapping.
   */
  async verifyMapping(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const chunkUuid = req.params.chunkUuid as string | undefined;
      const subConceptUuid = req.params.subConceptUuid as string | undefined;
      if (!chunkUuid || !subConceptUuid) {
        res.status(400).json({ error: 'Missing chunkUuid or subConceptUuid parameter' });
        return;
      }

      const parseResult = VerifyMappingSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { action } = parseResult.data;

      if (action === 'verify') {
        await this.service.verifyMapping(chunkUuid, subConceptUuid, user.userId);
      } else {
        await this.service.rejectMapping(chunkUuid, subConceptUuid, user.userId);
      }

      res.json({ success: true, action });
    } catch (err) {
      console.error('Failed to verify/reject mapping:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/courses/:courseId/concept-mappings/bulk-verify
   * Bulk-verify all high-confidence TEACHES mappings for a course.
   */
  async bulkVerify(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const courseId = req.params.courseId as string | undefined;
      if (!courseId) {
        res.status(400).json({ error: 'Missing courseId parameter' });
        return;
      }

      const parseResult = BulkVerifySchema.safeParse(req.body ?? {});
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await this.service.bulkVerifyHighConfidence(
        courseId,
        user.userId,
        parseResult.data.threshold,
      );

      res.json(result);
    } catch (err) {
      console.error('Failed to bulk verify mappings:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
