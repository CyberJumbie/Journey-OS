"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AdminDashboardData } from "@journey-os/types";

const REFRESH_INTERVAL_MS = 60_000;

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/institution/dashboard");
      const json = (await res.json()) as {
        data: AdminDashboardData | null;
        error: { code: string; message: string } | null;
      };
      if (json.error) {
        setError(json.error.message);
      } else {
        setData(json.data);
        setError(null);
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const startInterval = () => {
      intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
