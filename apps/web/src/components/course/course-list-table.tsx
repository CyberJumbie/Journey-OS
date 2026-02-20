"use client";

import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CourseListItem } from "@journey-os/types";

interface CourseListTableProps {
  readonly courses: readonly CourseListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
  readonly sortBy: string;
  readonly sortDir: "asc" | "desc";
  readonly onSort: (field: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onLimitChange: (limit: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green/10 text-green-dark",
  draft: "bg-warning/10 text-warning",
  archived: "bg-warm-gray/20 text-text-muted",
};

function SortIcon({
  field,
  sortBy,
  sortDir,
}: {
  field: string;
  sortBy: string;
  sortDir: string;
}) {
  if (field !== sortBy)
    return <ChevronUp size={12} className="text-text-muted opacity-30" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-navy-deep" />
  ) : (
    <ChevronDown size={12} className="text-navy-deep" />
  );
}

function SortableHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortDir: string;
  onSort: (field: string) => void;
  className?: string;
}) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted"
      >
        {label}
        <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
      </button>
    </th>
  );
}

export function CourseListTable({
  courses,
  meta,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onLimitChange,
}: CourseListTableProps) {
  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light bg-parchment">
              <SortableHeader
                label="Code"
                field="code"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="px-4 py-3 text-left"
              />
              <SortableHeader
                label="Title"
                field="name"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="px-4 py-3 text-left"
              />
              <th className="px-4 py-3 text-left font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
                Program
              </th>
              <th className="px-4 py-3 text-left font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
                Course Director
              </th>
              <th className="px-4 py-3 text-left font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
                Status
              </th>
              <SortableHeader
                label="Year"
                field="academic_year"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="px-4 py-3 text-left"
              />
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr
                key={course.id}
                className="border-b border-border-light transition-colors last:border-b-0 hover:bg-parchment"
              >
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {course.code}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/faculty/courses/${course.id}`}
                    className="font-sans text-sm font-semibold text-navy-deep hover:text-blue-mid"
                  >
                    {course.name}
                  </Link>
                  <div className="mt-0.5 font-mono text-[0.625rem] text-text-muted">
                    {course.section_count} sections &middot;{" "}
                    {course.session_count} sessions
                  </div>
                </td>
                <td className="px-4 py-3 font-sans text-sm text-text-secondary">
                  {course.program_name ?? "\u2014"}
                </td>
                <td className="px-4 py-3 font-sans text-sm text-text-secondary">
                  {course.course_director_name ?? "\u2014"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider ${STATUS_STYLES[course.status] ?? STATUS_STYLES.archived}`}
                  >
                    {course.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-sans text-sm text-text-secondary">
                  {course.academic_year ?? "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between border-t border-border-light px-4 py-3">
        <span className="font-sans text-xs text-text-muted">
          {meta.total > 0
            ? `Showing ${start}\u2013${end} of ${meta.total} courses`
            : "No courses"}
        </span>

        <div className="flex items-center gap-3">
          <select
            value={meta.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded border border-border-light bg-white px-2 py-1 font-sans text-xs text-text-secondary"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
              className="rounded border border-border-light p-1 text-text-muted disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono text-xs text-text-secondary">
              {meta.page} / {meta.total_pages || 1}
            </span>
            <button
              type="button"
              disabled={meta.page >= meta.total_pages}
              onClick={() => onPageChange(meta.page + 1)}
              className="rounded border border-border-light p-1 text-text-muted disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
