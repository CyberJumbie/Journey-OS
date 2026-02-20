"use client";

import { useRouter } from "next/navigation";
import type { CourseCardSort } from "@journey-os/types";
import { CourseCard } from "@web/components/dashboard/course-card";
import { useFacultyCourses } from "@web/hooks/use-faculty-courses";

export interface CourseCardsGridProps {
  readonly facultyId: string;
}

const SORT_OPTIONS: { value: CourseCardSort; label: string }[] = [
  { value: "recent_activity", label: "Most Recent Activity" },
  { value: "alphabetical", label: "Alphabetical (A-Z)" },
  { value: "coverage_asc", label: "Coverage (Low to High)" },
];

function CourseCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border-light bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-14 rounded bg-warm-gray" />
        <div className="h-3 w-12 rounded bg-warm-gray" />
      </div>
      <div className="mb-1 h-5 w-3/4 rounded bg-warm-gray" />
      <div className="mb-3 h-3 w-1/3 rounded bg-warm-gray" />
      <div className="mb-2 h-3 w-1/4 rounded bg-warm-gray" />
      <div className="mb-4 h-1.5 w-full rounded bg-warm-gray" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded bg-warm-gray" />
        <div className="h-8 flex-1 rounded bg-warm-gray" />
        <div className="h-8 flex-1 rounded bg-warm-gray" />
      </div>
    </div>
  );
}

export function CourseCardsGrid({ facultyId }: CourseCardsGridProps) {
  const { courses, loading, error, sortBy, setSortBy, refetch } =
    useFacultyCourses(facultyId);
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
        <CourseCardSkeleton />
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center">
        <p className="mb-2 text-sm text-error">{error}</p>
        <button
          onClick={refetch}
          className="rounded border border-error px-4 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-parchment p-8 text-center">
        <p className="mb-1 text-sm font-medium text-text-secondary">
          No courses assigned
        </p>
        <p className="text-xs text-text-muted">
          Contact your institutional admin to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-[5px] w-[5px] rounded-sm bg-navy-deep" />
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}
          >
            My Courses
          </span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as CourseCardSort)}
          className="rounded border border-border-light bg-white px-3 py-1.5 font-sans text-xs text-text-secondary outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onGenerate={(id) =>
              router.push(`/workbench?course=${id}&mode=generate`)
            }
            onReview={(id) => router.push(`/review?course=${id}`)}
            onCoverage={(id) => router.push(`/coverage?course=${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
