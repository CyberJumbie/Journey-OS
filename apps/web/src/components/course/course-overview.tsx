"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CourseOverviewResponse,
  CourseOverviewSortField,
  CourseOverviewStatusFilter,
} from "@journey-os/types";
import { CourseSummaryCard } from "@web/components/course/course-summary-card";

export function CourseOverview() {
  const router = useRouter();
  const [data, setData] = useState<CourseOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter/sort/pagination state
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<CourseOverviewSortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [programId, setProgramId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [status, setStatus] = useState<CourseOverviewStatusFilter | "">("");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    if (programId) params.set("program_id", programId);
    if (academicYear) params.set("academic_year", academicYear);
    if (status) params.set("status", status);

    try {
      const res = await fetch(
        `/api/v1/institution/courses/overview?${params.toString()}`,
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Failed to load courses");
        return;
      }

      setData(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, programId, academicYear, status]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const handleCardClick = (courseId: string) => {
    router.push(`/institution/courses/${courseId}`);
  };

  const resetFilters = () => {
    setProgramId("");
    setAcademicYear("");
    setStatus("");
    setPage(1);
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Program ID"
          value={programId}
          onChange={(e) => {
            setProgramId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="Academic Year"
          value={academicYear}
          onChange={(e) => {
            setAcademicYear(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CourseOverviewStatusFilter | "");
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>

        {/* Sort controls */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as CourseOverviewSortField)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="name">Sort by Name</option>
          <option value="fulfills_coverage_pct">Sort by Coverage %</option>
          <option value="updated_at">Sort by Last Updated</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {sortDir === "asc" ? "\u2191 Asc" : "\u2193 Desc"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void fetchCourses()}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className="h-40 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Data state */}
      {!loading && !error && data && data.courses.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((course) => (
              <CourseSummaryCard
                key={course.id}
                course={course}
                onClick={handleCardClick}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.meta.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.meta.page} of {data.meta.total_pages}
              </span>
              <button
                type="button"
                disabled={page >= data.meta.total_pages}
                onClick={() => setPage(page + 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.courses.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">
            No courses match your filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 text-sm font-medium text-[#2b71b9] underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
