/**
 * A single KPI metric with trend and sparkline data.
 */
export interface AdminKPI {
  readonly label: string;
  readonly value: number;
  readonly previous_value: number;
  readonly trend: "up" | "down" | "flat";
  readonly sparkline: readonly number[];
}

/**
 * Complete dashboard data returned by GET /api/v1/institution/dashboard.
 */
export interface AdminDashboardData {
  readonly kpis: {
    readonly total_users: AdminKPI;
    readonly active_courses: AdminKPI;
    readonly questions_generated: AdminKPI;
    readonly sync_health: AdminKPI;
  };
  readonly system_health: {
    readonly api_response_p95_ms: number;
    readonly error_rate_24h: number;
    readonly storage_used_mb: number;
    readonly storage_limit_mb: number;
  };
}

/**
 * Quick action link displayed on the dashboard.
 */
export interface QuickAction {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly description: string;
}
