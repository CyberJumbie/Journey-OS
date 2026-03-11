import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

// ── Response shapes (mirror backend service responses) ──────────────────────

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

// ── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch admin dashboard data (KPIs, recent users, department stats).
 * Requires superadmin or institutional_admin role.
 */
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiClient.get<AdminDashboardResponse>('/api/v1/dashboard/admin'),
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/**
 * Fetch faculty dashboard data (courses, activity, metrics).
 * Requires faculty role.
 */
export function useFacultyDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'faculty'],
    queryFn: () => apiClient.get<FacultyDashboardResponse>('/api/v1/dashboard/faculty'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch student dashboard data (courses, KPIs, user info).
 * Requires student role.
 */
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => apiClient.get<StudentDashboardResponse>('/api/v1/dashboard/student'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch institution dashboard data (KPIs, user info).
 * Requires institutional_admin role.
 */
export function useInstitutionDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'institution'],
    queryFn: () => apiClient.get<InstitutionDashboardResponse>('/api/v1/dashboard/institution'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch institution coverage breakdown by USMLE system/discipline.
 * Requires institutional_admin role.
 */
export function useInstitutionCoverage() {
  return useQuery({
    queryKey: ['dashboard', 'institution', 'coverage'],
    queryFn: () => apiClient.get<CoverageItem[]>('/api/v1/dashboard/institution/coverage'),
    staleTime: 5 * 60 * 1000,
  });
}
