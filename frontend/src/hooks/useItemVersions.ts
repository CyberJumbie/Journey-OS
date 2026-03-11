import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/** Row shape from assessment_item_versions table. */
export interface ItemVersionRow {
  id: string;
  item_id: string;
  vignette: string | null;
  stem: string | null;
  options: {
    label: string;
    text: string;
    is_correct: boolean;
    rationale: string;
    misconception_targeted?: string;
  }[];
  edit_instruction: string | null;
  edited_by: string | null;
  created_at: string;
}

/** Response shape from GET /api/v1/items/:id/versions. */
interface ItemVersionsResponse {
  versions: ItemVersionRow[];
}

/**
 * P2-008: Hook to fetch version history for an assessment item.
 * TanStack Query — no bare fetch() in components.
 */
export function useItemVersions(itemId: string | null) {
  return useQuery({
    queryKey: ['item-versions', itemId],
    queryFn: () =>
      apiClient.get<ItemVersionsResponse>(`/api/v1/items/${itemId}/versions`),
    enabled: !!itemId,
    staleTime: 30 * 1000,
    select: (data) => data.versions,
  });
}
