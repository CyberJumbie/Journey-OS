/**
 * KpiService — calculates faculty dashboard KPI metrics.
 * [STORY-F-7] Queries assessment_items for metric computation with period-over-period trends.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  KpiPeriod,
  KpiMetric,
  KpiResponse,
  TrendDirection,
} from "@journey-os/types";

interface KpiConfig {
  readonly TIME_SAVED_MINUTES_PER_QUESTION: number;
}

interface PeriodBounds {
  readonly currentStart: Date;
  readonly currentEnd: Date;
  readonly previousStart: Date;
  readonly previousEnd: Date;
}

interface PeriodMetrics {
  readonly questionsGenerated: number;
  readonly approvedCount: number;
  readonly reviewedCount: number;
  readonly avgQualityScore: number;
}

export class KpiService {
  readonly #supabase: SupabaseClient;
  readonly #KPI_CONFIG: KpiConfig = {
    TIME_SAVED_MINUTES_PER_QUESTION: 45,
  };

  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }

  async calculateMetrics(
    userId: string,
    period: KpiPeriod,
    userRole: string,
    isCourseDirector: boolean,
    institutionId: string,
  ): Promise<KpiResponse> {
    const bounds = this.#calculatePeriodBounds(period);
    const scope = this.#determineScope(userRole, isCourseDirector);

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.#fetchPeriodMetrics(
        bounds.currentStart,
        bounds.currentEnd,
        scope,
        userId,
        institutionId,
      ),
      this.#fetchPeriodMetrics(
        bounds.previousStart,
        bounds.previousEnd,
        scope,
        userId,
        institutionId,
      ),
    ]);

    const questionsGenerated = this.#buildMetric(
      "questions_generated",
      "Questions Generated",
      currentMetrics.questionsGenerated,
      previousMetrics.questionsGenerated,
      "",
    );

    const approvalRate = this.#buildMetric(
      "approval_rate",
      "Approval Rate",
      currentMetrics.reviewedCount > 0
        ? (currentMetrics.approvedCount / currentMetrics.reviewedCount) * 100
        : 0,
      previousMetrics.reviewedCount > 0
        ? (previousMetrics.approvedCount / previousMetrics.reviewedCount) * 100
        : 0,
      "%",
    );

    const coverageScore = this.#buildMetric(
      "coverage_score",
      "Avg Quality Score",
      currentMetrics.avgQualityScore,
      previousMetrics.avgQualityScore,
      "",
    );

    const timeSavedHours =
      (currentMetrics.questionsGenerated *
        this.#KPI_CONFIG.TIME_SAVED_MINUTES_PER_QUESTION) /
      60;
    const previousTimeSavedHours =
      (previousMetrics.questionsGenerated *
        this.#KPI_CONFIG.TIME_SAVED_MINUTES_PER_QUESTION) /
      60;
    const timeSaved = this.#buildMetric(
      "time_saved",
      "Time Saved",
      timeSavedHours,
      previousTimeSavedHours,
      "hrs",
    );

    return {
      metrics: [questionsGenerated, approvalRate, coverageScore, timeSaved],
      period,
      period_start: bounds.currentStart.toISOString(),
      period_end: bounds.currentEnd.toISOString(),
      scope,
    };
  }

  #calculatePeriodBounds(period: KpiPeriod): PeriodBounds {
    const now = new Date();
    const currentEnd = now;
    let currentStart: Date;

    switch (period) {
      case "7d": {
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 7);
        break;
      }
      case "30d": {
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - 30);
        break;
      }
      case "semester": {
        const month = now.getMonth(); // 0-indexed
        if (month >= 0 && month <= 6) {
          // Jan-Jul → spring semester starts Jan 1
          currentStart = new Date(now.getFullYear(), 0, 1);
        } else {
          // Aug-Dec → fall semester starts Aug 1
          currentStart = new Date(now.getFullYear(), 7, 1);
        }
        break;
      }
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime());
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  #determineScope(
    userRole: string,
    isCourseDirector: boolean,
  ): "personal" | "institution" {
    if (userRole === "faculty" && !isCourseDirector) {
      return "personal";
    }
    return "institution";
  }

  async #fetchPeriodMetrics(
    start: Date,
    end: Date,
    scope: "personal" | "institution",
    userId: string,
    institutionId: string,
  ): Promise<PeriodMetrics> {
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    if (scope === "personal") {
      return this.#fetchPersonalMetrics(userId, startIso, endIso);
    }

    return this.#fetchInstitutionMetrics(institutionId, startIso, endIso);
  }

  async #fetchPersonalMetrics(
    userId: string,
    startIso: string,
    endIso: string,
  ): Promise<PeriodMetrics> {
    // Parallelize all 4 independent queries
    const reviewedStatuses = [
      "approved",
      "retired",
      "revision_requested",
      "in_review",
      "pending_review",
    ];

    const [
      { count: questionsGenerated },
      { count: approvedCount },
      { count: reviewedCount },
      { data: qualityData },
    ] = await Promise.all([
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .eq("status", "approved")
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .in("status", reviewedStatuses)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("quality_score")
        .eq("created_by", userId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .not("quality_score", "is", null),
    ]);

    const avgQualityScore = this.#calculateAvg(
      qualityData as Array<{ quality_score: number }> | null,
    );

    return {
      questionsGenerated: questionsGenerated ?? 0,
      approvedCount: approvedCount ?? 0,
      reviewedCount: reviewedCount ?? 0,
      avgQualityScore,
    };
  }

  async #fetchInstitutionMetrics(
    institutionId: string,
    startIso: string,
    endIso: string,
  ): Promise<PeriodMetrics> {
    // Get all course IDs in institution (courses → programs → institution_id)
    const { data: programData } = await this.#supabase
      .from("programs")
      .select("id")
      .eq("institution_id", institutionId);

    const programIds = (programData ?? []).map((p: { id: string }) => p.id);

    if (programIds.length === 0) {
      return {
        questionsGenerated: 0,
        approvedCount: 0,
        reviewedCount: 0,
        avgQualityScore: 0,
      };
    }

    const { data: courseData } = await this.#supabase
      .from("courses")
      .select("id")
      .in("program_id", programIds);

    const courseIds = (courseData ?? []).map((c: { id: string }) => c.id);

    if (courseIds.length === 0) {
      return {
        questionsGenerated: 0,
        approvedCount: 0,
        reviewedCount: 0,
        avgQualityScore: 0,
      };
    }

    // Parallelize all 4 independent metric queries
    const reviewedStatuses = [
      "approved",
      "retired",
      "revision_requested",
      "in_review",
      "pending_review",
    ];

    const [
      { count: questionsGenerated },
      { count: approvedCount },
      { count: reviewedCount },
      { data: qualityData },
    ] = await Promise.all([
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds)
        .eq("status", "approved")
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds)
        .in("status", reviewedStatuses)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      this.#supabase
        .from("assessment_items")
        .select("quality_score")
        .in("course_id", courseIds)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .not("quality_score", "is", null),
    ]);

    const avgQualityScore = this.#calculateAvg(
      qualityData as Array<{ quality_score: number }> | null,
    );

    return {
      questionsGenerated: questionsGenerated ?? 0,
      approvedCount: approvedCount ?? 0,
      reviewedCount: reviewedCount ?? 0,
      avgQualityScore,
    };
  }

  #calculateAvg(data: Array<{ quality_score: number }> | null): number {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + row.quality_score, 0);
    return sum / data.length;
  }

  #buildMetric(
    key: KpiMetric["key"],
    label: string,
    currentValue: number,
    previousValue: number,
    unit: string,
  ): KpiMetric {
    const trendPercent = this.#calculateTrendPercent(
      currentValue,
      previousValue,
    );
    const trendDirection = this.#calculateTrendDirection(trendPercent);

    return {
      key,
      label,
      value: Math.round(currentValue * 100) / 100,
      unit,
      trend_direction: trendDirection,
      trend_percent: Math.round(trendPercent * 100) / 100,
      previous_value: Math.round(previousValue * 100) / 100,
    };
  }

  #calculateTrendPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  #calculateTrendDirection(trendPercent: number): TrendDirection {
    if (Math.abs(trendPercent) < 1.0) return "flat";
    return trendPercent >= 1.0 ? "up" : "down";
  }
}
