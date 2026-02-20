"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  InstitutionUserListItem,
  InstitutionUserSortField,
  InstitutionUserStatus,
  SortDirection,
} from "@journey-os/types";
import { InviteUserModal } from "@web/components/institution/invite-user-modal";

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
  institutional_admin: "bg-blue-100 text-blue-800",
  faculty: "bg-green-100 text-green-800",
  advisor: "bg-amber-100 text-amber-800",
  student: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<InstitutionUserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
};

const STATUS_COLORS: Record<InstitutionUserStatus, string> = {
  active: "bg-[#69a338] text-white",
  inactive: "bg-gray-200 text-gray-600",
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

      const token = ""; // TODO: get from auth context
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
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2b71b9] focus:outline-none focus:ring-1 focus:ring-[#2b71b9]"
          style={{ minWidth: 240 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
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
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-sm text-gray-500">
          {total} user{total !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded bg-[#2b71b9] px-4 py-2 text-sm font-medium text-white hover:bg-[#245d9a]"
          >
            Invite User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
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
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {viewStatus === "data" &&
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
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
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-800"}`}
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
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}

            {viewStatus === "empty" && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No users found.{" "}
                  <button
                    onClick={resetFilters}
                    className="text-[#2b71b9] underline"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            )}

            {viewStatus === "error" && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-600">
                  {errorMsg}{" "}
                  <button
                    onClick={fetchUsers}
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
