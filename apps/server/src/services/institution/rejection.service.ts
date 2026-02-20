import { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationRejectionResult } from "@journey-os/types";
import { ApplicationNotFoundError } from "../../errors/application.error";
import {
  ApplicationAlreadyProcessedError,
  RejectionReasonRequiredError,
} from "../../errors/rejection.error";
import type { RejectionEmailProvider } from "../email/rejection-email.service";

/**
 * Handles application rejection workflow.
 * [STORY-SA-6] SuperAdmin rejects waitlist applications with mandatory reason.
 */
export class RejectionService {
  readonly #supabaseClient: SupabaseClient;
  readonly #emailService: RejectionEmailProvider;

  constructor(
    supabaseClient: SupabaseClient,
    emailService: RejectionEmailProvider,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#emailService = emailService;
  }

  async reject(
    applicationId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<ApplicationRejectionResult> {
    // 1. Validate reason
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      throw new RejectionReasonRequiredError();
    }

    // 2. Fetch application
    const { data: application, error: fetchError } = await this.#supabaseClient
      .from("waitlist_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    // 3. Validate status is pending
    if (application.status !== "pending") {
      throw new ApplicationAlreadyProcessedError(applicationId);
    }

    // 4. Update application with rejection
    const now = new Date().toISOString();
    const { error: updateError } = await this.#supabaseClient
      .from("waitlist_applications")
      .update({
        status: "rejected",
        rejection_reason: trimmedReason,
        reviewed_by: rejectedBy,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", applicationId)
      .eq("status", "pending"); // Optimistic lock

    if (updateError) {
      throw new ApplicationAlreadyProcessedError(applicationId);
    }

    // 5. Send rejection email (best-effort)
    try {
      await this.#emailService.sendNotification({
        contactEmail: application.contact_email as string,
        contactName: application.contact_name as string,
        institutionName: application.institution_name as string,
        rejectionReason: trimmedReason,
      });
    } catch (emailError) {
      console.error(
        `[rejection-service] Failed to send rejection email for ${applicationId}:`,
        emailError,
      );
    }

    return {
      application_id: applicationId,
      institution_name: application.institution_name as string,
      status: "rejected",
      rejection_reason: trimmedReason,
      rejected_by: rejectedBy,
      rejected_at: now,
    };
  }
}
