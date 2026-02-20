"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  InstitutionListItem,
  InstitutionListSortField,
  InstitutionMonitoringStatus,
  SortDirection,
} from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 20;

export type InstitutionListStatus = "loading" | "data" | "empty" | "error";

export interface UseInstitutionListReturn {
  institutions: InstitutionListItem[];
  page: number;
  total: number;
  totalPages: number;
  sortBy: InstitutionListSortField;
  sortDir: SortDirection;
  searchInput: string;
  statusFilter: string;
  status: InstitutionListStatus;
  errorMsg: string;
  setPage: (page: number) => void;
  setSearchInput: (value: string) => void;
  setStatusFilter: (value: string) => void;
  handleSort: (field: InstitutionListSortField) => void;
  resetFilters: () => void;
  retry: () => void;
}

export function useInstitutionList(): UseInstitutionListReturn {
  const [institutions, setInstitutions] = useState<InstitutionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<InstitutionListSortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState<InstitutionListStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchInstitutions = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const token = ""; // TODO: get from auth context
      const res = await fetch(
        `${API_URL}/api/v1/admin/institutions?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load institutions");
        setStatus("error");
        return;
      }

      const json = await res.json();
      const data = json.data;
      setInstitutions(data.institutions ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.total_pages ?? 0);
      setStatus(data.institutions?.length > 0 ? "data" : "empty");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }, [page, sortBy, sortDir, search, statusFilter]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleSort(field: InstitutionListSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPage(1);
  }

  function handleSetStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return {
    institutions,
    page,
    total,
    totalPages,
    sortBy,
    sortDir,
    searchInput,
    statusFilter,
    status,
    errorMsg,
    setPage,
    setSearchInput,
    setStatusFilter: handleSetStatusFilter,
    handleSort,
    resetFilters,
    retry: fetchInstitutions,
  };
}
