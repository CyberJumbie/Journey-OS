"use client";

import { useState } from "react";
import type { ApplicationDetail } from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function RejectionConfirmDialog({
  application,
  onClose,
  onRejected,
}: {
  application: ApplicationDetail;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= 10 && !submitting;

  async function handleConfirm() {
    if (!canSubmit) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/admin/applications/${application.id}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: trimmedReason }),
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to reject application.");
        setSubmitting(false);
        return;
      }

      onRejected();
    } catch {
      setErrorMsg("Network error. Please try again.");
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
          <h3 className="font-serif text-lg font-semibold text-text-primary">
            Reject Application
          </h3>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Application summary */}
          <div className="rounded-md bg-parchment p-3 text-sm">
            <p className="font-medium text-text-primary">
              {application.institution_name}
            </p>
            <p className="text-text-muted">{application.contact_email}</p>
          </div>

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="rejection-reason"
              className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
            >
              Rejection Reason <span className="text-error">*</span>
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
              placeholder="Provide a detailed reason for rejection (min 10 characters)..."
            />
            <p
              className={`mt-1 text-xs ${trimmedReason.length > 0 && trimmedReason.length < 10 ? "text-error" : "text-text-muted"}`}
            >
              {trimmedReason.length}/10 characters minimum
            </p>
          </div>

          {/* Impact summary */}
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            <ul className="list-inside list-disc space-y-1">
              <li>Application will be permanently rejected</li>
              <li>
                Rejection email will be sent to {application.contact_email}
              </li>
              <li>Applicant may reapply in the future</li>
            </ul>
          </div>

          {errorMsg && <p className="text-sm text-error">{errorMsg}</p>}
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
            disabled={!canSubmit}
            className="rounded bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Reject Application"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
