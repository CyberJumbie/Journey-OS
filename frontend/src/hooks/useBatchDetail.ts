import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BulkBatchRow } from '@journey-os/shared-types';

/** Enriched batch item returned by the detail endpoint. */
export interface EnrichedBatchItem {
  id: string;
  batch_id: string;
  item_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  stem_excerpt: string | null;
  bloom_level: number | null;
  usmle_system: string | null;
}

/** Response shape from GET /api/v1/batches/:id. */
export interface BatchDetailResponse {
  batch: BulkBatchRow;
  items: EnrichedBatchItem[];
}

/**
 * Fetch a single batch with its enriched items.
 * Polls every 3 seconds while the batch is not yet completed.
 */
export function useBatchDetail(batchId: string | null) {
  return useQuery({
    queryKey: ['batch-detail', batchId],
    queryFn: () =>
      apiClient.get<BatchDetailResponse>(`/api/v1/batches/${batchId}`),
    enabled: !!batchId,
    staleTime: 2000,
    refetchInterval: (query) => {
      const status = query.state.data?.batch.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3000;
    },
  });
}

/**
 * Mutation hook for retrying a failed batch item.
 * Invalidates the batch detail query on success.
 */
export function useRetryBatchItem() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { batchId: string; batchItemId: string }
  >({
    mutationFn: ({ batchId, batchItemId }) =>
      apiClient.post<{ success: boolean }>(
        `/api/v1/batches/${batchId}/items/${batchItemId}/retry`,
        {},
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['batch-detail', variables.batchId],
      });
      void queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}
