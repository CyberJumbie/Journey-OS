"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface CourseFilterValues {
  readonly search: string;
  readonly status: string;
  readonly academic_year: string;
}

interface CourseFiltersProps {
  readonly values: CourseFilterValues;
  readonly onChange: (values: CourseFilterValues) => void;
}

const DEBOUNCE_MS = 300;

export function CourseFilters({ values, onChange }: CourseFiltersProps) {
  const [searchInput, setSearchInput] = useState(values.search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchInput(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange({ ...values, search: text });
      }, DEBOUNCE_MS);
    },
    [values, onChange],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hasActiveFilters =
    values.search || values.status || values.academic_year;

  const clearAll = () => {
    setSearchInput("");
    onChange({ search: "", status: "", academic_year: "" });
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          size={14}
        />
        <input
          type="text"
          placeholder="Search courses..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="rounded-md border border-border-light bg-white py-1.5 pl-8 pr-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-blue-mid focus:outline-none"
        />
      </div>

      <select
        value={values.status}
        onChange={(e) => onChange({ ...values, status: e.target.value })}
        className="rounded-md border border-border-light bg-white px-3 py-1.5 font-sans text-sm text-text-primary"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>

      <select
        value={values.academic_year}
        onChange={(e) => onChange({ ...values, academic_year: e.target.value })}
        className="rounded-md border border-border-light bg-white px-3 py-1.5 font-sans text-sm text-text-primary"
      >
        <option value="">All Years</option>
        <option value="2025-2026">2025-2026</option>
        <option value="2024-2025">2024-2025</option>
        <option value="2023-2024">2023-2024</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 rounded-md border border-border-light px-3 py-1.5 font-sans text-sm text-text-muted hover:text-text-primary"
        >
          <X size={12} />
          Clear all
        </button>
      )}
    </div>
  );
}
