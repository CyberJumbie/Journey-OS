/**
 * Institution types.
 * [STORY-U-8] Institutions table per SUPABASE_DDL_v1.md.
 */

export type InstitutionStatus = "waitlisted" | "approved" | "suspended";

export interface Institution {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly status: InstitutionStatus;
  readonly approved_at: string | null;
  readonly approved_by: string | null;
  readonly settings: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Lightweight result for institution search dropdown */
export interface InstitutionSearchResult {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
}
