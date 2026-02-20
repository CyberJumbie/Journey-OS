---
name: supabase-transactional-rpc-pattern
tags: [supabase, rpc, transaction, atomic, multi-table]
story: STORY-SA-4
date: 2026-02-20
---
# Supabase Transactional RPC Pattern

## Problem
Sequential Supabase client-side queries (`from().update()` → `from().update()` →
`from().insert()`) are NOT atomic. If query 2 fails, query 1 has already committed.
This leaves data in an inconsistent state (e.g., user reassigned but course
memberships not archived, or no audit log created).

## Solution
Wrap multi-table writes in a Postgres function and call it via `supabase.rpc()`.
The database function runs in a single transaction — all-or-nothing.

```sql
-- Migration: create the RPC function
CREATE OR REPLACE FUNCTION reassign_user(
  p_user_id UUID,
  p_target_institution_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_admin_user_id UUID,
  p_from_institution_id UUID,
  p_from_institution_name TEXT,
  p_to_institution_name TEXT,
  p_was_course_director BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_courses_archived INT;
  v_audit_log_id UUID;
  v_updated_row RECORD;
BEGIN
  -- 1. Optimistic lock: update profile only if updated_at matches
  UPDATE profiles
  SET institution_id = p_target_institution_id,
      is_course_director = false,
      updated_at = now()
  WHERE id = p_user_id
    AND updated_at = p_expected_updated_at
  RETURNING * INTO v_updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONCURRENT_MODIFICATION';
  END IF;

  -- 2. Archive active course memberships
  WITH archived AS (
    UPDATE course_members
    SET status = 'archived', updated_at = now()
    WHERE user_id = p_user_id AND status = 'active'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_courses_archived FROM archived;

  -- 3. Create audit log entry
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_admin_user_id,
    'user_reassignment',
    'profile',
    p_user_id,
    jsonb_build_object('institution_id', p_from_institution_id, 'is_course_director', p_was_course_director),
    jsonb_build_object('institution_id', p_target_institution_id, 'is_course_director', false),
    jsonb_build_object(
      'from_institution_name', p_from_institution_name,
      'to_institution_name', p_to_institution_name,
      'courses_archived', v_courses_archived,
      'reason', p_reason
    )
  )
  RETURNING id INTO v_audit_log_id;

  RETURN jsonb_build_object(
    'courses_archived', v_courses_archived,
    'audit_log_id', v_audit_log_id
  );
END;
$$;
```

```typescript
// Service — call via supabase.rpc()
const { data, error } = await this.#supabaseClient.rpc("reassign_user", {
  p_user_id: userId,
  p_target_institution_id: targetInstitutionId,
  p_expected_updated_at: expectedUpdatedAt,
  p_admin_user_id: adminUserId,
  p_from_institution_id: fromInstitutionId,
  p_from_institution_name: fromInstitutionName,
  p_to_institution_name: toInstitutionName,
  p_was_course_director: wasCourseDirector,
  p_reason: reason,
});

if (error) {
  if (error.message.includes("CONCURRENT_MODIFICATION")) {
    throw new ConcurrentModificationError();
  }
  throw new UserReassignmentError(`Transaction failed: ${error.message}`);
}

const result = data as { courses_archived: number; audit_log_id: string };
```

```typescript
// Test — mock rpc() directly
const rpcFn = vi.fn().mockResolvedValue({
  data: { courses_archived: 3, audit_log_id: "audit-1" },
  error: null,
});

const supabase = { from: fromFn, rpc: rpcFn } as unknown as SupabaseClient;
```

### Key Rules
1. **Optimistic locking**: Pass `expected_updated_at` to detect concurrent modifications.
2. **SECURITY DEFINER**: The function runs with the definer's permissions, so RLS is bypassed. Validate authorization in the service layer BEFORE calling RPC.
3. **Return JSONB**: Return structured results so the service can extract counts and IDs.
4. **Test rpc() not from()**: Mock `supabase.rpc` in tests, not individual table chains.

## When to Use
- Any operation that writes to 2+ tables and must be atomic
- Operations with optimistic locking (concurrent modification detection)
- Operations that produce audit log entries alongside the main write

## When NOT to Use
- Single-table writes (use repository pattern with `.select().single()`)
- Read-only queries
- DualWrite (Supabase → Neo4j) — the Neo4j write is best-effort, not transactional

## Source Reference
[STORY-SA-4 § UserReassignmentService.#executeReassignment]
