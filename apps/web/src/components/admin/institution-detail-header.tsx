"use client";

import type { InstitutionDetail } from "@journey-os/types";

const STATUS_LABELS: Record<string, string> = {
  approved: "Active",
  waitlisted: "Pending",
  suspended: "Suspended",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green/10 text-green",
  waitlisted: "bg-yellow-100 text-yellow-800",
  suspended: "bg-error/10 text-error",
};

export interface InstitutionDetailHeaderProps {
  detail: InstitutionDetail;
}

export function InstitutionDetailHeader({
  detail,
}: InstitutionDetailHeaderProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy-deep">
            {detail.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>{detail.domain}</span>
            {detail.institution_type && (
              <>
                <span className="text-border-light">|</span>
                <span className="uppercase">{detail.institution_type}</span>
              </>
            )}
            {detail.accreditation_body && (
              <>
                <span className="text-border-light">|</span>
                <span>{detail.accreditation_body}</span>
              </>
            )}
            <span className="text-border-light">|</span>
            <span>
              Created {new Date(detail.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[detail.status] ?? "bg-warm-gray text-text-secondary"}`}
        >
          {STATUS_LABELS[detail.status] ?? detail.status}
        </span>
      </div>
    </div>
  );
}
