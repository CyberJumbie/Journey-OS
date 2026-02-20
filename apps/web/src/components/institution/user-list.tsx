"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  InstitutionUserListItem,
  InstitutionUserSortField,
  InstitutionUserStatus,
  SortDirection,
} from "@journey-os/types";
import { InviteUserModal } from "@web/components/institution/invite-user-modal";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 25;

type ViewStatus = "loading" | "data" | "empty" | "error";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  institutional_admin: "Inst Admin",
  faculty: "Faculty",
  advisor: "Advisor",
  student: "Student",
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  institutional_admin: "bg-blue-mid/10 text-blue-mid",
  faculty: "bg-green/10 text-green",
  advisor: "bg-amber-100 text-amber-800",
  student: "bg-warm-gray text-text-secondary",
};

const STATUS_LABELS: Record<InstitutionUserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
};

const STATUS_COLORS: Record<InstitutionUserStatus, string> = {
  active: "bg-green text-white",
  inactive: "bg-warm-gray text-text-muted",
  pending: "bg-yellow-100 text-yellow-800",
};

export function InstitutionUserList() {
  const [users, setUsers] = useState<InstitutionUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<InstitutionUserSortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewStatus, setViewStatus] = useState<ViewStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    setViewStatus("loading");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/v1/institution/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load users");
        setViewStatus("error");
        return;
      }

      const json = await res.json();
      const data = json.data;
      setUsers(data.users ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.total_pages ?? 0);
      setViewStatus(data.users?.length > 0 ? "data" : "empty");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setViewStatus("error");
    }
  }, [page, sortBy, sortDir, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleSort(field: InstitutionUserSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
  }

  function handleInviteSuccess() {
    setShowInviteModal(false);
    fetchUsers();
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters + Invite Button */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid"
          style={{ minWidth: 240 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-border px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <option value="faculty">Faculty</option>
          <option value="advisor">Advisor</option>
          <option value="student">Student</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-border px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-sm text-text-muted">
          {total} user{total !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded bg-blue-mid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          >
            Invite User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-light bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-parchment text-xs uppercase text-text-muted">
            <tr>
              <SortableHeader
                label="Name"
                field="full_name"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Email"
                field="email"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Role"
                field="role"
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
                label="Last Login"
                field="last_login_at"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {viewStatus === "loading" &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-warm-gray" />
                    </td>
                  ))}
                </tr>
              ))}

            {viewStatus === "data" &&
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-parchment">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {user.full_name ?? "\u2014"}
                    {user.is_course_director && (
                      <span
                        className="ml-1 text-xs text-amber-600"
                        title="Course Director"
                      >
                        CD
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-warm-gray text-text-secondary"}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[user.status]}`}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}

            {viewStatus === "empty" && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No users found.{" "}
                  <button
                    onClick={resetFilters}
                    className="text-blue-mid underline"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            )}

            {viewStatus === "error" && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-error">
                  {errorMsg}{" "}
                  <button
                    onClick={fetchUsers}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
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
  field: InstitutionUserSortField;
  current: InstitutionUserSortField;
  dir: SortDirection;
  onSort: (field: InstitutionUserSortField) => void;
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
