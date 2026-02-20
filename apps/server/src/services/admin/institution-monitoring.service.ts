import { SupabaseClient } from "@supabase/supabase-js";
import type {
  InstitutionListQuery,
  InstitutionListResponse,
  InstitutionListItem,
  InstitutionListSortField,
  InstitutionMonitoringStatus,
  InstitutionDetail,
  InstitutionMetrics,
  UserBreakdownEntry,
  ActivityTimelineEntry,
  MonthlyTrend,
  StorageUsage,
} from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";
import { InstitutionNotFoundError } from "../../errors/registration.error";

const ALLOWED_SORT_FIELDS = new Set<InstitutionListSortField>([
  "name",
  "status",
  "user_count",
  "course_count",
  "last_activity",
  "created_at",
]);

/** Maps display status → DB status for filtering */
const STATUS_TO_DB: Record<InstitutionMonitoringStatus, string | null> = {
  active: "approved",
  pending: "waitlisted",
  suspended: "suspended",
  archived: null,
};

/** Maps DB status → display status */
const DB_STATUS_TO_DISPLAY: Record<string, InstitutionMonitoringStatus> = {
  approved: "active",
  waitlisted: "pending",
  suspended: "suspended",
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class InstitutionMonitoringService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async list(query: InstitutionListQuery): Promise<InstitutionListResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const sortBy = query.sort_by ?? "created_at";
    const sortDir = query.sort_dir ?? "desc";

    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      throw new ValidationError(
        `Invalid sort field: "${sortBy}". Allowed: ${[...ALLOWED_SORT_FIELDS].join(", ")}`,
      );
    }

    const offset = (page - 1) * limit;

    // Map display status to DB status for filtering
    const dbStatus = query.status ? STATUS_TO_DB[query.status] : undefined;

    // "archived" has no DB equivalent — return empty result
    if (query.status === "archived") {
      return {
        institutions: [],
        meta: { page, limit, total: 0, total_pages: 0 },
      };
    }

    const { data, error } = await this.#supabaseClient.rpc(
      "list_institutions_with_counts",
      {
        p_status: dbStatus ?? null,
        p_search: query.search?.trim() || null,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
        p_limit: limit,
        p_offset: offset,
      },
    );

    if (error) {
      throw new ValidationError(
        `Failed to fetch institutions: ${error.message}`,
      );
    }

    const result = data as { rows: Record<string, unknown>[]; total: number };
    const total = result.total;
    const totalPages = Math.ceil(total / limit);

    const institutions: InstitutionListItem[] = result.rows.map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        status:
          DB_STATUS_TO_DISPLAY[row.status as string] ??
          (row.status as InstitutionMonitoringStatus),
        user_count: row.user_count as number,
        course_count: row.course_count as number,
        last_activity: (row.last_activity as string) ?? null,
        created_at: row.created_at as string,
      }),
    );

    return {
      institutions,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getDetail(institutionId: string): Promise<InstitutionDetail> {
    // 1. Fetch institution record
    const { data: institution, error: instError } = await this.#supabaseClient
      .from("institutions")
      .select("*")
      .eq("id", institutionId)
      .single();

    if (instError || !institution) {
      throw new InstitutionNotFoundError(
        `Institution with id "${institutionId}" not found`,
      );
    }

    // 2. Run aggregation queries in parallel
    const [
      userBreakdown,
      activeUsers30d,
      courseCount,
      questionMetrics,
      activityTimeline,
      monthlyActiveUsers,
      monthlyQuestions,
      storage,
    ] = await Promise.all([
      this.#getUserBreakdown(institutionId),
      this.#getActiveUsers30d(institutionId),
      this.#getCourseCount(institutionId),
      this.#getQuestionMetrics(institutionId),
      this.#getActivityTimeline(institutionId),
      this.#getMonthlyActiveUsers(institutionId),
      this.#getMonthlyQuestions(institutionId),
      this.#getStorageUsage(institutionId),
    ]);

    const totalUsers = userBreakdown.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    const metrics: InstitutionMetrics = {
      total_users: totalUsers,
      active_users_30d: activeUsers30d,
      total_courses: courseCount,
      total_questions_generated: questionMetrics.generated,
      total_questions_approved: questionMetrics.approved,
    };

    const record = institution as Record<string, unknown>;

    return {
      id: record.id as string,
      name: record.name as string,
      domain: record.domain as string,
      institution_type: (record.institution_type as string) ?? null,
      accreditation_body: (record.accreditation_body as string) ?? null,
      status: record.status as string,
      created_at: record.created_at as string,
      updated_at: record.updated_at as string,
      metrics,
      user_breakdown: userBreakdown,
      activity_timeline: activityTimeline,
      monthly_active_users: monthlyActiveUsers,
      monthly_questions: monthlyQuestions,
      storage,
    };
  }

  async #getUserBreakdown(
    institutionId: string,
  ): Promise<UserBreakdownEntry[]> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_user_breakdown_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return [];

      return (data as Array<{ role: string; count: number }>).map((row) => ({
        role: row.role,
        count: Number(row.count),
      }));
    } catch {
      return [];
    }
  }

  async #getActiveUsers30d(institutionId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await this.#supabaseClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .gte("last_login_at", thirtyDaysAgo.toISOString());

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async #getCourseCount(institutionId: string): Promise<number> {
    try {
      // courses → programs.institution_id
      const { data, error } = await this.#supabaseClient.rpc(
        "get_course_count_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return 0;
      return Number((data as Array<{ count: number }>)[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }

  async #getQuestionMetrics(
    institutionId: string,
  ): Promise<{ generated: number; approved: number }> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_question_metrics_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return { generated: 0, approved: 0 };
      const row = (data as Array<{ generated: number; approved: number }>)[0];
      return {
        generated: Number(row?.generated ?? 0),
        approved: Number(row?.approved ?? 0),
      };
    } catch {
      return { generated: 0, approved: 0 };
    }
  }

  async #getActivityTimeline(
    institutionId: string,
  ): Promise<ActivityTimelineEntry[]> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_activity_timeline_by_institution",
        { p_institution_id: institutionId, p_limit: 10 },
      );

      if (error) return [];

      return (
        data as Array<{
          id: string;
          action: string;
          actor_name: string;
          actor_email: string;
          description: string;
          created_at: string;
        }>
      ).map((row) => ({
        id: row.id,
        action: row.action,
        actor_name: row.actor_name ?? "System",
        actor_email: row.actor_email ?? "",
        description: row.description ?? row.action,
        created_at: row.created_at,
      }));
    } catch {
      return [];
    }
  }

  async #getMonthlyActiveUsers(institutionId: string): Promise<MonthlyTrend[]> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_monthly_active_users_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return [];

      const raw = (data as Array<{ month: string; value: number }>).map(
        (row) => ({
          month: row.month,
          value: Number(row.value),
        }),
      );

      return this.#fillMissingMonths(raw);
    } catch {
      return [];
    }
  }

  async #getMonthlyQuestions(institutionId: string): Promise<MonthlyTrend[]> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_monthly_questions_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return [];

      const raw = (data as Array<{ month: string; value: number }>).map(
        (row) => ({
          month: row.month,
          value: Number(row.value),
        }),
      );

      return this.#fillMissingMonths(raw);
    } catch {
      return [];
    }
  }

  async #getStorageUsage(institutionId: string): Promise<StorageUsage> {
    try {
      const { data, error } = await this.#supabaseClient.rpc(
        "get_storage_usage_by_institution",
        { p_institution_id: institutionId },
      );

      if (error) return { document_count: 0, total_size_bytes: 0 };

      const row = (
        data as Array<{ document_count: number; total_size_bytes: number }>
      )[0];
      return {
        document_count: Number(row?.document_count ?? 0),
        total_size_bytes: Number(row?.total_size_bytes ?? 0),
      };
    } catch {
      return { document_count: 0, total_size_bytes: 0 };
    }
  }

  /** Fill gaps in monthly trend data with value: 0 for continuous charts */
  #fillMissingMonths(data: MonthlyTrend[]): MonthlyTrend[] {
    const months: MonthlyTrend[] = [];
    const dataMap = new Map(data.map((d) => [d.month, d.value]));
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month, value: dataMap.get(month) ?? 0 });
    }

    return months;
  }
}
