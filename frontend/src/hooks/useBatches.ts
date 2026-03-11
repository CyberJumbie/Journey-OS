import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BulkBatchRow } from '@journey-os/shared-types';

/** Response shape from GET /api/v1/batches. */
interface BatchListResponse {
  batches: BulkBatchRow[];
}

/**
 * Fetch all batches for the current user.
 * Polls every 5 seconds to keep the list up to date.
 */
export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await apiClient.get<BatchListResponse>('/api/v1/batches');
      return res.batches;
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}
