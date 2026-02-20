"use client";

import { useState, useEffect } from "react";
import type { GlobalUserListItem } from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InstitutionOption {
  readonly id: string;
  readonly name: string;
}

export function ReassignmentConfirmModal({
  user,
  onClose,
  onReassigned,
}: {
  user: GlobalUserListItem;
  onClose: () => void;
  onReassigned: () => void;
}) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);

  // Fetch institutions for the dropdown (exclude current)
  useEffect(() => {
    async function fetchInstitutions() {
      try {
        const token = await getAuthToken();
        const res = await fetch(
          `${API_URL}/api/v1/auth/institutions/search?q=&limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const json = await res.json();
          const all: InstitutionOption[] = json.data?.institutions ?? [];
          setInstitutions(
            all.filter((inst) => inst.id !== user.institution_id),
          );
        }
      } catch {
        // Silent — user can still type
      } finally {
        setLoadingInstitutions(false);
      }
    }
    fetchInstitutions();
  }, [user.institution_id]);

  async function handleConfirm() {
    if (!targetId) {
      setError("Please select a target institution");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/admin/users/${user.id}/reassign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_institution_id: targetId,
            reason: reason.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Reassignment failed");
        setSubmitting(false);
        return;
      }

      onReassigned();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="font-serif text-lg font-bold text-navy-deep">
            Reassign User
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* User Summary */}
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-text-secondary">User:</span>{" "}
              {user.full_name}
            </p>
            <p>
              <span className="font-medium text-text-secondary">Email:</span>{" "}
              {user.email}
            </p>
            <p>
              <span className="font-medium text-text-secondary">
                Current Institution:
              </span>{" "}
              {user.institution_name ?? "None"}
            </p>
          </div>

          {/* Institution Select */}
          <div>
            <label
              htmlFor="target-institution"
              className="mb-1 block text-sm font-medium text-text-secondary"
            >
              Target Institution <span className="text-error">*</span>
            </label>
            <select
              id="target-institution"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={submitting || loadingInstitutions}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid disabled:opacity-50"
            >
              <option value="">
                {loadingInstitutions
                  ? "Loading institutions..."
                  : "Select institution"}
              </option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Input */}
          <div>
            <label
              htmlFor="reassignment-reason"
              className="mb-1 block text-sm font-medium text-text-secondary"
            >
              Reason (optional)
            </label>
            <textarea
              id="reassignment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Faculty transfer to partner institution"
              disabled={submitting}
              rows={2}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid disabled:opacity-50"
            />
          </div>

          {/* Impact Summary */}
          <div className="rounded-md bg-amber-50 p-3">
            <p className="mb-2 text-xs font-medium uppercase text-amber-700">
              Impact
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-amber-800">
              <li>Active course memberships will be archived</li>
              {user.is_course_director && (
                <li>Course Director flag will be reset</li>
              )}
              <li>User will receive a notification email</li>
            </ul>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-parchment disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !targetId}
            className="rounded bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {submitting ? "Reassigning\u2026" : "Reassign User"}
          </button>
        </div>
      </div>
    </div>
  );
}
