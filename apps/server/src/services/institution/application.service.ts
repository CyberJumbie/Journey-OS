import { SupabaseClient } from "@supabase/supabase-js";
import type {
  WaitlistApplicationRequest,
  WaitlistApplicationResponse,
  InstitutionType,
} from "@journey-os/types";
import {
  DuplicateApplicationError,
  InvalidApplicationError,
} from "../../errors/application.error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+\..+/;
const VALID_INSTITUTION_TYPES = new Set<InstitutionType>([
  "md",
  "do",
  "combined",
]);
const HTML_TAG_REGEX = /<[^>]*>/g;

export class ApplicationService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async submit(
    data: WaitlistApplicationRequest,
    ip: string,
  ): Promise<WaitlistApplicationResponse> {
    this.#validate(data);

    const sanitized = {
      institution_name: this.#sanitize(data.institution_name).trim(),
      institution_type: data.institution_type,
      accreditation_body: this.#sanitize(data.accreditation_body).trim(),
      contact_name: this.#sanitize(data.contact_name).trim(),
      contact_email: data.contact_email.trim().toLowerCase(),
      contact_phone: this.#sanitize(data.contact_phone ?? "").trim(),
      student_count: data.student_count,
      website_url: this.#sanitize(data.website_url ?? "").trim(),
      reason: this.#sanitize(data.reason ?? "").trim(),
    };

    await this.#checkDuplicate(
      sanitized.contact_email,
      sanitized.institution_name,
    );

    const { data: row, error } = await this.#supabaseClient
      .from("waitlist_applications")
      .insert({
        ...sanitized,
        status: "pending",
        submitted_ip: ip,
      })
      .select("id, institution_name, status, created_at")
      .single();

    if (error) {
      throw new InvalidApplicationError(
        `Failed to submit application: ${error.message}`,
      );
    }

    return {
      id: row.id,
      institution_name: row.institution_name,
      status: row.status,
      submitted_at: row.created_at,
    };
  }

  #validate(data: WaitlistApplicationRequest): void {
    if (!data.institution_name || data.institution_name.trim().length < 3) {
      throw new InvalidApplicationError(
        "Institution name is required (minimum 3 characters)",
      );
    }

    if (!VALID_INSTITUTION_TYPES.has(data.institution_type)) {
      throw new InvalidApplicationError(
        "Institution type must be one of: md, do, combined",
      );
    }

    if (!data.accreditation_body || !data.accreditation_body.trim()) {
      throw new InvalidApplicationError("Accreditation body is required");
    }

    if (!data.contact_name || data.contact_name.trim().length < 2) {
      throw new InvalidApplicationError(
        "Contact name is required (minimum 2 characters)",
      );
    }

    if (!data.contact_email || !EMAIL_REGEX.test(data.contact_email.trim())) {
      throw new InvalidApplicationError("Valid email address is required");
    }

    if (
      typeof data.student_count !== "number" ||
      !Number.isInteger(data.student_count) ||
      data.student_count <= 0
    ) {
      throw new InvalidApplicationError(
        "Student count must be a positive integer",
      );
    }

    if (
      data.website_url &&
      data.website_url.trim() &&
      !URL_REGEX.test(data.website_url.trim())
    ) {
      throw new InvalidApplicationError(
        "Website URL must be a valid URL starting with http:// or https://",
      );
    }
  }

  #sanitize(value: string): string {
    return value.replace(HTML_TAG_REGEX, "");
  }

  async #checkDuplicate(email: string, institutionName: string): Promise<void> {
    const { data: existing, error } = await this.#supabaseClient
      .from("waitlist_applications")
      .select("id")
      .eq("status", "pending")
      .or(`contact_email.eq.${email},institution_name.eq.${institutionName}`)
      .limit(1);

    if (error) {
      return;
    }

    if (existing && existing.length > 0) {
      throw new DuplicateApplicationError();
    }
  }
}
