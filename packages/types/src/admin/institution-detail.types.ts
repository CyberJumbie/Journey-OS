/** Full institution detail (returned by GET /:id/detail) */
export interface InstitutionDetail {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly institution_type: string | null;
  readonly accreditation_body: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly metrics: InstitutionMetrics;
  readonly user_breakdown: readonly UserBreakdownEntry[];
  readonly activity_timeline: readonly ActivityTimelineEntry[];
  readonly monthly_active_users: readonly MonthlyTrend[];
  readonly monthly_questions: readonly MonthlyTrend[];
  readonly storage: StorageUsage;
}

/** Aggregated usage metrics */
export interface InstitutionMetrics {
  readonly total_users: number;
  readonly active_users_30d: number;
  readonly total_courses: number;
  readonly total_questions_generated: number;
  readonly total_questions_approved: number;
}

/** User count per role */
export interface UserBreakdownEntry {
  readonly role: string;
  readonly count: number;
}

/** Activity timeline entry */
export interface ActivityTimelineEntry {
  readonly id: string;
  readonly action: string;
  readonly actor_name: string;
  readonly actor_email: string;
  readonly description: string;
  readonly created_at: string;
}

/** Monthly trend data point for charts */
export interface MonthlyTrend {
  readonly month: string; // "2026-01", "2026-02"
  readonly value: number;
}

/** Storage usage statistics */
export interface StorageUsage {
  readonly document_count: number;
  readonly total_size_bytes: number;
}
