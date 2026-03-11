import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Course list item returned by GET /api/v1/courses.
 * Includes subconcept + item counts enriched from Neo4j + Supabase.
 */
export interface CourseListItem {
  id: string;
  code: string;
  title: string;
  term: string;
  subconcept_count: number;
  item_count: number;
}

/**
 * Fetch courses for the current user's institution via backend API.
 * Uses TanStack Query — no bare fetch() in components.
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.get<CourseListItem[]>('/api/v1/courses'),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
