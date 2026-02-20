"use client";

import { useState } from "react";
import type { ApplicationDetail } from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TYPE_LABELS: Record<string, string> = {
  md: "MD",
  do: "DO",
  combined: "Combined",
};

export function ApprovalConfirmDialog({
  application,
  onClose,
  onApproved,
}: {
  application: ApplicationDetail;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    const trimmed = domain.trim();
    if (!trimmed) {
      setError("Domain is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = ""; // TODO: get from auth context
      const res = await fetch(
        `${API_URL}/api/v1/admin/applications/${application.id}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: trimmed }),
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Approval failed");
        setSubmitting(false);
        return;
      }

      onApproved();
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
          <h2 className="font-serif text-lg font-bold text-[#002c76]">
            Approve Application
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Application Summary */}
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-gray-700">Institution:</span>{" "}
              {application.institution_name}
            </p>
            <p>
              <span className="font-medium text-gray-700">Type:</span>{" "}
              {TYPE_LABELS[application.institution_type] ??
                application.institution_type}
            </p>
            <p>
              <span className="font-medium text-gray-700">Contact:</span>{" "}
              {application.contact_name} ({application.contact_email})
            </p>
          </div>

          {/* Domain Input */}
          <div>
            <label
              htmlFor="domain-input"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Institution Domain <span className="text-red-500">*</span>
            </label>
            <input
              id="domain-input"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. msm.edu"
              disabled={submitting}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2b71b9] focus:outline-none focus:ring-1 focus:ring-[#2b71b9] disabled:opacity-50"
            />
          </div>

          {/* Impact Summary */}
          <div className="rounded-md bg-blue-50 p-3">
            <p className="mb-2 text-xs font-medium uppercase text-blue-700">
              What will happen
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
              <li>Institution record will be created</li>
              <li>
                Invitation email will be sent to {application.contact_email}
              </li>
              <li>Invitation expires in 7 days</li>
            </ul>
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
            disabled={submitting || domain.trim().length === 0}
            className="rounded bg-[#69a338] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a8c2f] disabled:opacity-50"
          >
            {submitting ? "Approving\u2026" : "Approve & Send Invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}
