import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import type { CourseRow } from '@journey-os/shared-types';

/**
 * Fetch courses for the current user's institution.
 * Uses Supabase browser client with RLS — automatically scoped to the user's institution.
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<CourseRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      return data as CourseRow[];
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
