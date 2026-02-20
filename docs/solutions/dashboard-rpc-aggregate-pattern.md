---
name: dashboard-rpc-aggregate-pattern
tags: [supabase, rpc, dashboard, aggregate, course-cards, faculty]
story: STORY-F-12
date: 2026-02-20
---
# Dashboard RPC Aggregate Pattern

## Problem
Dashboard cards need data from multiple tables with aggregates (COUNT, computed fields).
PostgREST `.select()` with nested joins can't compute aggregates or concatenate fields.
Sequential client-side queries create N+1 patterns and can't be sorted server-side.

## Solution
Create a Postgres function exposed via `supabase.rpc()` that returns a flat table
with all computed fields. The service layer maps the raw result to typed DTOs.

### Migration (DDL)
```sql
CREATE OR REPLACE FUNCTION get_faculty_courses(p_faculty_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  term TEXT,           -- concatenated from semester + academic_year
  status TEXT,
  question_count BIGINT,  -- LEFT JOIN LATERAL COUNT
  coverage_percent NUMERIC,
  last_activity_at TIMESTAMPTZ,
  program_id UUID,
  program_name TEXT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.code,
    CONCAT_WS(' ', c.semester, c.academic_year) AS term,
    c.status::TEXT,
    COALESCE(q.cnt, 0) AS question_count,
    0::NUMERIC AS coverage_percent,   -- placeholder for future story
    c.updated_at AS last_activity_at,
    p.id AS program_id,
    p.name AS program_name
  FROM course_members cm
  JOIN courses c ON c.id = cm.course_id
  LEFT JOIN programs p ON p.id = c.program_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt
    FROM assessment_items ai
    WHERE ai.course_id = c.id
  ) q ON TRUE
  WHERE cm.user_id = p_faculty_id
    AND cm.role = 'faculty'
    AND cm.status = 'active'
  ORDER BY c.updated_at DESC NULLS LAST;
END;
$$;
```

### Service
```typescript
export class FacultyCourseService {
  readonly #supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }

  async listForFaculty(
    facultyId: string,
    isCourseDirector: boolean,
  ): Promise<FacultyCourseListResponse> {
    const rpcName = isCourseDirector ? "get_director_courses" : "get_faculty_courses";
    const paramName = isCourseDirector ? "p_director_id" : "p_faculty_id";

    const { data, error } = await this.#supabase.rpc(rpcName, {
      [paramName]: facultyId,
    });

    if (error) throw new Error(`Failed to fetch: ${error.message}`);

    const courses: CourseCardData[] = (data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        // ... map all fields with defaults for nullable columns
      }),
    );

    return { courses };
  }
}
```

### Supporting indexes
```sql
CREATE INDEX IF NOT EXISTS idx_course_members_user_role
  ON course_members(user_id, role) WHERE status = 'active';
```

## When to use
- Dashboard widgets that show aggregated data from 3+ tables
- Cards with computed fields (COUNT, CONCAT, etc.)
- Read-only endpoints where a single RPC is cleaner than nested PostgREST queries

## When NOT to use
- Simple CRUD where PostgREST `.select()` with joins suffices
- Write operations (use transactional RPC pattern instead)
- Queries that need client-side pagination with PostgREST `.range()`
