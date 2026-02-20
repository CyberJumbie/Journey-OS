# STORY-IA-22: SLO-to-ILO Linking

**Epic:** E-09 (Course SLO Linking & Scheduling)
**Feature:** F-04 (Course Management)
**Sprint:** 4
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-09-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to link course SLOs to institutional ILOs via FULFILLS relationships with an approval gate so that curriculum alignment is tracked and verified.

## Acceptance Criteria
- [ ] FULFILLS relationship type defined in Neo4j between SLO and ILO nodes
- [ ] Service to create, read, delete FULFILLS proposals
- [ ] Proposal states: proposed, approved, rejected
- [ ] Approval gate: Course Director proposes, Institutional Admin approves/rejects
- [ ] Repository layer for FULFILLS relationship CRUD in Neo4j
- [ ] Supabase tracking table for FULFILLS with status and audit fields
- [ ] DualWriteService: relationship created in both stores
- [ ] Validation: SLO must belong to a course in the same institution as the ILO
- [ ] Audit fields: proposed_by, proposed_at, reviewed_by, reviewed_at, review_note

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/ReviewSyllabusMapping.tsx` | `apps/web/src/app/(protected)/courses/[id]/slo-mapping/page.tsx` | Convert to Next.js App Router with dynamic route. Replace inline styles with Tailwind + design tokens. Extract SLO-ILO mapping table into organism. Build proposal submission and approval UI. Use `@web/*` path alias. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/objective/fulfills.types.ts` |
| Repository | apps/server | `src/repositories/fulfills.repository.ts` |
| Service | apps/server | `src/services/objective/fulfills.service.ts` |
| Controller | apps/server | `src/controllers/objective/fulfills.controller.ts` |
| Routes | apps/server | `src/routes/course/fulfills.routes.ts` |
| Page | apps/web | `src/app/(protected)/courses/[id]/slo-mapping/page.tsx` |
| Components | apps/web | `src/components/course/slo-ilo-mapping-table.tsx`, `src/components/course/fulfills-proposal-form.tsx`, `src/components/course/fulfills-review-panel.tsx` |
| Tests | apps/server | `src/services/objective/__tests__/fulfills.service.test.ts` |

## Database Schema

### Supabase -- `fulfills` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `slo_id` | uuid | NOT NULL, FK -> slos(id) |
| `ilo_id` | uuid | NOT NULL, FK -> ilos(id) |
| `status` | varchar(20) | NOT NULL, DEFAULT 'proposed', CHECK IN ('proposed', 'approved', 'rejected') |
| `justification` | text | NULL |
| `review_note` | text | NULL |
| `proposed_by` | uuid | NOT NULL, FK -> profiles(id) |
| `proposed_at` | timestamptz | NOT NULL, DEFAULT now() |
| `reviewed_by` | uuid | NULL, FK -> profiles(id) |
| `reviewed_at` | timestamptz | NULL |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

```sql
CREATE UNIQUE INDEX idx_fulfills_slo_ilo ON fulfills(slo_id, ilo_id) WHERE status != 'rejected';
```

### Neo4j -- FULFILLS relationship
```
(SLO)-[:FULFILLS {
  status: 'proposed' | 'approved' | 'rejected',
  proposed_by: uuid,
  proposed_at: datetime,
  reviewed_by: uuid,
  reviewed_at: datetime
}]->(ILO)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/courses/:courseId/fulfills` | Faculty (CD) | Propose SLO-ILO FULFILLS link |
| GET | `/api/v1/courses/:courseId/fulfills` | Faculty+ | List FULFILLS proposals for course |
| PUT | `/api/v1/fulfills/:id/approve` | InstitutionalAdmin | Approve FULFILLS proposal |
| PUT | `/api/v1/fulfills/:id/reject` | InstitutionalAdmin | Reject FULFILLS proposal |
| DELETE | `/api/v1/fulfills/:id` | Faculty (CD) / InstitutionalAdmin | Delete FULFILLS proposal |

## Dependencies
- **Blocked by:** STORY-F-1 (courses must exist), STORY-IA-2 (SLOs must exist), STORY-IA-4 (ILOs must exist)
- **Blocks:** STORY-IA-14 (FULFILLS Workflow extends this with draft state)
- **Cross-lane:** Faculty lane Course Directors propose FULFILLS links

## Testing Requirements
### API Tests (10-12)
- Proposal creation: creates FULFILLS with 'proposed' status
- Approval: transitions to 'approved', creates Neo4j relationship
- Rejection: transitions to 'rejected', records review_note
- Validation: SLO must be in same institution as ILO (cross-institution blocked)
- Duplicate: cannot propose duplicate SLO-ILO pair (unless previous was rejected)
- Permission: only CD can propose, only IA can approve/reject
- Read: list all FULFILLS for a course with status filter
- Delete: removes proposal from both stores
- Audit: proposed_by, reviewed_by, timestamps tracked
- Cross-institution block: SLO from institution A cannot FULFILL ILO from institution B

## Implementation Notes
- ILO and SLO are separate node types per architecture rules -- never combine.
- Neo4j relationship: `(SLO)-[:FULFILLS {status: 'proposed'|'approved'|'rejected'}]->(ILO)`.
- Approval gate is a lightweight workflow: propose + approve/reject. Full 2-step with draft state is STORY-IA-14.
- Audit fields: proposed_by, proposed_at, reviewed_by, reviewed_at, review_note.
- Cross-institution validation: SLO -> course -> program -> institution must match ILO -> institution. Join through intermediate tables.
- DualWriteService: create Supabase record first, then Neo4j relationship.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"`.
- Service uses `readonly #supabaseClient` and `readonly #neo4jRepository` with constructor DI.
