import { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationReviewQuery,
  ApplicationReviewResponse,
  ApplicationReviewItem,
  ApplicationReviewSortField,
  ApplicationDetail,
} from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";
import { ApplicationNotFoundError } from "../../errors/application.error";

const ALLOWED_SORT_FIELDS = new Set<ApplicationReviewSortField>([
  "created_at",
  "institution_name",
]);

const LIST_SELECT_FIELDS =
  "id, institution_name, institution_type, contact_name, contact_email, status, created_at";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ApplicationReviewService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async list(
    query: ApplicationReviewQuery,
  ): Promise<ApplicationReviewResponse> {
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

    let dataQuery = this.#supabaseClient
      .from("waitlist_applications")
      .select(LIST_SELECT_FIELDS)
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    let countQuery = this.#supabaseClient
      .from("waitlist_applications")
      .select("id", { count: "exact", head: true });

    if (query.status && query.status !== "all") {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (dataResult.error) {
      throw new ValidationError(
        `Failed to fetch applications: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const applications: ApplicationReviewItem[] = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        institution_name: row.institution_name as string,
        institution_type:
          row.institution_type as ApplicationReviewItem["institution_type"],
        contact_name: row.contact_name as string,
        contact_email: row.contact_email as string,
        status: row.status as ApplicationReviewItem["status"],
        created_at: row.created_at as string,
      }),
    );

    return {
      applications,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getById(id: string): Promise<ApplicationDetail> {
    const { data, error } = await this.#supabaseClient
      .from("waitlist_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new ApplicationNotFoundError(id);
    }

    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      institution_name: row.institution_name as string,
      institution_type:
        row.institution_type as ApplicationDetail["institution_type"],
      accreditation_body: row.accreditation_body as string,
      contact_name: row.contact_name as string,
      contact_email: row.contact_email as string,
      contact_phone: row.contact_phone as string,
      student_count: row.student_count as number,
      website_url: row.website_url as string,
      reason: row.reason as string,
      status: row.status as ApplicationDetail["status"],
      submitted_ip: row.submitted_ip as string,
      reviewed_by: row.reviewed_by as string | null,
      reviewed_at: row.reviewed_at as string | null,
      rejection_reason: row.rejection_reason as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
