"use client";

import type { CourseOverviewItem } from "@journey-os/types";

interface CourseSummaryCardProps {
  readonly course: CourseOverviewItem;
  readonly onClick: (courseId: string) => void;
}

function getCoverageColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusDot(status: CourseOverviewItem["processing_status"]): string {
  switch (status) {
    case "complete":
      return "bg-green-500";
    case "processing":
      return "bg-amber-500 animate-pulse";
    case "idle":
    default:
      return "bg-text-muted";
  }
}

export function CourseSummaryCard({ course, onClick }: CourseSummaryCardProps) {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border border-border-light bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onClick(course.id)}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider font-medium text-text-muted">
            {course.code}
          </p>
          <h3 className="text-sm font-semibold font-serif text-text-primary">
            {course.name}
          </h3>
        </div>
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusDot(course.processing_status)}`}
          title={`Processing: ${course.processing_status}`}
        />
      </div>

      {course.director_name && (
        <p className="mb-3 text-xs text-text-muted">{course.director_name}</p>
      )}

      {/* Coverage bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-text-muted">SLO Coverage</span>
          <span className="font-medium text-text-secondary">
            {course.fulfills_coverage_pct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-warm-gray">
          <div
            className={`h-1.5 rounded-full ${getCoverageColor(course.fulfills_coverage_pct)}`}
            style={{ width: `${Math.min(course.fulfills_coverage_pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span>
          <strong className="text-text-secondary">{course.slo_count}</strong>{" "}
          SLOs
        </span>
        <span>
          <strong className="text-text-secondary">{course.upload_count}</strong>{" "}
          uploads
        </span>
        {course.program_name && (
          <span className="ml-auto truncate text-text-muted">
            {course.program_name}
          </span>
        )}
      </div>
    </button>
  );
}
