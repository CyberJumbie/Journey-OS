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
      return "bg-gray-400";
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span
          className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${getMaterialDotColor(materialStatus)}`}
          title={getMaterialLabel(materialStatus, materialCount)}
        />
      </div>
      <p className="mb-1 text-xs text-gray-500">
        {startTime} &ndash; {endTime}
      </p>
      <p className="text-xs text-gray-400">{sectionName}</p>
    </div>
  );
}
