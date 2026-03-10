# SOL-001: Dual-Write Service Pattern

## Trigger
Any time data must exist in both Supabase AND Neo4j. Used for: ContentChunk, AssessmentItem, SubConcept (when created via pipeline).

Story it emerged from: bootstrap (known from architecture)

## Pattern

### What it solves
Ensures Supabase is always the source of truth. Neo4j failures are non-fatal. sync_status tracks consistency.

### Implementation
```typescript
// apps/server/src/services/dual-write.service.ts

export class DualWriteService {
  constructor(
    private supabase: SupabaseClient,
    private neo4j: Driver
  ) {}

  async writeAssessmentItem(item: AssessmentItemInsert): Promise<AssessmentItem> {
    // Step 1: Write Supabase FIRST (source of truth)
    const { data, error } = await this.supabase
      .from('assessment_items')
      .insert({ ...item, sync_status: 'pending' })
      .select()
      .single()
    if (error) throw new DatabaseError('Supabase write failed', error)

    // Step 2: Write Neo4j SECOND (secondary)
    try {
      const session = this.neo4j.session()
      await session.executeWrite(tx =>
        tx.run(
          `MERGE (i:AssessmentItem {uuid: $uuid})
           SET i.status = $status, i.bloom_level = $bloomLevel, i.updated_at = $updatedAt`,
          { uuid: data.id, status: data.status, bloomLevel: data.bloom_level,
            updatedAt: new Date().toISOString() }
        )
      )
      session.close()

      // Step 3: Update sync_status on success
      await this.supabase
        .from('assessment_items')
        .update({ sync_status: 'synced' })
        .eq('id', data.id)
    } catch (neo4jError) {
      // Step 3 (failure path): Supabase record persists, mark failed for reconciliation
      await this.supabase
        .from('assessment_items')
        .update({ sync_status: 'failed' })
        .eq('id', data.id)
      console.error('Neo4j write failed — Supabase record persists', neo4jError)
      // Do NOT throw — this is non-fatal
    }

    return data
  }

  // Same pattern for: writeContentChunk(), writeSubConcept()
}
```

### Test pattern
```typescript
// Test 1: Both writes succeed → sync_status = 'synced'
// Test 2: Neo4j fails → Supabase record still exists, sync_status = 'failed'
// Test 3: Supabase fails → throws, no partial state

it('persists to Supabase even when Neo4j fails', async () => {
  mockNeo4j.executeWrite.mockRejectedValue(new Error('connection refused'))
  const result = await dualWriteService.writeAssessmentItem(testItem)
  expect(result.id).toBeDefined()
  const { data } = await supabase.from('assessment_items').select().eq('id', result.id).single()
  expect(data.sync_status).toBe('failed')
})
```

### Gotchas
- ALWAYS write Supabase first. Never Neo4j first. If you reverse the order you violate Rule 2.
- sync_status has 4 states: 'pending' (inserted, not yet attempted), 'synced' (both wrote), 'failed' (Neo4j write failed), 'orphaned' (Supabase record exists but Neo4j node was deleted).
- The reconciliation job (not in Phase 1) reads sync_status='failed' and retries Neo4j writes.
- DualWriteService is the ONLY place cross-DB writes happen. Services call this service, not Supabase + Neo4j directly.

## Provenance
Pattern established: bootstrap session
Applies to: P1-014 (DualWriteService implementation), P1-023 (graph_writer node), P1-028 (approve/reject status update)
