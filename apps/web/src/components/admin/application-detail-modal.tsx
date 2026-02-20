"use client";

import { useState } from "react";
import type { ApplicationDetail } from "@journey-os/types";
import { ApprovalConfirmDialog } from "./approval-confirm-dialog";
import { RejectionConfirmDialog } from "./rejection-confirm-dialog";

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

export function ApplicationDetailModal({
  application,
  onClose,
  onApproved,
  onRejected,
}: {
  application: ApplicationDetail;
  onClose: () => void;
  onApproved?: () => void;
  onRejected?: () => void;
}) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-serif text-lg font-bold text-[#002c76]">
            Application Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <Field label="Institution" value={application.institution_name} />
            <Field
              label="Type"
              value={
                TYPE_LABELS[application.institution_type] ??
                application.institution_type
              }
            />
            <Field
              label="Accreditation"
              value={application.accreditation_body}
            />
            <Field label="Contact Name" value={application.contact_name} />
            <Field label="Contact Email" value={application.contact_email} />
            <Field
              label="Contact Phone"
              value={application.contact_phone || "\u2014"}
            />
            <Field
              label="Student Count"
              value={String(application.student_count)}
            />
            <Field
              label="Website"
              value={application.website_url || "\u2014"}
            />
            <Field label="Reason" value={application.reason || "\u2014"} />
            <div>
              <span className="text-xs font-medium uppercase text-gray-500">
                Status
              </span>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[application.status] ?? "bg-gray-100 text-gray-800"}`}
                >
                  {application.status}
                </span>
              </div>
            </div>
            <Field
              label="Submitted"
              value={new Date(application.created_at).toLocaleString()}
            />
            {application.reviewed_by && (
              <>
                <Field label="Reviewed By" value={application.reviewed_by} />
                <Field
                  label="Reviewed At"
                  value={
                    application.reviewed_at
                      ? new Date(application.reviewed_at).toLocaleString()
                      : "\u2014"
                  }
                />
              </>
            )}
            {application.rejection_reason && (
              <Field
                label="Rejection Reason"
                value={application.rejection_reason}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={() => setShowApprovalDialog(true)}
            disabled={application.status !== "pending"}
            className="rounded bg-[#69a338] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a8c2f] disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setShowRejectionDialog(true)}
            disabled={application.status !== "pending"}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Approval Confirm Dialog */}
      {showApprovalDialog && (
        <ApprovalConfirmDialog
          application={application}
          onClose={() => setShowApprovalDialog(false)}
          onApproved={() => {
            setShowApprovalDialog(false);
            onClose();
            onApproved?.();
          }}
        />
      )}

      {/* Rejection Confirm Dialog */}
      {showRejectionDialog && (
        <RejectionConfirmDialog
          application={application}
          onClose={() => setShowRejectionDialog(false)}
          onRejected={() => {
            setShowRejectionDialog(false);
            onClose();
            onRejected?.();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase text-gray-500">
        {label}
      </span>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}
