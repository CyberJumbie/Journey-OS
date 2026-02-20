import { SupabaseClient } from "@supabase/supabase-js";
import type { InstitutionStatusChangeResult } from "@journey-os/types";
import {
  InstitutionAlreadySuspendedError,
  InstitutionNotSuspendedError,
  SuspendReasonRequiredError,
  InstitutionLifecycleOperationError,
} from "../../errors/institution-lifecycle.error";
import { InstitutionNotFoundError } from "../../errors/registration.error";

const MIN_REASON_LENGTH = 10;

export class InstitutionLifecycleService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async suspend(
    institutionId: string,
    reason: string,
    actorId: string,
  ): Promise<InstitutionStatusChangeResult> {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      throw new SuspendReasonRequiredError();
    }

    const institution = await this.#getInstitution(institutionId);

    if (institution.status === "suspended") {
      throw new InstitutionAlreadySuspendedError(institutionId);
    }

    const fromStatus = institution.status;

    // Update institution status
    const { error: updateError } = await this.#supabaseClient
      .from("institutions")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .eq("id", institutionId)
      .select()
      .single();

    if (updateError) {
      throw new InstitutionLifecycleOperationError(
        `Failed to suspend institution: ${updateError.message}`,
      );
    }

    // Create audit record
    await this.#createAuditRecord(
      institutionId,
      fromStatus,
      "suspended",
      trimmedReason,
      actorId,
    );

    // Count affected users
    const affectedUsers = await this.#countInstitutionUsers(institutionId);

    return {
      institution_id: institutionId,
      institution_name: institution.name,
      from_status: fromStatus,
      to_status: "suspended",
      reason: trimmedReason,
      changed_by: actorId,
      changed_at: new Date().toISOString(),
      affected_users: affectedUsers,
    };
  }

  async reactivate(
    institutionId: string,
    reason: string | null,
    actorId: string,
  ): Promise<InstitutionStatusChangeResult> {
    const institution = await this.#getInstitution(institutionId);

    if (institution.status !== "suspended") {
      throw new InstitutionNotSuspendedError(institutionId);
    }

    // Update institution status back to approved
    const { error: updateError } = await this.#supabaseClient
      .from("institutions")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", institutionId)
      .select()
      .single();

    if (updateError) {
      throw new InstitutionLifecycleOperationError(
        `Failed to reactivate institution: ${updateError.message}`,
      );
    }

    const trimmedReason = reason?.trim() || null;

    // Create audit record
    await this.#createAuditRecord(
      institutionId,
      "suspended",
      "approved",
      trimmedReason,
      actorId,
    );

    // Count affected users
    const affectedUsers = await this.#countInstitutionUsers(institutionId);

    return {
      institution_id: institutionId,
      institution_name: institution.name,
      from_status: "suspended",
      to_status: "approved",
      reason: trimmedReason,
      changed_by: actorId,
      changed_at: new Date().toISOString(),
      affected_users: affectedUsers,
    };
  }

  async #getInstitution(
    id: string,
  ): Promise<{ id: string; name: string; status: string }> {
    const { data, error } = await this.#supabaseClient
      .from("institutions")
      .select("id, name, status")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new InstitutionNotFoundError(id);
    }

    return data as { id: string; name: string; status: string };
  }

  async #createAuditRecord(
    institutionId: string,
    fromStatus: string,
    toStatus: string,
    reason: string | null,
    actorId: string,
  ): Promise<void> {
    const { error } = await this.#supabaseClient
      .from("institution_status_changes")
      .insert({
        institution_id: institutionId,
        from_status: fromStatus,
        to_status: toStatus,
        reason,
        actor_id: actorId,
      })
      .select()
      .single();

    if (error) {
      throw new InstitutionLifecycleOperationError(
        `Failed to create audit record: ${error.message}`,
      );
    }
  }

  async #countInstitutionUsers(institutionId: string): Promise<number> {
    const { count, error } = await this.#supabaseClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }
}
