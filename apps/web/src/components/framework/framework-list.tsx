"use client";

import { useState, useEffect, useCallback } from "react";
import type { FrameworkSummary } from "@journey-os/types";
import { FrameworkCard } from "./framework-card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ListState = "loading" | "loaded" | "empty" | "error";

export function FrameworkList() {
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [state, setState] = useState<ListState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchFrameworks = useCallback(async () => {
    setState("loading");
    try {
      const token = ""; // TODO: get from auth context
      const res = await fetch(`${API_URL}/api/v1/institution/frameworks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load frameworks");
        setState("error");
        return;
      }

      const json = await res.json();
      const items: FrameworkSummary[] = json.data?.frameworks ?? [];

      if (items.length === 0) {
        setState("empty");
        return;
      }

      setFrameworks(items);
      setState("loaded");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void fetchFrameworks();
  }, [fetchFrameworks]);

  if (state === "loading") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-gray-900">
          No frameworks have been seeded yet.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Run the seed script to populate educational frameworks.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-red-900">{errorMsg}</p>
        <button
          type="button"
          onClick={() => void fetchFrameworks()}
          className="mt-4 rounded-md bg-[#2b71b9] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b71b9]/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {frameworks.map((fw) => (
        <FrameworkCard
          key={fw.framework_key}
          frameworkKey={fw.framework_key}
          name={fw.name}
          description={fw.description}
          nodeCount={fw.node_count}
          hierarchyDepth={fw.hierarchy_depth}
          icon={fw.icon}
        />
      ))}
    </div>
  );
}
