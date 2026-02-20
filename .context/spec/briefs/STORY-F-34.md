# STORY-F-34: TEACHES Relationship Creation

**Epic:** E-12 (AI Concept Extraction)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-12-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need courses automatically linked to their extracted SubConcepts via TEACHES relationships so that the knowledge graph reflects what each course covers.

## Acceptance Criteria
- [ ] TEACHES relationship created in Neo4j: `(Course)-[:TEACHES]->(SubConcept)`
- [ ] Relationship properties: `status` ('unverified'), `created_at`, `source_content_id`
- [ ] Service creates TEACHES for each SubConcept extracted from a course's content
- [ ] Dedup: no duplicate TEACHES relationships between the same Course and SubConcept
- [ ] DualWriteService: relationship tracked in Supabase junction table + Neo4j edge
- [ ] 5-8 API tests for relationship creation, dedup, status field, dual-write
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend relationship creation only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/teaches.types.ts` |
| Repository | apps/server | `src/repositories/teaches.repository.ts` |
| Service | apps/server | `src/services/concept/teaches.service.ts` |
| Tests | apps/server | `src/services/concept/__tests__/teaches.service.test.ts` |

## Database Schema
Supabase junction table:
```sql
CREATE TABLE course_subconcepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subconcept_id UUID NOT NULL REFERENCES subconcepts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unverified',
  source_content_id UUID REFERENCES contents(id),
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, subconcept_id)
);

CREATE INDEX idx_course_subconcepts_course ON course_subconcepts(course_id);
CREATE INDEX idx_course_subconcepts_subconcept ON course_subconcepts(subconcept_id);
```

Neo4j:
```cypher
(c:Course)-[:TEACHES {status: 'unverified', created_at: datetime(), source_content_id: $contentId}]->(sc:SubConcept)
```

## API Endpoints
No REST endpoints. Called internally as the final step of the extraction pipeline.

## Dependencies
- **Blocked by:** STORY-F-31 (SubConcepts must be extracted)
- **Blocks:** STORY-F-40, STORY-F-41
- **Cross-lane:** Courses must exist (E-08)

## Testing Requirements
- 5-8 API tests: TEACHES relationship creation, dedup (no duplicate for same course+subconcept), status field defaults to 'unverified', source_content_id stored, DualWriteService sync_status, Neo4j edge verification, batch creation for multiple SubConcepts
- 0 E2E tests

## Implementation Notes
- TEACHES with status `unverified` transitions to `TEACHES_VERIFIED` after faculty review (STORY-F-41).
- In Neo4j, the relationship type changes: `TEACHES` -> `TEACHES_VERIFIED` (not a property change, but a relationship type swap).
- One SubConcept can be TEACHES by multiple courses (many-to-many).
- Relationship creation runs as the final step of the extraction pipeline.
- Use `.select().single()` on Supabase writes to verify row affected.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
