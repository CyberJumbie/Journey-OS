import type {
  AdminKPIs,
  RecentUser,
  DepartmentStat,
  FacultyCourse,
  ActivityItem,
  StudentCourse,
  StudentKPIs,
  InstitutionKPIs,
  CoverageItem,
} from '@journey-os/shared-types';
import { DashboardRepository } from '../repositories/dashboard.repository';

// ── Response shapes ─────────────────────────────────────────────────────────

export interface AdminDashboardResponse {
  kpis: AdminKPIs;
  recentUsers: RecentUser[];
  departmentStats: DepartmentStat[];
  systemAlerts: never[];
}

export interface FacultyDashboardResponse {
  courses: FacultyCourse[];
  activity: ActivityItem[];
  metrics: {
    activeCourses: number;
    totalStudents: number;
    totalQuestions: number;
  };
}

export interface StudentDashboardResponse {
  courses: StudentCourse[];
  kpis: StudentKPIs;
  user: {
    displayName: string;
    role: string;
    yearLevel: string;
  };
}

export interface InstitutionDashboardResponse {
  kpis: InstitutionKPIs;
  user: {
    displayName: string;
    institutionName: string;
  };
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * DashboardService — orchestrates dashboard data assembly.
 * Calls DashboardRepository for all DB access. No direct queries.
 */
export class DashboardService {
  private readonly repo: DashboardRepository;

  constructor() {
    this.repo = new DashboardRepository();
  }

  /**
   * Assemble the admin dashboard: KPIs, recent users, department stats.
   */
  async getAdminDashboard(institutionId: string): Promise<AdminDashboardResponse> {
    const [kpis, recentUsers, departmentStats] = await Promise.all([
      this.repo.getAdminKPIs(institutionId),
      this.repo.getRecentUsers(institutionId, 10),
      this.repo.getDepartmentStats(institutionId),
    ]);

    return {
      kpis,
      recentUsers,
      departmentStats,
      systemAlerts: [],
    };
  }

  /**
   * Assemble the faculty dashboard: courses, activity, aggregate metrics.
   */
  async getFacultyDashboard(userId: string): Promise<FacultyDashboardResponse> {
    const [courses, activity] = await Promise.all([
      this.repo.getFacultyCourses(userId),
      this.repo.getFacultyActivity(userId, 20),
    ]);

    const totalQuestions = courses.reduce((sum, c) => sum + c.item_count, 0);

    return {
      courses,
      activity,
      metrics: {
        activeCourses: courses.length,
        totalStudents: 0, // TODO: populate when enrollment table exists
        totalQuestions,
      },
    };
  }

  /**
   * Assemble the student dashboard: courses, KPIs, user info.
   */
  async getStudentDashboard(
    userId: string,
    displayName: string,
    role: string,
  ): Promise<StudentDashboardResponse> {
    const [courses, kpis] = await Promise.all([
      this.repo.getStudentCourses(userId),
      this.repo.getStudentKPIs(userId),
    ]);

    return {
      courses,
      kpis,
      user: {
        displayName,
        role,
        yearLevel: '', // TODO: populate from user profile when field exists
      },
    };
  }

  /**
   * Assemble the institution dashboard: KPIs, user info.
   */
  async getInstitutionDashboard(
    institutionId: string,
    displayName: string,
    institutionName: string,
  ): Promise<InstitutionDashboardResponse> {
    const kpis = await this.repo.getInstitutionKPIs(institutionId);

    return {
      kpis,
      user: {
        displayName,
        institutionName,
      },
    };
  }

  /**
   * Get institution coverage breakdown by USMLE system/discipline.
   */
  async getInstitutionCoverage(institutionId: string): Promise<CoverageItem[]> {
    return this.repo.getInstitutionCoverage(institutionId);
  }
}
