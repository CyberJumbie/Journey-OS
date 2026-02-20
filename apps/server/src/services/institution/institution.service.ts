/**
 * Institution service — approval workflow.
 * [STORY-SA-5] Creates institutions from approved waitlist applications.
 */

import { randomBytes } from "node:crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import type {
  InstitutionApprovalResult,
  WaitlistApplication,
} from "@journey-os/types";
import {
  ApplicationNotFoundError,
  DuplicateApprovalError,
  DuplicateDomainError,
  InstitutionCreationError,
} from "../../errors";
import type { EmailService } from "../email/invitation-email.service";

const INVITATION_TOKEN_LENGTH = 48;
const INVITATION_EXPIRY_DAYS = 7;

export class InstitutionService {
  readonly #supabaseClient: SupabaseClient;
  readonly #emailService: EmailService;

  constructor(supabaseClient: SupabaseClient, emailService: EmailService) {
    this.#supabaseClient = supabaseClient;
    this.#emailService = emailService;
  }

  async createFromApplication(
    applicationId: string,
    domain: string,
    approverUserId: string,
  ): Promise<InstitutionApprovalResult> {
    // 1. Fetch and validate the application
    const application = await this.#fetchApplication(applicationId);

    if (application.status !== "pending") {
      throw new DuplicateApprovalError(applicationId);
    }

    // 2. Check domain uniqueness
    await this.#assertDomainAvailable(domain);

    // 3. Update application status to approved
    const approvedAt = new Date().toISOString();
    await this.#updateApplicationStatus(
      applicationId,
      approverUserId,
      approvedAt,
    );

    // 4. Create institution record
    let institutionId: string;
    try {
      institutionId = await this.#createInstitution(
        application,
        domain,
        approverUserId,
        approvedAt,
      );
    } catch (error: unknown) {
      // Rollback: revert application status to pending
      await this.#rollbackApplicationStatus(applicationId);
      throw error;
    }

    // 5. Create invitation
    const token = this.#generateToken();
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const invitationId = await this.#createInvitation(
      token,
      application.contact_email,
      institutionId,
      approverUserId,
      expiresAt,
    );

    // 6. Send invitation email (stubbed)
    const inviteLink = `/invite/accept?token=${token}`;
    await this.#emailService.sendInvitation({
      email: application.contact_email,
      institutionName: application.institution_name,
      role: "institutional_admin",
      inviteLink,
      expiresAt,
    });

    // 7. Attempt Neo4j dual-write (optional, best-effort)
    await this.#tryNeo4jWrite(institutionId, application, domain);

    return {
      application_id: applicationId,
      institution_id: institutionId,
      institution_name: application.institution_name,
      institution_domain: domain,
      invitation_id: invitationId,
      invitation_email: application.contact_email,
      invitation_expires_at: expiresAt,
      approved_at: approvedAt,
      approved_by: approverUserId,
    };
  }

  async #fetchApplication(id: string): Promise<WaitlistApplication> {
    const { data, error } = await this.#supabaseClient
      .from("waitlist_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new ApplicationNotFoundError(id);
    }

    return data as WaitlistApplication;
  }

  async #assertDomainAvailable(domain: string): Promise<void> {
    const { data } = await this.#supabaseClient
      .from("institutions")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (data) {
      throw new DuplicateDomainError(domain);
    }
  }

  async #updateApplicationStatus(
    id: string,
    reviewerId: string,
    reviewedAt: string,
  ): Promise<void> {
    const { error } = await this.#supabaseClient
      .from("waitlist_applications")
      .update({
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: reviewedAt,
      })
      .eq("id", id)
      .eq("status", "pending"); // optimistic locking

    if (error) {
      throw new InstitutionCreationError(
        `Failed to update application status: ${error.message}`,
      );
    }
  }

  async #rollbackApplicationStatus(id: string): Promise<void> {
    await this.#supabaseClient
      .from("waitlist_applications")
      .update({
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", id);
  }

  async #createInstitution(
    application: WaitlistApplication,
    domain: string,
    approverUserId: string,
    approvedAt: string,
  ): Promise<string> {
    const { data, error } = await this.#supabaseClient
      .from("institutions")
      .insert({
        name: application.institution_name,
        domain,
        institution_type: application.institution_type,
        accreditation_body: application.accreditation_body,
        status: "approved",
        approved_at: approvedAt,
        approved_by: approverUserId,
        settings: {},
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new InstitutionCreationError(
        `Failed to create institution: ${error?.message ?? "No data returned"}`,
      );
    }

    return (data as { id: string }).id;
  }

  async #createInvitation(
    token: string,
    email: string,
    institutionId: string,
    createdBy: string,
    expiresAt: string,
  ): Promise<string> {
    const { data, error } = await this.#supabaseClient
      .from("invitations")
      .insert({
        token,
        email,
        role: "institutional_admin",
        institution_id: institutionId,
        created_by: createdBy,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new InstitutionCreationError(
        `Failed to create invitation: ${error?.message ?? "No data returned"}`,
      );
    }

    return (data as { id: string }).id;
  }

  #generateToken(): string {
    return randomBytes(36)
      .toString("base64url")
      .slice(0, INVITATION_TOKEN_LENGTH);
  }

  async #tryNeo4jWrite(
    _institutionId: string,
    _application: WaitlistApplication,
    _domain: string,
  ): Promise<void> {
    // Neo4j dual-write stubbed for Sprint 3.
    // When Neo4j driver is available, create (:Institution {id, name, domain, status}) node.
    // On failure, log warning — sync_status tracking deferred to DualWriteService.
  }
}
