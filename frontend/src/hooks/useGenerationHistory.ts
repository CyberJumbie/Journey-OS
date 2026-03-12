import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GenerationHistoryResponse } from '@journey-os/shared-types';

/** Parameters accepted by the generation history hook. */
export interface UseGenerationHistoryParams {
  page?: number;
  limit?: number;
  courseId?: string;
  autoRoute?: 'auto_approve' | 'auto_reject' | 'faculty_review';
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Fetches paginated generation history for the current user.
 * Returns data rows, pagination meta, and monthly stats.
 * Uses keepPreviousData for smooth pagination transitions.
 */
export function useGenerationHistory(params: UseGenerationHistoryParams = {}) {
  const { page = 1, limit = 20, courseId, autoRoute, dateFrom, dateTo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (courseId) searchParams.set('courseId', courseId);
  if (autoRoute) searchParams.set('autoRoute', autoRoute);
  if (dateFrom) searchParams.set('dateFrom', dateFrom);
  if (dateTo) searchParams.set('dateTo', dateTo);

  return useQuery({
    queryKey: ['generation-history', { page, limit, courseId, autoRoute, dateFrom, dateTo }],
    queryFn: () =>
      apiClient.get<GenerationHistoryResponse>(
        `/api/v1/generation-logs?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
