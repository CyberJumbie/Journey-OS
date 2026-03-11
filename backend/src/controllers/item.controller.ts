import type { Request, Response } from 'express';
import { z } from 'zod';
import { ItemStatusSchema } from '@journey-os/shared-types';
import { ItemService, ForbiddenError, NotFoundError } from '../services/item.service';

/**
 * Zod schema for GET /api/v1/items query params.
 */
const ListItemsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  status: ItemStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Zod schema for PATCH /api/v1/items/:id body.
 * Only allows status transitions that are valid for approve/reject.
 */
const UpdateItemStatusSchema = z.object({
  status: ItemStatusSchema,
});

/**
 * Zod schema for PATCH /api/v1/items/:id body (content update).
 */
const UpdateItemContentSchema = z.object({
  vignette: z.string(),
  stem: z.string(),
  options: z.array(z.object({
    label: z.string(),
    text: z.string(),
    is_correct: z.boolean(),
    rationale: z.string(),
    misconception_targeted: z.string().optional(),
  })),
});

/**
 * ItemController — parse request, Zod validate, call service, format response.
 * No business logic. No DB access.
 */
export class ItemController {
  private readonly itemService: ItemService;

  constructor() {
    this.itemService = new ItemService();
  }

  /**
   * GET /api/v1/items/:id
   * Get a single assessment item with options.
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = req.params.id as string | undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing item ID' });
        return;
      }

      const item = await this.itemService.getById(id, user);
      res.json(item);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Failed to get item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/items
   * List assessment items with optional filters and pagination.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const parseResult = ListItemsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await this.itemService.list(parseResult.data, user);
      res.json(result);
    } catch (err) {
      console.error('Failed to list items:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PATCH /api/v1/items/:id
   * Update the status of an assessment item.
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = req.params.id as string | undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing item ID' });
        return;
      }

      // Zod validate body
      const parseResult = UpdateItemStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const item = await this.itemService.updateStatus(id, parseResult.data.status, user);
      res.json(item);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Failed to update item status:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/items/:id/versions
   * List version history for an assessment item.
   */
  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = req.params.id as string | undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing item ID' });
        return;
      }

      const versions = await this.itemService.getVersions(id, user);
      res.json({ versions });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Failed to get item versions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PATCH /api/v1/items/:id/content
   * Update vignette, stem, and options of an assessment item.
   * Creates a version snapshot first (Rule 27).
   */
  async updateContent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = req.params.id as string | undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing item ID' });
        return;
      }

      const parseResult = UpdateItemContentSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const item = await this.itemService.updateContent(id, parseResult.data, user);
      res.json(item);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Failed to update item content:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
