"use client";

import { useCallback, useEffect, useState } from "react";
import type { CourseListViewResponse } from "@journey-os/types";
import { CourseFilters, type CourseFilterValues } from "./course-filters";
import { CourseListTable } from "./course-list-table";

const INITIAL_FILTERS: CourseFilterValues = {
  search: "",
  status: "",
  academic_year: "",
};

export function FacultyCourseList() {
  const [data, setData] = useState<CourseListViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CourseFilterValues>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.academic_year)
      params.set("academic_year", filters.academic_year);
    if (sortBy) params.set("sort_by", sortBy);
    if (sortDir) params.set("sort_dir", sortDir);

    try {
      const res = await fetch(`/api/v1/courses/view?${params.toString()}`);
      const json = (await res.json()) as {
        data?: CourseListViewResponse;
        error?: { code: string; message: string };
      };

      if (!res.ok) {
        setError(json.error?.message ?? "Failed to load courses");
        return;
      }

      setData(json.data ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, sortBy, sortDir]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const handleFilterChange = (values: CourseFilterValues) => {
    setFilters(values);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (field === sortBy) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <div>
      <CourseFilters values={filters} onChange={handleFilterChange} />

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

      {loading && (
        <div className="overflow-hidden rounded-xl border border-border-light bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className="border-b border-border-light px-4 py-4 last:border-b-0"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-parchment" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-parchment" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data && data.courses.length > 0 && (
        <CourseListTable
          courses={data.courses}
          meta={data.meta}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
        />
      )}

      {!loading && !error && data && data.courses.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-sans text-sm text-text-muted">
            No courses match your filters.
          </p>
          <button
            type="button"
            onClick={() => handleFilterChange(INITIAL_FILTERS)}
            className="mt-2 font-sans text-sm font-medium text-blue-mid underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
