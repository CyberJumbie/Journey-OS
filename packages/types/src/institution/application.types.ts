/**
 * Waitlist application types.
 * [STORY-SA-1] Public waitlist form for prospective institutional admins.
 * [API_CONTRACT_v1 § Waitlist endpoints]
 */

/** Institution type for medical schools */
export type InstitutionType = "md" | "do" | "combined";

/** Application status in the waitlist pipeline */
export type ApplicationStatus = "pending" | "approved" | "rejected";

/** Waitlist application submission DTO (from public form) */
export interface WaitlistApplicationRequest {
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
}

/** Stored waitlist application record */
export interface WaitlistApplication {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
  readonly status: ApplicationStatus;
  readonly submitted_ip: string;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly rejection_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Public-facing submission response */
export interface WaitlistApplicationResponse {
  readonly id: string;
  readonly institution_name: string;
  readonly status: ApplicationStatus;
  readonly submitted_at: string;
}
