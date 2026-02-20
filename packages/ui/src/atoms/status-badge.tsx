"use client";

import type { CourseStatus } from "@journey-os/types";

export interface StatusBadgeProps {
  readonly status: CourseStatus;
}

const STATUS_CONFIG: Record<
  CourseStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-green/10 text-green-dark",
  },
  draft: {
    label: "Draft",
    className: "bg-warning/10 text-warning",
  },
  archived: {
    label: "Archived",
    className: "bg-warm-gray/40 text-text-muted",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}
