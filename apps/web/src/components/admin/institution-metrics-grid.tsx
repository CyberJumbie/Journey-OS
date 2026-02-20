"use client";

import type { InstitutionMetrics, StorageUsage } from "@journey-os/types";
import { MetricCard } from "@web/components/admin/metric-card";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export interface InstitutionMetricsGridProps {
  metrics: InstitutionMetrics;
  storage: StorageUsage;
}

export function InstitutionMetricsGrid({
  metrics,
  storage,
}: InstitutionMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <MetricCard label="Total Users" value={metrics.total_users} />
      <MetricCard label="Active Users (30d)" value={metrics.active_users_30d} />
      <MetricCard label="Total Courses" value={metrics.total_courses} />
      <MetricCard
        label="Questions Generated"
        value={metrics.total_questions_generated}
      />
      <MetricCard
        label="Questions Approved"
        value={metrics.total_questions_approved}
      />
      <MetricCard
        label="Storage Used"
        value={formatBytes(storage.total_size_bytes)}
      />
    </div>
  );
}
