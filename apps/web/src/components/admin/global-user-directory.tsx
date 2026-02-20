"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GlobalUserListItem,
  GlobalUserSortField,
  SortDirection,
} from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 25;

type Status = "loading" | "data" | "empty" | "error";

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

export function GlobalUserDirectory() {
  const [users, setUsers] = useState<GlobalUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<GlobalUserSortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reassignUser, setReassignUser] = useState<GlobalUserListItem | null>(
    null,
  );

  const fetchUsers = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("is_active", statusFilter);

      const token = ""; // TODO: get from auth context
      const res = await fetch(`${API_URL}/api/v1/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load users");
        setStatus("error");
        return;
      }

      const json = await res.json();
      const data = json.data;
      setUsers(data.users ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.total_pages ?? 0);
      setStatus(data.users?.length > 0 ? "data" : "empty");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
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

  function handleSort(field: GlobalUserSortField) {
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

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
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
          <option value="superadmin">Super Admin</option>
          <option value="institutional_admin">Inst Admin</option>
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
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <span className="text-sm text-gray-500">
          {total} user{total !== 1 ? "s" : ""}
        </span>
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
              <th className="px-4 py-3">Institution</th>
              <SortableHeader
                label="Status"
                field="is_active"
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
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.full_name}
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
                  <td className="px-4 py-3 text-gray-600">
                    {user.institution_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${user.is_active ? "bg-[#69a338]" : "bg-gray-300"}`}
                      title={user.is_active ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {user.institution_id && (
                      <button
                        onClick={() => setReassignUser(user)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Reassign
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            {status === "empty" && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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

            {status === "error" && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-red-600">
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

      {/* Reassignment Modal */}
      {reassignUser && (
        <ReassignmentConfirmModal
          user={reassignUser}
          onClose={() => setReassignUser(null)}
          onReassigned={() => {
            setReassignUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function ReassignmentConfirmModal({
  user,
  onClose,
  onReassigned,
}: {
  user: GlobalUserListItem;
  onClose: () => void;
  onReassigned: () => void;
}) {
  // TODO: Implement institution reassignment modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-medium">Reassign {user.full_name}</h3>
        <p className="mt-2 text-sm text-gray-500">
          Institution reassignment is not yet implemented.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
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
  field: GlobalUserSortField;
  current: GlobalUserSortField;
  dir: SortDirection;
  onSort: (field: GlobalUserSortField) => void;
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
