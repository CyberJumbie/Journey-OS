"use client";

import type { MaterialStatus } from "@journey-os/types";

interface SessionCardProps {
  readonly title: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly sectionName: string;
  readonly materialCount: number;
  readonly materialStatus: MaterialStatus;
}

function getMaterialDotColor(status: MaterialStatus): string {
  switch (status) {
    case "processed":
      return "bg-green-500";
    case "pending":
      return "bg-amber-500";
    case "empty":
    default:
      return "bg-text-muted";
  }
}

function getMaterialLabel(status: MaterialStatus, count: number): string {
  if (count === 0) return "No materials";
  switch (status) {
    case "processed":
      return `${count} ready`;
    case "pending":
      return `${count} pending`;
    default:
      return `${count} materials`;
  }
}

export function SessionCard({
  title,
  startTime,
  endTime,
  sectionName,
  materialCount,
  materialStatus,
}: SessionCardProps) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between">
        <h4 className="text-sm font-semibold font-serif text-text-primary">
          {title}
        </h4>
        <span
          className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${getMaterialDotColor(materialStatus)}`}
          title={getMaterialLabel(materialStatus, materialCount)}
        />
      </div>
      <p className="mb-1 font-mono text-xs text-text-muted">
        {startTime} &ndash; {endTime}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
        {sectionName}
      </p>
    </div>
  );
}
