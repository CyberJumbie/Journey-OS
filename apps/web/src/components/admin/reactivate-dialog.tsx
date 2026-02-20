"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ReactivateDialog({
  institution,
  token,
  onClose,
  onReactivated,
}: {
  institution: { id: string; name: string; domain: string };
  token: string;
  onClose: () => void;
  onReactivated: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, string> = {};
      const trimmed = reason.trim();
      if (trimmed) {
        body.reason = trimmed;
      }

      const res = await fetch(
        `${API_URL}/api/v1/admin/institutions/${institution.id}/reactivate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Reactivation failed");
        setSubmitting(false);
        return;
      }

      onReactivated();
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
          <h2 className="font-serif text-lg font-bold text-[var(--color-primary,#1a1a2e)]">
            Reactivate Institution
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Institution Summary */}
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-gray-700">Institution:</span>{" "}
              {institution.name}
            </p>
            <p>
              <span className="font-medium text-gray-700">Domain:</span>{" "}
              {institution.domain}
            </p>
            <p>
              <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                Currently Suspended
              </span>
            </p>
          </div>

          {/* Info */}
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">
              Reactivating will restore access for all users at this
              institution.
            </p>
          </div>

          {/* Optional Reason */}
          <div>
            <label
              htmlFor="reactivate-reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Note (optional)
            </label>
            <textarea
              id="reactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add an optional note about this reactivation"
              disabled={submitting}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Reactivating\u2026" : "Reactivate Institution"}
          </button>
        </div>
      </div>
    </div>
  );
}
