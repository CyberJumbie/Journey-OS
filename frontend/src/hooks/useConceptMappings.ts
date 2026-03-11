import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/** Shape of a single concept mapping from the API. */
export interface ConceptMapping {
  chunkUuid: string;
  chunkExcerpt: string;
  subConceptUuid: string;
  subConceptName: string;
  confidence: number;
  status: 'pending';
}

/** Response shape from GET /api/v1/courses/:courseId/concept-mappings. */
interface ConceptMappingListResponse {
  mappings: ConceptMapping[];
}

/** Response from PATCH verify/reject. */
interface VerifyResponse {
  success: boolean;
  action: 'verify' | 'reject';
}

/** Response from POST bulk-verify. */
interface BulkVerifyResponse {
  verifiedCount: number;
}

/**
 * Query hook for fetching pending TEACHES edges for a course.
 * Uses TanStack Query -- no bare fetch() in components.
 */
export function useConceptMappings(courseId: string) {
  return useQuery({
    queryKey: ['concept-mappings', courseId],
    queryFn: async () => {
      const res = await apiClient.get<ConceptMappingListResponse>(
        `/api/v1/courses/${courseId}/concept-mappings`,
      );
      return res.mappings;
    },
    enabled: !!courseId,
    staleTime: 10 * 1000,
  });
}

/**
 * Mutation hook for verifying or rejecting a single TEACHES mapping.
 * Invalidates the concept-mappings query on success.
 */
export function useVerifyMapping() {
  const queryClient = useQueryClient();

  return useMutation<
    VerifyResponse,
    Error,
    { chunkUuid: string; subConceptUuid: string; action: 'verify' | 'reject' }
  >({
    mutationFn: ({ chunkUuid, subConceptUuid, action }) =>
      apiClient.patch<VerifyResponse>(
        `/api/v1/concept-mappings/${chunkUuid}/${subConceptUuid}/verify`,
        { action },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['concept-mappings'] });
    },
  });
}

/**
 * Mutation hook for bulk-verifying all high-confidence mappings for a course.
 * Invalidates the concept-mappings query on success.
 */
export function useBulkVerify(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BulkVerifyResponse,
    Error,
    { threshold?: number }
  >({
    mutationFn: (body) =>
      apiClient.post<BulkVerifyResponse>(
        `/api/v1/courses/${courseId}/concept-mappings/bulk-verify`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['concept-mappings'] });
    },
  });
}
