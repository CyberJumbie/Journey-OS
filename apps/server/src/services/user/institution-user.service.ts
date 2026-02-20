/**
 * Institution-scoped user list and invitation service.
 * [STORY-IA-1] Two separate Supabase queries (profiles + invitations),
 * merged and sorted in-memory, then paginated.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  InstitutionUserListQuery,
  InstitutionUserListResponse,
  InstitutionUserListItem,
  InstitutionUserSortField,
  InviteUserRequest,
  InviteUserResponse,
} from "@journey-os/types";
import { AuthRole } from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";
import { DuplicateInvitationError } from "../../errors/invitation.error";
import { UserInvitationEmailService } from "../email/user-invitation-email.service";

const ALLOWED_SORT_FIELDS = new Set<InstitutionUserSortField>([
  "full_name",
  "email",
  "role",
  "status",
  "last_login_at",
  "created_at",
]);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const INVITATION_EXPIRY_DAYS = 14;

export class InstitutionUserService {
  readonly #supabaseClient: SupabaseClient;
  readonly #emailService: UserInvitationEmailService;

  constructor(
    supabaseClient: SupabaseClient,
    emailService: UserInvitationEmailService,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#emailService = emailService;
  }

  async list(
    institutionId: string,
    query: InstitutionUserListQuery,
  ): Promise<InstitutionUserListResponse> {
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

    // Query 1: registered profiles for this institution
    let profileQuery = this.#supabaseClient
      .from("profiles")
      .select(
        "id, email, full_name, role, is_course_director, is_active, last_login_at, created_at",
      )
      .eq("institution_id", institutionId);

    if (query.role) {
      profileQuery = profileQuery.eq("role", query.role);
    }

    if (query.status === "active") {
      profileQuery = profileQuery.eq("is_active", true);
    } else if (query.status === "inactive") {
      profileQuery = profileQuery.eq("is_active", false);
    }

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      profileQuery = profileQuery.or(
        `full_name.ilike.${searchTerm},email.ilike.${searchTerm}`,
      );
    }

    // Query 2: pending invitations for this institution
    let invitationQuery = this.#supabaseClient
      .from("invitations")
      .select("id, email, role, created_at, expires_at")
      .eq("institution_id", institutionId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    if (query.role) {
      invitationQuery = invitationQuery.eq("role", query.role);
    }

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      invitationQuery = invitationQuery.ilike("email", searchTerm);
    }

    // If filtering by status, skip invitations for active/inactive, skip profiles for pending
    const skipInvitations =
      query.status === "active" || query.status === "inactive";
    const skipProfiles = query.status === "pending";

    const [profileResult, invitationResult] = await Promise.all([
      skipProfiles ? Promise.resolve({ data: [], error: null }) : profileQuery,
      skipInvitations
        ? Promise.resolve({ data: [], error: null })
        : invitationQuery,
    ]);

    if (profileResult.error) {
      throw new ValidationError(
        `Failed to fetch profiles: ${profileResult.error.message}`,
      );
    }
    if (invitationResult.error) {
      throw new ValidationError(
        `Failed to fetch invitations: ${invitationResult.error.message}`,
      );
    }

    // Map profiles to unified list items
    const profileItems: InstitutionUserListItem[] = (
      profileResult.data ?? []
    ).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      email: row.email as string,
      full_name: row.full_name as string | null,
      role: row.role as AuthRole,
      is_course_director: (row.is_course_director as boolean) ?? false,
      is_active: (row.is_active as boolean) ?? true,
      status: (row.is_active as boolean) ? "active" : ("inactive" as const),
      last_login_at: row.last_login_at as string | null,
      created_at: row.created_at as string,
    }));

    // Map invitations to unified list items
    const invitationItems: InstitutionUserListItem[] = (
      invitationResult.data ?? []
    ).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      email: row.email as string,
      full_name: null,
      role: row.role as AuthRole,
      is_course_director: false,
      is_active: false,
      status: "pending" as const,
      last_login_at: null,
      created_at: row.created_at as string,
    }));

    // Merge and sort in-memory
    const allItems = [...profileItems, ...invitationItems];
    allItems.sort((a, b) => {
      const aVal = this.#getSortValue(a, sortBy);
      const bVal = this.#getSortValue(b, sortBy);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    // Paginate
    const total = allItems.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      users: paginatedItems,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  async invite(
    institutionId: string,
    invitedBy: { id: string; full_name: string; institution_name: string },
    payload: InviteUserRequest,
  ): Promise<InviteUserResponse> {
    // Validate CD flag
    if (payload.is_course_director && payload.role !== AuthRole.FACULTY) {
      throw new ValidationError(
        "Course director flag is only valid for faculty role",
      );
    }

    // Check for duplicate active invitation
    const { data: existing } = await this.#supabaseClient
      .from("invitations")
      .select("id")
      .eq("email", payload.email)
      .eq("institution_id", institutionId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      throw new DuplicateInvitationError();
    }

    // Check if user already exists at this institution
    const { data: existingUser } = await this.#supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", payload.email)
      .eq("institution_id", institutionId)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      throw new ValidationError(
        "A user with this email already exists at this institution",
      );
    }

    // Create invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const { data: invitation, error } = await this.#supabaseClient
      .from("invitations")
      .insert({
        token,
        email: payload.email,
        role: payload.role,
        institution_id: institutionId,
        created_by: invitedBy.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, email, role, expires_at")
      .single();

    if (error) {
      throw new ValidationError(
        `Failed to create invitation: ${error.message}`,
      );
    }

    // Send email (stub at MVP)
    await this.#emailService.sendInvitation(
      payload.email,
      payload.role,
      invitedBy.full_name,
      invitedBy.institution_name,
      token,
    );

    return {
      invitation_id: invitation.id as string,
      email: invitation.email as string,
      role: invitation.role as string,
      expires_at: invitation.expires_at as string,
    };
  }

  #getSortValue(
    item: InstitutionUserListItem,
    field: InstitutionUserSortField,
  ): string {
    switch (field) {
      case "full_name":
        return (item.full_name ?? "").toLowerCase();
      case "email":
        return item.email.toLowerCase();
      case "role":
        return item.role;
      case "status":
        return item.status;
      case "last_login_at":
        return item.last_login_at ?? "";
      case "created_at":
        return item.created_at;
    }
  }
}
