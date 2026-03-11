import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ItemStatus, AssessmentItemRow, OptionRow } from '@journey-os/shared-types';
import { apiClient } from '@/lib/api-client';

/** Filter parameters for the items list query. */
export interface ItemFilters {
  courseId?: string;
  status?: ItemStatus;
  page: number;
  limit: number;
}

/** Single item with options in the list response. */
export interface ItemListEntry extends AssessmentItemRow {
  options: OptionRow[];
}

/** Response shape from GET /api/v1/items. */
export interface ItemListResponse {
  items: ItemListEntry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Build the query string for item list filters.
 * Omits undefined/empty values.
 */
function buildItemsUrl(filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.courseId) params.set('courseId', filters.courseId);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return `/api/v1/items?${params.toString()}`;
}

/**
 * Query hook for fetching paginated assessment items with filters.
 * Uses TanStack Query -- no bare fetch() in components.
 */
export function useAssessmentItems(filters: ItemFilters) {
  return useQuery({
    queryKey: ['assessment-items', filters],
    queryFn: () => apiClient.get<ItemListResponse>(buildItemsUrl(filters)),
    staleTime: 30 * 1000, // 30s
  });
}

/**
 * Query hook for fetching a single assessment item by ID with options.
 * Used by review mode to pre-populate the preview panel.
 */
export function useAssessmentItem(itemId: string | null) {
  return useQuery({
    queryKey: ['assessment-item', itemId],
    queryFn: () => apiClient.get<ItemListEntry>(`/api/v1/items/${itemId}`),
    enabled: !!itemId,
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation hook for saving item content changes (review mode).
 * Invalidates both 'assessment-items' and 'item-versions' on success.
 */
export function useSaveItemContent() {
  const queryClient = useQueryClient();

  return useMutation<
    AssessmentItemRow,
    Error,
    {
      id: string;
      vignette: string;
      stem: string;
      options: { label: string; text: string; is_correct: boolean; rationale: string; misconception_targeted?: string }[];
    }
  >({
    mutationFn: ({ id, ...body }) =>
      apiClient.patch<AssessmentItemRow>(`/api/v1/items/${id}/content`, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-items'] });
      void queryClient.invalidateQueries({ queryKey: ['assessment-item', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['item-versions', variables.id] });
    },
  });
}

/**
 * Mutation hook for updating an assessment item's status (approve/reject).
 * Invalidates the 'assessment-items' query key on success.
 */
export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    AssessmentItemRow,
    Error,
    { id: string; status: ItemStatus }
  >({
    mutationFn: ({ id, status }) =>
      apiClient.patch<AssessmentItemRow>(`/api/v1/items/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessment-items'] });
    },
  });
}
