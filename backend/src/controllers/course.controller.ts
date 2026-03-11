import type { Request, Response } from 'express';
import { CourseService } from '../services/course.service';

/**
 * CourseController — parse request, call service, return response.
 * No business logic. No DB access.
 */
export class CourseController {
  private readonly courseService: CourseService;

  constructor() {
    this.courseService = new CourseService();
  }

  /**
   * GET /api/v1/courses
   * Returns courses for the authenticated user's institution.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (!user.institutionId) {
        res.status(403).json({ error: 'User has no institution assigned' });
        return;
      }

      const courses = await this.courseService.getCourses(user.institutionId);
      res.json(courses);
    } catch (err) {
      console.error('Failed to list courses:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
