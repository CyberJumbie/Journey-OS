import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

/**
 * DashboardController — parse request, call service, return response.
 * No business logic. No DB access.
 */
export class DashboardController {
  private readonly dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * GET /api/v1/admin/dashboard
   * Returns admin dashboard data scoped to the user's institution.
   */
  async getAdminDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
        return;
      }

      if (!user.institutionId) {
        res.status(403).json({
          error: { code: 'NO_INSTITUTION', message: 'User has no institution assigned' },
        });
        return;
      }

      const data = await this.dashboardService.getAdminDashboard(user.institutionId);
      res.json(data);
    } catch (err) {
      console.error('Failed to get admin dashboard:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load admin dashboard' },
      });
    }
  }

  /**
   * GET /api/v1/faculty/dashboard
   * Returns faculty dashboard data for the authenticated user.
   */
  async getFacultyDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
        return;
      }

      const data = await this.dashboardService.getFacultyDashboard(user.userId);
      res.json(data);
    } catch (err) {
      console.error('Failed to get faculty dashboard:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load faculty dashboard' },
      });
    }
  }

  /**
   * GET /api/v1/student/dashboard
   * Returns student dashboard data for the authenticated user.
   */
  async getStudentDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
        return;
      }

      const data = await this.dashboardService.getStudentDashboard(
        user.userId,
        user.email,
        user.role,
      );
      res.json(data);
    } catch (err) {
      console.error('Failed to get student dashboard:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load student dashboard' },
      });
    }
  }

  /**
   * GET /api/v1/institution/dashboard
   * Returns institution dashboard data for the authenticated admin.
   */
  async getInstitutionDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
        return;
      }

      if (!user.institutionId) {
        res.status(403).json({
          error: { code: 'NO_INSTITUTION', message: 'User has no institution assigned' },
        });
        return;
      }

      const data = await this.dashboardService.getInstitutionDashboard(
        user.institutionId,
        user.email,
        '', // TODO: populate institution name when available on req.user or via lookup
      );
      res.json(data);
    } catch (err) {
      console.error('Failed to get institution dashboard:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load institution dashboard' },
      });
    }
  }

  /**
   * GET /api/v1/institution/coverage
   * Returns coverage breakdown by USMLE system/discipline.
   */
  async getInstitutionCoverage(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' },
        });
        return;
      }

      if (!user.institutionId) {
        res.status(403).json({
          error: { code: 'NO_INSTITUTION', message: 'User has no institution assigned' },
        });
        return;
      }

      const items = await this.dashboardService.getInstitutionCoverage(user.institutionId);
      res.json({ items });
    } catch (err) {
      console.error('Failed to get institution coverage:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load institution coverage' },
      });
    }
  }
}
