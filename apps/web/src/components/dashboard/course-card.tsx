"use client";

import type { CourseCardData } from "@journey-os/types";
import { StatusBadge } from "@journey-os/ui";
import { MiniProgressBar } from "@journey-os/ui";

export interface CourseCardProps {
  readonly course: CourseCardData;
  readonly onGenerate: (courseId: string) => void;
  readonly onReview: (courseId: string) => void;
  readonly onCoverage: (courseId: string) => void;
}

export function CourseCard({
  course,
  onGenerate,
  onReview,
  onCoverage,
}: CourseCardProps) {
  return (
    <div className="group rounded-xl border border-border-light bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge status={course.status} />
        <span className="font-mono text-[10px] tracking-wider text-text-muted">
          {course.code}
        </span>
      </div>

      <h4 className="mb-1 font-serif text-[15px] font-bold text-navy-deep">
        {course.name}
      </h4>
      <p className="mb-3 text-xs text-text-muted">{course.term}</p>

      <p className="mb-2 text-xs text-text-secondary">
        <span className="font-semibold text-text-primary">
          {course.question_count}
        </span>{" "}
        questions
      </p>

      <div className="mb-1 flex items-center gap-2">
        <div className="flex-1">
          <MiniProgressBar percent={course.coverage_percent} />
        </div>
        <span className="text-[11px] font-medium text-text-secondary">
          {course.coverage_percent}%
        </span>
      </div>
      <p className="mb-4 text-[10px] text-text-muted">coverage</p>

      <div className="flex gap-2">
        <button
          onClick={() => onGenerate(course.id)}
          className="flex-1 rounded border border-blue-mid px-2 py-1.5 font-sans text-[11px] font-semibold text-blue-mid transition-colors hover:bg-blue-mid hover:text-white"
        >
          Generate
        </button>
        <button
          onClick={() => onReview(course.id)}
          className="flex-1 rounded border border-blue-mid px-2 py-1.5 font-sans text-[11px] font-semibold text-blue-mid transition-colors hover:bg-blue-mid hover:text-white"
        >
          Review
        </button>
        <button
          onClick={() => onCoverage(course.id)}
          className="flex-1 rounded border border-blue-mid px-2 py-1.5 font-sans text-[11px] font-semibold text-blue-mid transition-colors hover:bg-blue-mid hover:text-white"
        >
          Coverage
        </button>
      </div>
    </div>
  );
}
