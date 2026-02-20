# STORY-IA-14: FULFILLS Workflow

**Epic:** E-15 (Objective Mapping & Framework Linking)
**Feature:** F-07 (Learning Objective Management)
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-15-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a 2-step approval workflow for SLO-to-ILO FULFILLS proposals so that curriculum alignment decisions are reviewed before becoming official.

## Acceptance Criteria
- [ ] 2-step approval gate: Step 1 (Course Director proposes), Step 2 (Institutional Admin approves)
- [ ] Proposal states: draft, proposed, approved, rejected
- [ ] Course Director creates FULFILLS proposal with justification text
- [ ] Institutional Admin reviews: approve (with optional note) or reject (with required reason)
- [ ] Notification placeholder: interface for notifying reviewer when proposal is submitted
- [ ] Approved FULFILLS relationship created in Neo4j: `(SLO)-[:FULFILLS {status: 'approved'}]->(ILO)`
- [ ] Rejection allows re-proposal with updated justification
- [ ] Custom error classes: `FulfillsAlreadyProposedError`, `FulfillsNotInReviewableStateError`
- [ ] Audit fields: proposed_by, proposed_at, reviewed_by, reviewed_at, review_note

## Reference Screens
**None** -- backend-only workflow story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/objective/fulfills-workflow.types.ts` |
| Service | apps/server | `src/services/objective/fulfills-workflow.service.ts` |
| Repository | apps/server | `src/repositories/fulfills-workflow.repository.ts` |
| Controller | apps/server | `src/controllers/objective/fulfills-workflow.controller.ts` |
| Routes | apps/server | `src/routes/objective/fulfills-workflow.routes.ts` |
| Errors | apps/server | `src/errors/fulfills.errors.ts` |
| Tests | apps/server | `src/services/objective/__tests__/fulfills-workflow.service.test.ts` |

## Database Schema

### Supabase -- `fulfills_proposals` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `slo_id` | uuid | NOT NULL, FK -> slos(id) |
| `ilo_id` | uuid | NOT NULL, FK -> ilos(id) |
| `status` | varchar(20) | NOT NULL, DEFAULT 'draft', CHECK IN ('draft', 'proposed', 'approved', 'rejected') |
| `justification` | text | NOT NULL |
| `review_note` | text | NULL |
| `rejection_reason` | text | NULL |
| `proposed_by` | uuid | NOT NULL, FK -> profiles(id) |
| `proposed_at` | timestamptz | NULL |
| `reviewed_by` | uuid | NULL, FK -> profiles(id) |
| `reviewed_at` | timestamptz | NULL |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j -- FULFILLS relationship (created on approval)
```
(SLO)-[:FULFILLS {
  status: 'approved',
  proposal_id: uuid,
  approved_at: datetime,
  approved_by: uuid
}]->(ILO)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/fulfills/proposals` | Faculty (CD) | Create/submit FULFILLS proposal |
| GET | `/api/v1/fulfills/proposals` | InstitutionalAdmin+ | List pending proposals |
| GET | `/api/v1/fulfills/proposals/:id` | InstitutionalAdmin+ / Owner | Get proposal detail |
| PUT | `/api/v1/fulfills/proposals/:id/approve` | InstitutionalAdmin | Approve proposal |
| PUT | `/api/v1/fulfills/proposals/:id/reject` | InstitutionalAdmin | Reject proposal |
| PUT | `/api/v1/fulfills/proposals/:id/resubmit` | Faculty (CD) | Resubmit after rejection |

## Dependencies
- **Blocked by:** STORY-IA-4 (ILOs must exist), STORY-IA-2 (SLOs must exist)
- **Blocks:** None (downstream mapping UI in STORY-IA-22)
- **Cross-lane:** STORY-IA-22 (basic FULFILLS relationship from E-09)

## Testing Requirements
### API Tests (10-12)
- Proposal creation: draft state with justification text
- Submission: transitions from draft to proposed
- Approval: creates Neo4j FULFILLS relationship, updates status to approved
- Rejection: requires reason, status set to rejected
- Re-proposal: rejected proposal can be resubmitted with updated justification
- Permission enforcement: only CD can propose, only IA can approve/reject
- State validation: cannot approve a draft (must be proposed first)
- FulfillsAlreadyProposedError: duplicate proposal for same SLO-ILO pair
- FulfillsNotInReviewableStateError: cannot approve already-approved proposal
- Audit trail: proposed_by, reviewed_by, timestamps tracked

## Implementation Notes
- This extends STORY-IA-22 with a more formal 2-step workflow (E-09 had a simpler approval gate).
- FulfillsWorkflow builds on the FULFILLS types from STORY-IA-22 but adds draft state and re-proposal.
- Justification text helps Institutional Admin understand the alignment rationale.
- Notification is an interface only here; actual notification system is E-34 (future sprint).
- DualWriteService: only creates Neo4j relationship on approval (not on proposal).
- Service uses `readonly #supabaseClient` and `readonly #neo4jRepository` with constructor DI.
