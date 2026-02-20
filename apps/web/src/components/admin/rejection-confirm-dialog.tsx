"use client";

import { useState } from "react";
import type { ApplicationDetail } from "@journey-os/types";

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
      const token = ""; // TODO: get from auth context
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
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "Source Sans 3, sans-serif" }}
          >
            Reject Application
          </h3>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Application summary */}
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">
              {application.institution_name}
            </p>
            <p className="text-gray-500">{application.contact_email}</p>
          </div>

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="rejection-reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2b71b9]"
              placeholder="Provide a detailed reason for rejection (min 10 characters)..."
            />
            <p
              className={`mt-1 text-xs ${trimmedReason.length > 0 && trimmedReason.length < 10 ? "text-red-500" : "text-gray-400"}`}
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

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
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
            disabled={!canSubmit}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
