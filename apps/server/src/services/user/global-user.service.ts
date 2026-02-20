import { SupabaseClient } from "@supabase/supabase-js";
import type {
  GlobalUserListQuery,
  GlobalUserListResponse,
  GlobalUserListItem,
  GlobalUserSortField,
} from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";

const ALLOWED_SORT_FIELDS = new Set<GlobalUserSortField>([
  "full_name",
  "email",
  "role",
  "is_active",
  "last_login_at",
  "created_at",
]);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export class GlobalUserService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async list(query: GlobalUserListQuery): Promise<GlobalUserListResponse> {
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

    // Build the query for data
    let dataQuery = this.#supabaseClient
      .from("profiles")
      .select(
        "id, email, full_name, role, is_course_director, is_active, institution_id, last_login_at, created_at, institutions(name)",
      )
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    // Build the count query
    let countQuery = this.#supabaseClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Apply filters to both queries
    if (query.role) {
      dataQuery = dataQuery.eq("role", query.role);
      countQuery = countQuery.eq("role", query.role);
    }

    if (query.institution_id) {
      dataQuery = dataQuery.eq("institution_id", query.institution_id);
      countQuery = countQuery.eq("institution_id", query.institution_id);
    }

    if (query.is_active !== undefined) {
      dataQuery = dataQuery.eq("is_active", query.is_active);
      countQuery = countQuery.eq("is_active", query.is_active);
    }

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      const searchFilter = `full_name.ilike.${searchTerm},email.ilike.${searchTerm}`;
      dataQuery = dataQuery.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (dataResult.error) {
      throw new ValidationError(
        `Failed to fetch users: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const users: GlobalUserListItem[] = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        email: row.email as string,
        full_name: row.full_name as string,
        role: row.role as GlobalUserListItem["role"],
        is_course_director: row.is_course_director as boolean,
        is_active: row.is_active as boolean,
        institution_id: row.institution_id as string | null,
        institution_name:
          (row.institutions as { name: string } | null)?.name ?? null,
        last_login_at: row.last_login_at as string | null,
        created_at: row.created_at as string,
      }),
    );

    return {
      users,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }
}
