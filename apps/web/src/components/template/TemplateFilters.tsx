"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import type {
  TemplateSharingLevel,
  TemplateQuestionType,
} from "@journey-os/types";
import type { TemplateFilters as TFilters } from "@web/hooks/use-templates";

const SHARING_OPTIONS: { value: TemplateSharingLevel; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "shared_course", label: "Course" },
  { value: "shared_institution", label: "Institution" },
  { value: "public", label: "Public" },
];

const QUESTION_TYPE_OPTIONS: { value: TemplateQuestionType; label: string }[] =
  [
    { value: "single_best_answer", label: "Single Best Answer" },
    { value: "extended_matching", label: "Extended Matching" },
    { value: "sequential_item_set", label: "Sequential Item Set" },
  ];

interface TemplateFiltersProps {
  readonly filters: TFilters;
  readonly onChange: (filters: TFilters) => void;
}

export function TemplateFilters({ filters, onChange }: TemplateFiltersProps) {
  const [searchText, setSearchText] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, search: value || undefined });
      }, 300);
    },
    [filters, onChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasActiveFilters =
    filters.sharing_level || filters.question_type || filters.search;

  const clearFilters = useCallback(() => {
    setSearchText("");
    onChange({});
  }, [onChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search templates..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.sharing_level ?? "all"}
        onValueChange={(v) =>
          onChange({
            ...filters,
            sharing_level:
              v === "all" ? undefined : (v as TemplateSharingLevel),
          })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Sharing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sharing</SelectItem>
          {SHARING_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.question_type ?? "all"}
        onValueChange={(v) =>
          onChange({
            ...filters,
            question_type:
              v === "all" ? undefined : (v as TemplateQuestionType),
          })
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Question Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {QUESTION_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
