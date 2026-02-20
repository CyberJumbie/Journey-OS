/**
 * User reassignment service.
 * [STORY-SA-4] Reassigns a user from one institution to another.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { UserReassignmentResult } from "@journey-os/types";
import {
  SameInstitutionError,
  UserNotFoundError,
  InstitutionNotFoundError,
  ConcurrentModificationError,
  UserReassignmentError,
} from "../../errors";
import type { ReassignmentEmailProvider } from "../email/reassignment-email.service";

interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly institution_id: string | null;
  readonly is_course_director: boolean;
  readonly updated_at: string;
}

interface InstitutionRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

export class UserReassignmentService {
  readonly #supabaseClient: SupabaseClient;
  readonly #emailService: ReassignmentEmailProvider;

  constructor(
    supabaseClient: SupabaseClient,
    emailService: ReassignmentEmailProvider,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#emailService = emailService;
  }

  async reassign(
    userId: string,
    targetInstitutionId: string,
    reason: string | null,
    adminUserId: string,
  ): Promise<UserReassignmentResult> {
    // 1. Fetch user profile
    const user = await this.#fetchUser(userId);

    // 2. Validate same institution guard
    if (user.institution_id === targetInstitutionId) {
      throw new SameInstitutionError();
    }

    // 3. Fetch source institution
    const fromInstitution = await this.#fetchInstitution(
      user.institution_id!,
      false,
    );

    // 4. Fetch and validate target institution (must be approved)
    const toInstitution = await this.#fetchInstitution(
      targetInstitutionId,
      true,
    );

    // 5. Update profile: institution_id + reset CD flag
    const wasCourseDirector = user.is_course_director;
    await this.#updateProfile(userId, targetInstitutionId, user.updated_at);

    // 6. Archive course memberships for old institution
    const coursesArchived = await this.#archiveCourseMemberships(userId);

    // 7. Create audit log entry
    const reassignedAt = new Date().toISOString();
    const auditLogId = await this.#createAuditLog(
      adminUserId,
      userId,
      user.institution_id!,
      targetInstitutionId,
      fromInstitution.name,
      toInstitution.name,
      wasCourseDirector,
      coursesArchived,
      reason,
    );

    // 8. Send notification email (stubbed)
    await this.#emailService.sendNotification({
      userEmail: user.email,
      userName: user.full_name,
      fromInstitutionName: fromInstitution.name,
      toInstitutionName: toInstitution.name,
      reason,
    });

    // 9. Neo4j dual-write (stubbed for Sprint 3)
    await this.#tryNeo4jWrite(userId, targetInstitutionId);

    return {
      user_id: userId,
      from_institution_id: fromInstitution.id,
      from_institution_name: fromInstitution.name,
      to_institution_id: toInstitution.id,
      to_institution_name: toInstitution.name,
      courses_archived: coursesArchived,
      course_director_reset: wasCourseDirector,
      audit_log_id: auditLogId,
      reassigned_at: reassignedAt,
    };
  }

  async #fetchUser(id: string): Promise<UserProfile> {
    const { data, error } = await this.#supabaseClient
      .from("profiles")
      .select(
        "id, email, full_name, institution_id, is_course_director, updated_at",
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new UserNotFoundError(id);
    }

    return data as UserProfile;
  }

  async #fetchInstitution(
    id: string,
    requireApproved: boolean,
  ): Promise<InstitutionRow> {
    const { data, error } = await this.#supabaseClient
      .from("institutions")
      .select("id, name, status")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new InstitutionNotFoundError(id);
    }

    const institution = data as InstitutionRow;

    if (requireApproved && institution.status !== "approved") {
      throw new InstitutionNotFoundError(id);
    }

    return institution;
  }

  async #updateProfile(
    userId: string,
    targetInstitutionId: string,
    expectedUpdatedAt: string,
  ): Promise<void> {
    const { data, error } = await this.#supabaseClient
      .from("profiles")
      .update({
        institution_id: targetInstitutionId,
        is_course_director: false,
      })
      .eq("id", userId)
      .eq("updated_at", expectedUpdatedAt)
      .select("id")
      .single();

    if (error || !data) {
      throw new ConcurrentModificationError();
    }
  }

  async #archiveCourseMemberships(userId: string): Promise<number> {
    const { data } = await this.#supabaseClient
      .from("course_members")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active")
      .select("id");

    return data?.length ?? 0;
  }

  async #createAuditLog(
    adminUserId: string,
    userId: string,
    fromInstitutionId: string,
    toInstitutionId: string,
    fromInstitutionName: string,
    toInstitutionName: string,
    wasCourseDirector: boolean,
    coursesArchived: number,
    reason: string | null,
  ): Promise<string> {
    const { data, error } = await this.#supabaseClient
      .from("audit_log")
      .insert({
        user_id: adminUserId,
        action: "user_reassignment",
        entity_type: "profile",
        entity_id: userId,
        old_values: {
          institution_id: fromInstitutionId,
          is_course_director: wasCourseDirector,
        },
        new_values: {
          institution_id: toInstitutionId,
          is_course_director: false,
        },
        metadata: {
          from_institution_name: fromInstitutionName,
          to_institution_name: toInstitutionName,
          courses_archived: coursesArchived,
          reason,
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new UserReassignmentError(
        `Failed to create audit log: ${error?.message ?? "No data returned"}`,
      );
    }

    return (data as { id: string }).id;
  }

  async #tryNeo4jWrite(
    _userId: string,
    _targetInstitutionId: string,
  ): Promise<void> {
    // Neo4j dual-write stubbed for Sprint 3.
    // When Neo4j driver is available:
    // 1. DELETE old (User)-[:BELONGS_TO]->(Institution) relationship
    // 2. CREATE new (User)-[:BELONGS_TO]->(Institution) relationship
    // On failure, log warning — sync_status tracking deferred to DualWriteService.
  }
}
