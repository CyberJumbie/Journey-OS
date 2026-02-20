import { SupabaseClient } from "@supabase/supabase-js";
import type {
  InstitutionListQuery,
  InstitutionListResponse,
  InstitutionListItem,
  InstitutionListSortField,
  InstitutionMonitoringStatus,
} from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";

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
}
