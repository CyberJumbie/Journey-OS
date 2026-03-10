# SOL-002: Neo4j MERGE Idempotent Pattern

## Trigger
Any time writing a node or relationship to Neo4j. Always use MERGE, never CREATE.

Story it emerged from: bootstrap (Rule 3 of the 10 rules)

## Pattern

### What it solves
Prevents duplicate nodes if the pipeline re-runs, if a retry fires, or if the same seed data is applied twice.

### Implementation
```typescript
// ✅ CORRECT — MERGE + SET is idempotent
await session.executeWrite(tx =>
  tx.run(
    `MERGE (s:SubConcept {uuid: $uuid})
     SET s.name = $name,
         s.domain = $domain,
         s.updated_at = $updatedAt`,
    { uuid: concept.uuid, name: concept.name, domain: concept.domain,
      updatedAt: new Date().toISOString() }
  )
)

// ✅ CORRECT — MERGE for relationships too
await session.executeWrite(tx =>
  tx.run(
    `MATCH (c:Course {uuid: $courseUuid})
     MATCH (s:SubConcept {uuid: $conceptUuid})
     MERGE (c)-[:TEACHES]->(s)`,
    { courseUuid, conceptUuid }
  )
)

// ❌ WRONG — CREATE creates duplicates on retry
await session.executeWrite(tx =>
  tx.run('CREATE (s:SubConcept {uuid: $uuid, name: $name})', { uuid, name })
)

// ❌ WRONG — CREATE for relationships too
await session.executeWrite(tx =>
  tx.run('MATCH (c:Course {uuid: $cId}) MATCH (s:SubConcept {uuid: $sId}) CREATE (c)-[:TEACHES]->(s)', ...)
)
```

### Skinny node rule (Rule 4)
```typescript
// ✅ CORRECT — only uuid + key lookup fields + status in Neo4j
MERGE (i:AssessmentItem {uuid: $uuid})
SET i.status = $status, i.bloom_level = $bloomLevel, i.updated_at = $updatedAt

// ❌ WRONG — text content belongs in Supabase, not Neo4j
MERGE (i:AssessmentItem {uuid: $uuid})
SET i.stem = $stem,         // ❌ full text
    i.vignette = $vignette, // ❌ full text
    i.rationale = $rationale // ❌ full text
```

### Node size rule
Neo4j nodes must stay under 100 bytes of non-indexed content.
uuid (36 chars) + status (10 chars) + updated_at (24 chars) = ~70 bytes. That's the target.

### Gotchas
- `MERGE` on a node requires a unique property to match on. Always use `uuid`.
- Properties in SET after MERGE are always overwritten — this is intentional for idempotency.
- Relationship MERGE does not require a unique property — the combination of (start)-[rel]->(end) is unique enough.
- Never put `content`, `text`, `body`, `stem`, `vignette`, `rationale` as Neo4j properties.

## Provenance
Pattern established: bootstrap session
Applies to: P1-005, P1-006 (seeds), P1-013 (concept extraction), P1-014 (DualWrite), P1-023 (graph_writer)
