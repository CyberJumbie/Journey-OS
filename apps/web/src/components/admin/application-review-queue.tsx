"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ApplicationReviewItem,
  ApplicationReviewSortField,
  ApplicationDetail,
  ApplicationStatus,
  SortDirection,
} from "@journey-os/types";
import { ApplicationDetailModal } from "./application-detail-modal";
import { getAuthToken } from "@web/lib/auth/get-auth-token";
import { StatCard } from "@web/components/brand/stat-card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 20;

type Status = "loading" | "data" | "empty" | "error";

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green/10 text-green",
  rejected: "bg-error/10 text-error",
};

const TYPE_LABELS: Record<string, string> = {
  md: "MD",
  do: "DO",
  combined: "Combined",
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function ApplicationReviewQueue() {
  const [applications, setApplications] = useState<ApplicationReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] =
    useState<ApplicationReviewSortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const pendingCount = applications.filter(
    (a) => a.status === "pending",
  ).length;
  const approvedCount = applications.filter(
    (a) => a.status === "approved",
  ).length;

  const filteredApplications = searchQuery
    ? applications.filter(
        (a) =>
          a.institution_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          a.contact_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : applications;

  const fetchApplications = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const token = await getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/admin/applications?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load applications");
        setStatus("error");
        return;
      }

      const json = await res.json();
      const data = json.data;
      setApplications(data.applications ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.total_pages ?? 0);
      setStatus(data.applications?.length > 0 ? "data" : "empty");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }, [page, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleViewDetails(id: string) {
    setDetailLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/v1/admin/applications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        setErrorMsg("Failed to load application details");
        setDetailLoading(false);
        return;
      }

      const json = await res.json();
      setSelectedApp(json.data);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSort(field: ApplicationReviewSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setStatusFilter("all");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pendingCount} />
        <StatCard label="Approved" value={approvedCount} />
        <StatCard label="Total" value={total} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ApplicationStatus | "all");
            setPage(1);
          }}
          className="rounded border border-border px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or institution..."
          className="rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
          style={{ minWidth: 220 }}
        />
        <span className="text-sm text-text-muted">
          {total} application{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-light bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-parchment text-xs uppercase text-text-muted">
            <tr>
              <SortableHeader
                label="Institution"
                field="institution_name"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <SortableHeader
                label="Submitted"
                field="created_at"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {status === "loading" &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-warm-gray" />
                    </td>
                  ))}
                </tr>
              ))}

            {status === "data" &&
              filteredApplications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b transition-colors hover:bg-parchment"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {app.institution_name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {TYPE_LABELS[app.institution_type] ?? app.institution_type}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {app.contact_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {app.contact_email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[app.status] ?? "bg-warm-gray text-text-secondary"}`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetails(app.id)}
                      disabled={detailLoading}
                      className="text-sm text-blue-mid hover:underline disabled:opacity-50"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

            {status === "empty" && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No applications found.{" "}
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
                <td colSpan={7} className="px-4 py-8 text-center text-error">
                  {errorMsg}{" "}
                  <button
                    onClick={fetchApplications}
                    className="text-blue-mid underline"
                  >
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-text-secondary transition-colors hover:bg-parchment disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-text-secondary transition-colors hover:bg-parchment disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApproved={() => {
            setSelectedApp(null);
            fetchApplications();
          }}
          onRejected={() => {
            setSelectedApp(null);
            fetchApplications();
          }}
        />
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
  field: ApplicationReviewSortField;
  current: ApplicationReviewSortField;
  dir: SortDirection;
  onSort: (field: ApplicationReviewSortField) => void;
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
