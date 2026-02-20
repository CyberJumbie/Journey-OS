"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MIN_REASON_LENGTH = 10;

export function SuspendDialog({
  institution,
  token,
  onClose,
  onSuspended,
}: {
  institution: { id: string; name: string; domain: string; user_count: number };
  token: string;
  onClose: () => void;
  onSuspended: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length >= MIN_REASON_LENGTH;

  async function handleConfirm() {
    if (!isValid) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/v1/admin/institutions/${institution.id}/suspend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: trimmedReason }),
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Suspension failed");
        setSubmitting(false);
        return;
      }

      onSuspended();
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
          <h2 className="font-serif text-lg font-bold text-text-primary">
            Suspend Institution
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Institution Summary */}
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-text-secondary">
                Institution:
              </span>{" "}
              {institution.name}
            </p>
            <p>
              <span className="font-medium text-text-secondary">Domain:</span>{" "}
              {institution.domain}
            </p>
          </div>

          {/* Impact Warning */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="mb-2 text-xs font-medium uppercase text-amber-700">
              Impact Warning
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-amber-800">
              <li>
                This will prevent all{" "}
                <span className="font-semibold">{institution.user_count}</span>{" "}
                users from logging in
              </li>
              <li>All data will be preserved for reactivation</li>
            </ul>
          </div>

          {/* Reason Textarea */}
          <div>
            <label
              htmlFor="suspend-reason"
              className="mb-1 block text-sm font-medium text-text-secondary"
            >
              Reason for suspension <span className="text-error">*</span>
            </label>
            <textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for suspending this institution (min 10 characters)"
              disabled={submitting}
              rows={3}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-text-muted">
              {trimmedReason.length}/{MIN_REASON_LENGTH} characters minimum
            </p>
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
            disabled={submitting || !isValid}
            className="rounded bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {submitting ? "Suspending\u2026" : "Suspend Institution"}
          </button>
        </div>
      </div>
    </div>
  );
}
