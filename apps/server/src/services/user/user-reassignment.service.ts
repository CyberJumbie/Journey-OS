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

    // 5. Execute transactional reassignment (profile update + course archival + audit log)
    const wasCourseDirector = user.is_course_director;
    const reassignedAt = new Date().toISOString();
    const { coursesArchived, auditLogId } = await this.#executeReassignment(
      userId,
      targetInstitutionId,
      user.updated_at,
      adminUserId,
      user.institution_id!,
      fromInstitution.name,
      toInstitution.name,
      wasCourseDirector,
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

  async #executeReassignment(
    userId: string,
    targetInstitutionId: string,
    expectedUpdatedAt: string,
    adminUserId: string,
    fromInstitutionId: string,
    fromInstitutionName: string,
    toInstitutionName: string,
    wasCourseDirector: boolean,
    reason: string | null,
  ): Promise<{ coursesArchived: number; auditLogId: string }> {
    const { data, error } = await this.#supabaseClient.rpc("reassign_user", {
      p_user_id: userId,
      p_target_institution_id: targetInstitutionId,
      p_expected_updated_at: expectedUpdatedAt,
      p_admin_user_id: adminUserId,
      p_from_institution_id: fromInstitutionId,
      p_from_institution_name: fromInstitutionName,
      p_to_institution_name: toInstitutionName,
      p_was_course_director: wasCourseDirector,
      p_reason: reason,
    });

    if (error) {
      if (error.message.includes("CONCURRENT_MODIFICATION")) {
        throw new ConcurrentModificationError();
      }
      throw new UserReassignmentError(
        `Reassignment transaction failed: ${error.message}`,
      );
    }

    const result = data as { courses_archived: number; audit_log_id: string };

    return {
      coursesArchived: result.courses_archived,
      auditLogId: result.audit_log_id,
    };
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
