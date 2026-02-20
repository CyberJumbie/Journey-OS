"use client";

import { useAdminDashboard } from "@web/hooks/use-admin-dashboard";
import { KPICard } from "./kpi-card";
import { QuickActionCard } from "./quick-action-card";
import type { QuickAction } from "@journey-os/types";

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: "Manage Users",
    href: "/institution/users",
    icon: "👥",
    description: "View and invite users",
  },
  {
    label: "View Coverage",
    href: "/institution/coverage",
    icon: "📊",
    description: "Curriculum coverage map",
  },
  {
    label: "View Sync Status",
    href: "/institution/sync",
    icon: "🔄",
    description: "Data sync health monitor",
  },
  {
    label: "Browse Knowledge Graph",
    href: "/institution/knowledge-graph",
    icon: "🧠",
    description: "Explore knowledge graph",
  },
];

function KPISkeletons() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-warm-gray" />
      ))}
    </div>
  );
}

function SystemHealthSkeleton() {
  return <div className="h-24 animate-pulse rounded-lg bg-warm-gray" />;
}

export function AdminDashboard() {
  const { data, isLoading, error, refetch } = useAdminDashboard();

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <KPISkeletons />
        <SystemHealthSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, system_health } = data;
  const storagePercent =
    system_health.storage_limit_mb > 0
      ? (system_health.storage_used_mb / system_health.storage_limit_mb) * 100
      : 0;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
          {error} — showing stale data.{" "}
          <button
            type="button"
            onClick={() => refetch()}
            className="font-medium underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label={kpis.total_users.label}
          value={kpis.total_users.value}
          previousValue={kpis.total_users.previous_value}
          trend={kpis.total_users.trend}
          sparkline={kpis.total_users.sparkline}
        />
        <KPICard
          label={kpis.active_courses.label}
          value={kpis.active_courses.value}
          previousValue={kpis.active_courses.previous_value}
          trend={kpis.active_courses.trend}
          sparkline={kpis.active_courses.sparkline}
        />
        <KPICard
          label={kpis.questions_generated.label}
          value={kpis.questions_generated.value}
          previousValue={kpis.questions_generated.previous_value}
          trend={kpis.questions_generated.trend}
          sparkline={kpis.questions_generated.sparkline}
        />
        <KPICard
          label={kpis.sync_health.label}
          value={kpis.sync_health.value}
          previousValue={kpis.sync_health.previous_value}
          trend={kpis.sync_health.trend}
          sparkline={kpis.sync_health.sparkline}
          unit="%"
        />
      </div>

      {/* System Health */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-text-primary">
          System Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              API Response (p95)
            </p>
            <p className="font-serif text-xl font-semibold text-text-primary">
              {system_health.api_response_p95_ms}
              <span className="text-sm font-normal text-text-secondary">
                {" "}
                ms
              </span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              Error Rate (24h)
            </p>
            <p className="font-serif text-xl font-semibold text-text-primary">
              {(system_health.error_rate_24h * 100).toFixed(2)}
              <span className="text-sm font-normal text-text-secondary">%</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              Storage Usage
            </p>
            <p className="font-serif text-xl font-semibold text-text-primary">
              {system_health.storage_used_mb.toLocaleString()}
              <span className="text-sm font-normal text-text-secondary">
                {" "}
                / {system_health.storage_limit_mb.toLocaleString()} MB
              </span>
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-warm-gray">
              <div
                className="h-full rounded-full bg-blue-mid"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold text-text-primary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.href}
              label={action.label}
              href={action.href}
              icon={action.icon}
              description={action.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
