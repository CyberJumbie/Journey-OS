import type { SupabaseClient } from '@supabase/supabase-js';
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
import SupabaseClientSingleton from '../lib/SupabaseClient';

/**
 * DashboardRepository — all dashboard-related DB queries live here.
 * Supabase only. No business logic. No Neo4j (dashboard queries are aggregate counts).
 */
export class DashboardRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  // ── Admin Dashboard ──────────────────────────────────────────────────────

  /**
   * Get aggregate KPI counts for the admin dashboard.
   * Counts users, courses, and assessment items scoped to institution.
   */
  async getAdminKPIs(institutionId: string): Promise<AdminKPIs> {
    const [usersResult, coursesResult, itemsResult, approvedResult, pendingResult, draftResult] =
      await Promise.all([
        this.supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId),
        this.supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId),
        this.supabase
          .from('assessment_items')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId),
        this.supabase
          .from('assessment_items')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('status', 'approved'),
        this.supabase
          .from('assessment_items')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('status', 'pending_review'),
        this.supabase
          .from('assessment_items')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('status', 'draft'),
      ]);

    if (usersResult.error) throw new Error(`Failed to count users: ${usersResult.error.message}`);
    if (coursesResult.error) throw new Error(`Failed to count courses: ${coursesResult.error.message}`);
    if (itemsResult.error) throw new Error(`Failed to count items: ${itemsResult.error.message}`);
    if (approvedResult.error) throw new Error(`Failed to count approved items: ${approvedResult.error.message}`);
    if (pendingResult.error) throw new Error(`Failed to count pending items: ${pendingResult.error.message}`);
    if (draftResult.error) throw new Error(`Failed to count draft items: ${draftResult.error.message}`);

    const totalItems = itemsResult.count ?? 0;
    const approvedItems = approvedResult.count ?? 0;

    return {
      total_users: usersResult.count ?? 0,
      total_courses: coursesResult.count ?? 0,
      total_items: totalItems,
      items_approved: approvedItems,
      items_pending_review: pendingResult.count ?? 0,
      items_draft: draftResult.count ?? 0,
      average_coverage: totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0,
    };
  }

  /**
   * Get the most recently created users for the institution.
   * Ordered by created_at DESC, limited.
   */
  async getRecentUsers(institutionId: string, limit: number): Promise<RecentUser[]> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, display_name, email, role, created_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent users: ${error.message}`);
    }

    return (data ?? []) as RecentUser[];
  }

  /**
   * Get department-level statistics by grouping courses by code prefix.
   * Derives department from course code prefix (e.g., "MEDI" from "MEDI 530").
   * Counts courses and assessment items per department.
   */
  async getDepartmentStats(institutionId: string): Promise<DepartmentStat[]> {
    // Fetch all courses for the institution
    const { data: courses, error: coursesError } = await this.supabase
      .from('courses')
      .select('id, code')
      .eq('institution_id', institutionId);

    if (coursesError) {
      throw new Error(`Failed to fetch courses for dept stats: ${coursesError.message}`);
    }

    if (!courses || courses.length === 0) {
      return [];
    }

    // Group courses by department prefix (first word of course code)
    const deptCourseMap = new Map<string, string[]>();
    for (const course of courses) {
      const dept = (course.code as string).split(/\s+/)[0] ?? 'OTHER';
      const existing = deptCourseMap.get(dept) ?? [];
      existing.push(course.id as string);
      deptCourseMap.set(dept, existing);
    }

    // Count items per department by querying items for each department's course IDs
    const stats: DepartmentStat[] = [];

    for (const [dept, courseIds] of deptCourseMap.entries()) {
      const { count, error: countError } = await this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds);

      if (countError) {
        throw new Error(`Failed to count items for department ${dept}: ${countError.message}`);
      }

      stats.push({
        department: dept,
        course_count: courseIds.length,
        item_count: count ?? 0,
      });
    }

    // Sort by item_count DESC for consistent ordering
    stats.sort((a, b) => b.item_count - a.item_count);

    return stats;
  }

  // ── Faculty Dashboard ────────────────────────────────────────────────────

  /**
   * Get courses for a faculty member's institution with per-course item counts.
   * TODO: Replace with course_faculty join table when available.
   * Currently returns all courses for the faculty member's institution.
   */
  async getFacultyCourses(userId: string): Promise<FacultyCourse[]> {
    // First get the user's institution
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile?.institution_id) {
      return [];
    }

    // Get all courses for the institution
    const { data: courses, error: coursesError } = await this.supabase
      .from('courses')
      .select('id, code, title, description, academic_year, phase')
      .eq('institution_id', profile.institution_id as string)
      .order('code', { ascending: true });

    if (coursesError) {
      throw new Error(`Failed to fetch faculty courses: ${coursesError.message}`);
    }

    if (!courses || courses.length === 0) {
      return [];
    }

    // Count items per course
    const result: FacultyCourse[] = [];
    for (const course of courses) {
      const { count, error: countError } = await this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id as string);

      if (countError) {
        throw new Error(`Failed to count items for course ${course.id}: ${countError.message}`);
      }

      result.push({
        id: course.id as string,
        code: course.code as string,
        title: course.title as string,
        description: (course.description as string | null) ?? null,
        academic_year: (course.academic_year as string | null) ?? null,
        phase: (course.phase as string | null) ?? null,
        item_count: count ?? 0,
      });
    }

    return result;
  }

  /**
   * Get recent assessment item activity for a faculty member.
   * Returns items created by the faculty member, ordered by created_at DESC.
   */
  async getFacultyActivity(userId: string, limit: number): Promise<ActivityItem[]> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .select('id, course_id, status, stem, bloom_level, created_at, courses!inner(code)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch faculty activity: ${error.message}`);
    }

    return (data ?? []).map((item) => ({
      id: item.id as string,
      course_id: (item.course_id as string | null) ?? null,
      course_code: ((item.courses as unknown as Record<string, unknown>)?.code as string | null) ?? null,
      status: item.status as string,
      stem: (item.stem as string | null) ?? null,
      bloom_level: (item.bloom_level as number | null) ?? null,
      created_at: item.created_at as string,
    }));
  }

  // ── Student Dashboard ────────────────────────────────────────────────────

  /**
   * Get courses available to a student with per-course item counts.
   * TODO: Replace with enrollment table when available.
   * Currently returns all courses for the student's institution.
   */
  async getStudentCourses(userId: string): Promise<StudentCourse[]> {
    // Get the student's institution
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch student profile: ${profileError.message}`);
    }

    if (!profile?.institution_id) {
      return [];
    }

    // Get all courses for the institution
    const { data: courses, error: coursesError } = await this.supabase
      .from('courses')
      .select('id, code, title, description, academic_year, phase')
      .eq('institution_id', profile.institution_id as string)
      .order('code', { ascending: true });

    if (coursesError) {
      throw new Error(`Failed to fetch student courses: ${coursesError.message}`);
    }

    if (!courses || courses.length === 0) {
      return [];
    }

    // Count items per course
    const result: StudentCourse[] = [];
    for (const course of courses) {
      const { count, error: countError } = await this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id as string);

      if (countError) {
        throw new Error(`Failed to count items for course ${course.id}: ${countError.message}`);
      }

      result.push({
        id: course.id as string,
        code: course.code as string,
        title: course.title as string,
        description: (course.description as string | null) ?? null,
        academic_year: (course.academic_year as string | null) ?? null,
        phase: (course.phase as string | null) ?? null,
        item_count: count ?? 0,
      });
    }

    return result;
  }

  /**
   * Get aggregate KPIs for a student.
   * TODO: When exam/enrollment tables exist, calculate from actual student interactions.
   * Currently computes from institution-level assessment item data.
   */
  async getStudentKPIs(userId: string): Promise<StudentKPIs> {
    // Get the student's institution
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch student profile: ${profileError.message}`);
    }

    if (!profile?.institution_id) {
      return { enrolled_courses: 0, available_items: 0, approved_items: 0 };
    }

    const institutionId = profile.institution_id as string;

    const [coursesResult, itemsResult, approvedResult] = await Promise.all([
      this.supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('status', 'approved'),
    ]);

    if (coursesResult.error) throw new Error(`Failed to count courses: ${coursesResult.error.message}`);
    if (itemsResult.error) throw new Error(`Failed to count items: ${itemsResult.error.message}`);
    if (approvedResult.error) throw new Error(`Failed to count approved: ${approvedResult.error.message}`);

    return {
      enrolled_courses: coursesResult.count ?? 0,
      available_items: itemsResult.count ?? 0,
      approved_items: approvedResult.count ?? 0,
    };
  }

  // ── Institution Dashboard ────────────────────────────────────────────────

  /**
   * Get aggregate KPIs for the institution dashboard.
   * Includes user breakdowns by role and item statistics.
   */
  async getInstitutionKPIs(institutionId: string): Promise<InstitutionKPIs> {
    const [
      usersResult,
      facultyResult,
      studentsResult,
      coursesResult,
      itemsResult,
      approvedResult,
    ] = await Promise.all([
      this.supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      this.supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('role', 'faculty'),
      this.supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('role', 'student'),
      this.supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      this.supabase
        .from('assessment_items')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('status', 'approved'),
    ]);

    if (usersResult.error) throw new Error(`Failed to count users: ${usersResult.error.message}`);
    if (facultyResult.error) throw new Error(`Failed to count faculty: ${facultyResult.error.message}`);
    if (studentsResult.error) throw new Error(`Failed to count students: ${studentsResult.error.message}`);
    if (coursesResult.error) throw new Error(`Failed to count courses: ${coursesResult.error.message}`);
    if (itemsResult.error) throw new Error(`Failed to count items: ${itemsResult.error.message}`);
    if (approvedResult.error) throw new Error(`Failed to count approved items: ${approvedResult.error.message}`);

    const totalItems = itemsResult.count ?? 0;
    const approvedItems = approvedResult.count ?? 0;

    return {
      total_users: usersResult.count ?? 0,
      total_faculty: facultyResult.count ?? 0,
      total_students: studentsResult.count ?? 0,
      total_courses: coursesResult.count ?? 0,
      total_items: totalItems,
      items_approved: approvedItems,
      average_coverage: totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0,
    };
  }

  /**
   * Get assessment item coverage grouped by USMLE system and discipline.
   * Returns counts for each category to show content distribution.
   */
  async getInstitutionCoverage(institutionId: string): Promise<CoverageItem[]> {
    // Get all items with their USMLE tags
    const { data: items, error } = await this.supabase
      .from('assessment_items')
      .select('usmle_system, usmle_discipline')
      .eq('institution_id', institutionId);

    if (error) {
      throw new Error(`Failed to fetch coverage data: ${error.message}`);
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Aggregate by usmle_system
    const systemCounts = new Map<string, number>();
    const disciplineCounts = new Map<string, number>();

    for (const item of items) {
      const system = item.usmle_system as string | null;
      const discipline = item.usmle_discipline as string | null;

      if (system) {
        systemCounts.set(system, (systemCounts.get(system) ?? 0) + 1);
      }
      if (discipline) {
        disciplineCounts.set(discipline, (disciplineCounts.get(discipline) ?? 0) + 1);
      }
    }

    const result: CoverageItem[] = [];

    for (const [category, count] of systemCounts.entries()) {
      result.push({
        category,
        category_type: 'usmle_system',
        item_count: count,
      });
    }

    for (const [category, count] of disciplineCounts.entries()) {
      result.push({
        category,
        category_type: 'usmle_discipline',
        item_count: count,
      });
    }

    // Sort by item_count DESC within each category type
    result.sort((a, b) => {
      if (a.category_type !== b.category_type) {
        return a.category_type === 'usmle_system' ? -1 : 1;
      }
      return b.item_count - a.item_count;
    });

    return result;
  }
}
