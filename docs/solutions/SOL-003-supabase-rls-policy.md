# SOL-003: Supabase RLS Policy Pattern

## Trigger
Any time adding a new Supabase table. Every table needs RLS enabled + role-based policies.

Story it emerged from: P1-004 (Supabase DDL)

## Pattern

### What it solves
Row-level security ensures faculty can only see their own institution's data. Prevents cross-tenant data leaks.

### Implementation
```sql
-- Always enable RLS on new tables
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Pattern 1: Institution-scoped read (most tables)
CREATE POLICY "Users can read own institution data"
ON your_table FOR SELECT
USING (
  institution_id = (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Pattern 2: Faculty can only write their own records
CREATE POLICY "Faculty can insert for their institution"
ON assessment_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('faculty', 'institutional_admin', 'superadmin')
    AND institution_id = assessment_items.institution_id
  )
);

-- Pattern 3: Faculty can only update their own items
CREATE POLICY "Faculty can update own items"
ON assessment_items FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Pattern 4: Superadmin bypass (for admin operations)
CREATE POLICY "Superadmin full access"
ON your_table FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'superadmin'
  )
);
```

### File naming
```
apps/server/supabase/migrations/
  YYYYMMDDHHMMSS_create_table_name.sql     -- table + indexes
  YYYYMMDDHHMMSS_rls_table_name.sql        -- RLS policies (separate file)
```

### Test pattern
```typescript
// Test with different JWT roles to confirm RLS works
it('faculty cannot read another institution items', async () => {
  const { data } = await supabaseWithFacultyJWT
    .from('assessment_items')
    .select()
    .eq('institution_id', OTHER_INSTITUTION_ID)
  expect(data).toHaveLength(0)  // RLS blocks it
})
```

### Gotchas
- Always create RLS policies in a SEPARATE migration file from the table DDL.
- The `auth.uid()` function returns null for service role — test with actual JWTs.
- Every table needs at minimum: SELECT policy (read) + INSERT policy (write).
- The Express server uses the service role key which bypasses RLS — that's intentional for server-side operations.

## Provenance
Pattern established: P1-004
Applies to: all 9 Phase 1 tables
