"use client";

import { useState, useEffect, useCallback } from "react";
import type { KpiMetric, KpiPeriod, KpiResponse } from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface UseDashboardKpisReturn {
  readonly metrics: readonly KpiMetric[];
  readonly period: KpiPeriod;
  readonly setPeriod: (period: KpiPeriod) => void;
  readonly loading: boolean;
  readonly error: string;
  readonly refetch: () => void;
}

export function useDashboardKpis(userId: string): UseDashboardKpisReturn {
  const [metrics, setMetrics] = useState<readonly KpiMetric[]>([]);
  const [period, setPeriod] = useState<KpiPeriod>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = ""; // TODO: get from auth context
      const res = await fetch(
        `${API_URL}/api/v1/dashboard/kpis?user_id=${encodeURIComponent(userId)}&period=${encodeURIComponent(period)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(
          (json as { error?: { message?: string } }).error?.message ??
            "Failed to load KPIs",
        );
        setLoading(false);
        return;
      }

      const json = (await res.json()) as { data: KpiResponse };
      setMetrics(json.data.metrics);
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return { metrics, period, setPeriod, loading, error, refetch: fetchKpis };
}
