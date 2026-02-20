import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardData, AdminKPI } from "@journey-os/types";

export class AdminDashboardService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getDashboardData(institutionId: string): Promise<AdminDashboardData> {
    const [totalUsers, activeCourses, questionsGenerated, syncHealth] =
      await Promise.all([
        this.#getTotalUsers(institutionId),
        this.#getActiveCourses(institutionId),
        this.#getQuestionsGenerated(institutionId),
        this.#getSyncHealth(),
      ]);

    const systemHealth = await this.#getSystemHealth();

    return {
      kpis: {
        total_users: totalUsers,
        active_courses: activeCourses,
        questions_generated: questionsGenerated,
        sync_health: syncHealth,
      },
      system_health: systemHealth,
    };
  }

  #computeTrend(value: number, previousValue: number): "up" | "down" | "flat" {
    if (value > previousValue) return "up";
    if (value < previousValue) return "down";
    return "flat";
  }

  #buildKPI(label: string, value: number, previousValue: number): AdminKPI {
    return {
      label,
      value,
      previous_value: previousValue,
      trend: this.#computeTrend(value, previousValue),
      sparkline: [0, 0, 0, 0, 0, 0, value],
    };
  }

  async #getTotalUsers(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    const value = error ? 0 : (count ?? 0);
    return this.#buildKPI("Total Users", value, 0);
  }

  async #getActiveCourses(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .eq("status", "active");

    const value = error ? 0 : (count ?? 0);
    return this.#buildKPI("Active Courses", value, 0);
  }

  async #getQuestionsGenerated(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("generated_questions")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    const value = error ? 0 : (count ?? 0);
    return this.#buildKPI("Questions Generated", value, 0);
  }

  async #getSyncHealth(): Promise<AdminKPI> {
    // TODO: calculate from sync_status columns once DualWriteService is active
    return this.#buildKPI("Sync Health", 100, 100);
  }

  async #getSystemHealth(): Promise<AdminDashboardData["system_health"]> {
    // TODO: pull from request_logs / error_logs when those tables exist
    return {
      api_response_p95_ms: 0,
      error_rate_24h: 0,
      storage_used_mb: 0,
      storage_limit_mb: 8192,
    };
  }
}
