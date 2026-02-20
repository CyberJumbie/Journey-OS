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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 20;

type Status = "loading" | "data" | "empty" | "error";

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const token = ""; // TODO: get from auth context
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
      const token = ""; // TODO: get from auth context
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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ApplicationStatus | "all");
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {total} application{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
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
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {status === "data" &&
              applications.map((app) => (
                <tr key={app.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {app.institution_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABELS[app.institution_type] ?? app.institution_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {app.contact_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {app.contact_email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[app.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetails(app.id)}
                      disabled={detailLoading}
                      className="text-sm text-[#2b71b9] hover:underline disabled:opacity-50"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

            {status === "empty" && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No applications found.{" "}
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
                <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                  {errorMsg}{" "}
                  <button
                    onClick={fetchApplications}
                    className="text-[#2b71b9] underline"
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
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
