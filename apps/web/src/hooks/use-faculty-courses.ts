"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CourseCardData,
  CourseCardSort,
  FacultyCourseListResponse,
} from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SORT_STORAGE_KEY = "journey:courseCardSort";

export interface UseFacultyCoursesReturn {
  readonly courses: readonly CourseCardData[];
  readonly loading: boolean;
  readonly error: string;
  readonly sortBy: CourseCardSort;
  readonly setSortBy: (sort: CourseCardSort) => void;
  readonly refetch: () => void;
}

function loadSortPreference(): CourseCardSort {
  if (typeof window === "undefined") return "recent_activity";
  const stored = localStorage.getItem(SORT_STORAGE_KEY);
  if (
    stored === "recent_activity" ||
    stored === "alphabetical" ||
    stored === "coverage_asc"
  ) {
    return stored;
  }
  return "recent_activity";
}

function sortCourses(
  courses: readonly CourseCardData[],
  sortBy: CourseCardSort,
): CourseCardData[] {
  const arr = [...courses];
  switch (sortBy) {
    case "recent_activity":
      return arr.sort((a, b) => {
        const aTime = a.last_activity_at ?? "";
        const bTime = b.last_activity_at ?? "";
        return bTime.localeCompare(aTime);
      });
    case "alphabetical":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "coverage_asc":
      return arr.sort((a, b) => a.coverage_percent - b.coverage_percent);
  }
}

export function useFacultyCourses(facultyId: string): UseFacultyCoursesReturn {
  const [rawCourses, setRawCourses] = useState<readonly CourseCardData[]>([]);
  const [sortBy, setSortByState] = useState<CourseCardSort>(loadSortPreference);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setSortBy = useCallback((sort: CourseCardSort) => {
    setSortByState(sort);
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/dashboard/faculty/courses?faculty_id=${encodeURIComponent(facultyId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setError(
          (json as { error?: { message?: string } }).error?.message ??
            "Failed to load courses",
        );
        setLoading(false);
        return;
      }

      const json = (await res.json()) as { data: FacultyCourseListResponse };
      setRawCourses(json.data.courses);
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }, [facultyId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const courses = sortCourses(rawCourses, sortBy);

  return { courses, loading, error, sortBy, setSortBy, refetch: fetchCourses };
}
