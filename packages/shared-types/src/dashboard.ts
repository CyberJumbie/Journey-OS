// packages/shared-types/src/dashboard.ts
// Dashboard types for admin, faculty, student, and institution dashboards.
// Used by both backend repositories and frontend display components.

// ── Admin Dashboard ──────────────────────────────────────────────────────────

export interface AdminKPIs {
  total_users: number;
  total_courses: number;
  total_items: number;
  items_approved: number;
  items_pending_review: number;
  items_draft: number;
  average_coverage: number;
}

export interface RecentUser {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export interface DepartmentStat {
  department: string;
  course_count: number;
  item_count: number;
}

// ── Faculty Dashboard ────────────────────────────────────────────────────────

export interface FacultyCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  academic_year: string | null;
  phase: string | null;
  item_count: number;
}

export interface ActivityItem {
  id: string;
  course_id: string | null;
  course_code: string | null;
  status: string;
  stem: string | null;
  bloom_level: number | null;
  created_at: string;
}

// ── Student Dashboard ────────────────────────────────────────────────────────

export interface StudentCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  academic_year: string | null;
  phase: string | null;
  item_count: number;
}

export interface StudentKPIs {
  enrolled_courses: number;
  available_items: number;
  approved_items: number;
}

// ── Institution Dashboard ────────────────────────────────────────────────────

export interface InstitutionKPIs {
  total_users: number;
  total_faculty: number;
  total_students: number;
  total_courses: number;
  total_items: number;
  items_approved: number;
  average_coverage: number;
}

export interface CoverageItem {
  category: string;
  category_type: 'usmle_system' | 'usmle_discipline';
  item_count: number;
}
