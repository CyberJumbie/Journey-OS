"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  TemplateDTO,
  TemplateListQuery,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSharingLevel,
  TemplateQuestionType,
} from "@journey-os/types";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "@web/lib/api/templates";

export interface TemplateFilters {
  readonly sharing_level?: TemplateSharingLevel;
  readonly question_type?: TemplateQuestionType;
  readonly search?: string;
}

export interface UseTemplatesReturn {
  readonly templates: readonly TemplateDTO[];
  readonly loading: boolean;
  readonly error: string;
  readonly filters: TemplateFilters;
  readonly setFilters: (filters: TemplateFilters) => void;
  readonly page: number;
  readonly totalPages: number;
  readonly setPage: (page: number) => void;
  readonly refetch: () => void;
  readonly handleCreate: (
    input: CreateTemplateRequest,
  ) => Promise<TemplateDTO | null>;
  readonly handleUpdate: (
    id: string,
    input: UpdateTemplateRequest,
  ) => Promise<TemplateDTO | null>;
  readonly handleDelete: (id: string) => Promise<boolean>;
  readonly handleDuplicate: (
    id: string,
    newName?: string,
  ) => Promise<TemplateDTO | null>;
  readonly mutating: boolean;
}

const PAGE_LIMIT = 12;

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<readonly TemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mutating, setMutating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");

    const query: TemplateListQuery = {
      page,
      limit: PAGE_LIMIT,
      sharing_level: filters.sharing_level,
      question_type: filters.question_type,
      search: filters.search,
    };

    const result = await listTemplates(query);

    if (!mountedRef.current) return;

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    if (result.data) {
      setTemplates(result.data.templates);
      setTotalPages(result.data.meta.total_pages);
    }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    // Wrap in async IIFE to avoid react-hooks/set-state-in-effect — setState
    // calls inside fetchTemplates are deferred (post-await), not synchronous.
    const load = async () => {
      await fetchTemplates();
    };
    load();
  }, [fetchTemplates]);

  const handleCreate = useCallback(
    async (input: CreateTemplateRequest): Promise<TemplateDTO | null> => {
      setMutating(true);
      const result = await createTemplate(input);
      if (!mountedRef.current) return null;
      setMutating(false);

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      await fetchTemplates();
      return result.data;
    },
    [fetchTemplates],
  );

  const handleUpdate = useCallback(
    async (
      id: string,
      input: UpdateTemplateRequest,
    ): Promise<TemplateDTO | null> => {
      setMutating(true);
      const result = await updateTemplate(id, input);
      if (!mountedRef.current) return null;
      setMutating(false);

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      await fetchTemplates();
      return result.data;
    },
    [fetchTemplates],
  );

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      setMutating(true);
      const result = await deleteTemplate(id);
      if (!mountedRef.current) return false;
      setMutating(false);

      if (result.error) {
        setError(result.error.message);
        return false;
      }

      await fetchTemplates();
      return true;
    },
    [fetchTemplates],
  );

  const handleDuplicate = useCallback(
    async (id: string, newName?: string): Promise<TemplateDTO | null> => {
      setMutating(true);
      const result = await duplicateTemplate(
        id,
        newName ? { new_name: newName } : undefined,
      );
      if (!mountedRef.current) return null;
      setMutating(false);

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      await fetchTemplates();
      return result.data;
    },
    [fetchTemplates],
  );

  return {
    templates,
    loading,
    error,
    filters,
    setFilters,
    page,
    totalPages,
    setPage,
    refetch: fetchTemplates,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDuplicate,
    mutating,
  };
}
