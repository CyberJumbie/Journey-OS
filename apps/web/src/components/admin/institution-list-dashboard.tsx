"use client";

import { useRouter } from "next/navigation";
import type {
  InstitutionListSortField,
  InstitutionMonitoringStatus,
  SortDirection,
} from "@journey-os/types";
import { useInstitutionList } from "@web/hooks/use-institution-list";

const STATUS_LABELS: Record<InstitutionMonitoringStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  archived: "Archived",
};

const STATUS_COLORS: Record<InstitutionMonitoringStatus, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
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

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {total} institution{total !== 1 ? "s" : ""}
        </span>
        <button
          className="rounded bg-[#2b71b9] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5a96]"
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
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2b71b9] focus:outline-none focus:ring-1 focus:ring-[#2b71b9]"
          style={{ minWidth: 260 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
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
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {status === "data" &&
              institutions.map((inst) => (
                <tr
                  key={inst.id}
                  className="cursor-pointer border-b hover:bg-gray-50"
                  onClick={() => router.push(`/admin/institutions/${inst.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {inst.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inst.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[inst.status] ?? inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inst.user_count}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {inst.course_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatRelativeTime(inst.last_activity)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(inst.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}

            {status === "empty" && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No institutions found.{" "}
                  <button
                    onClick={resetFilters}
                    className="text-[#2b71b9] underline"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            )}

            {status === "error" && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-red-600">
                  {errorMsg}{" "}
                  <button onClick={retry} className="text-[#2b71b9] underline">
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
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
      className="cursor-pointer px-4 py-3 hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      {label}{" "}
      {active && (
        <span className="ml-0.5">{dir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </th>
  );
}
