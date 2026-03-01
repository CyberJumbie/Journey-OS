"use client";

import { useRouter } from "next/navigation";
import type {
  InstitutionListSortField,
  InstitutionMonitoringStatus,
  SortDirection,
} from "@journey-os/types";
import { useInstitutionList } from "@web/hooks/use-institution-list";
import { StatCard } from "@web/components/brand/stat-card";

const STATUS_LABELS: Record<InstitutionMonitoringStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  archived: "Archived",
};

const STATUS_COLORS: Record<InstitutionMonitoringStatus, string> = {
  active: "bg-green/10 text-green",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-error/10 text-error",
  archived: "bg-warm-gray text-text-secondary",
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function InstitutionListDashboard() {
  const router = useRouter();
  const {
    institutions,
    page,
    total,
    totalPages,
    sortBy,
    sortDir,
    searchInput,
    statusFilter,
    status,
    errorMsg,
    setPage,
    setSearchInput,
    setStatusFilter,
    handleSort,
    resetFilters,
    retry,
  } = useInstitutionList();

  const activeCount = institutions.filter((i) => i.status === "active").length;
  const pendingCount = institutions.filter(
    (i) => i.status === "pending",
  ).length;
  const totalUsers = institutions.reduce((sum, i) => sum + i.user_count, 0);

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Institutions" value={total} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Pending" value={pendingCount} />
        <StatCard label="Total Users" value={totalUsers} />
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">
          {total} institution{total !== 1 ? "s" : ""}
        </span>
        <button
          className="rounded bg-blue-mid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          onClick={() => router.push("/admin/institutions/new")}
        >
          Add Institution
        </button>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by institution name..."
          className="rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
          style={{ minWidth: 260 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-light bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-parchment text-xs uppercase text-text-muted">
            <tr>
              <SortableHeader
                label="Name"
                field="name"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Status"
                field="status"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Users"
                field="user_count"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Courses"
                field="course_count"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Last Activity"
                field="last_activity"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Created"
                field="created_at"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {status === "loading" &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-warm-gray" />
                    </td>
                  ))}
                </tr>
              ))}

            {status === "data" &&
              institutions.map((inst) => (
                <tr
                  key={inst.id}
                  className="cursor-pointer border-b transition-colors hover:bg-parchment"
                  onClick={() => router.push(`/admin/institutions/${inst.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {inst.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inst.status] ?? "bg-warm-gray text-text-secondary"}`}
                    >
                      {STATUS_LABELS[inst.status] ?? inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {inst.user_count}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {inst.course_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatRelativeTime(inst.last_activity)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(inst.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}

            {status === "empty" && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No institutions found.{" "}
                  <button
                    onClick={resetFilters}
                    className="text-blue-mid underline"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            )}

            {status === "error" && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-error">
                  {errorMsg}{" "}
                  <button onClick={retry} className="text-blue-mid underline">
                    Retry
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-text-secondary transition-colors hover:bg-parchment disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-text-secondary transition-colors hover:bg-parchment disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: InstitutionListSortField;
  current: InstitutionListSortField;
  dir: SortDirection;
  onSort: (field: InstitutionListSortField) => void;
}) {
  const active = current === field;
  return (
    <th
      className="cursor-pointer px-4 py-3 hover:text-text-secondary"
      onClick={() => onSort(field)}
    >
      {label}{" "}
      {active && (
        <span className="ml-0.5">{dir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </th>
  );
}
