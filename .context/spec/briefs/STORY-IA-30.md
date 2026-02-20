# STORY-IA-30: FULFILLS Review Queue

**Epic:** E-15 (Objective Mapping & Framework Linking)
**Feature:** F-07
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-15-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a review queue for FULFILLS proposals so that I can approve or reject SLO-to-ILO alignment requests with an audit trail.

## Acceptance Criteria
- [ ] Review queue page listing all pending FULFILLS proposals for the institution
- [ ] Each proposal shows: SLO code/title, ILO code/title, proposer name, justification, submitted date
- [ ] Actions per proposal: Approve (with optional note), Reject (with required reason)
- [ ] Bulk approve action for multiple selected proposals
- [ ] Filter by: course, proposer, submission date range
- [ ] Sort by: submission date, course name
- [ ] Approval/rejection updates FULFILLS status and creates audit trail record
- [ ] Review statistics: pending count, approved this week, rejected this week
- [ ] Controller endpoints: GET /fulfills/pending, PATCH /fulfills/:id/review
- [ ] 8-10 API tests for queue listing, approve, reject, filtering, audit trail

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/FULFILLSReviewQueue.tsx` | `apps/web/src/app/(protected)/admin/fulfills-review/page.tsx` | Replace `AdminDashboardLayout` with route group layout. Convert `export default` (required for page.tsx). Extract proposal cards into molecule component. Add reject reason dialog (required field). Add bulk approve checkbox selection. Replace hardcoded colors (`text-red-600`, `bg-green-600`) with design tokens. Add filter/sort controls. Add review statistics section. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/fulfills/fulfills-review.types.ts` |
| Controller | apps/server | `src/controllers/fulfills/fulfills-review.controller.ts` |
| Route | apps/server | `src/routes/fulfills-review.routes.ts` |
| Validation | apps/server | `src/middleware/fulfills-review.validation.ts` |
| View - Page | apps/web | `src/app/(protected)/admin/fulfills-review/page.tsx` |
| View - Queue | apps/web | `src/components/organisms/fulfills-review/fulfills-review-queue.tsx` |
| View - Card | apps/web | `src/components/molecules/fulfills-proposal-card.tsx` |
| View - Stats | apps/web | `src/components/molecules/fulfills-review-stats.tsx` |
| Hook | apps/web | `src/hooks/use-fulfills-review.ts` |
| Tests | apps/server | `src/controllers/fulfills/__tests__/fulfills-review.controller.test.ts` |

## Database Schema
Uses existing `fulfills` junction table. Verify columns via `list_tables`.

### Audit Trail -- `fulfills_reviews` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `fulfills_id` | uuid | NOT NULL, FK -> fulfills |
| `reviewer_id` | uuid | NOT NULL, FK -> auth.users |
| `action` | varchar(20) | NOT NULL, CHECK IN ('approved', 'rejected') |
| `reason` | text | NULL (required for rejection) |
| `note` | text | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/fulfills/pending` | institutional_admin | List pending FULFILLS proposals |
| PATCH | `/api/v1/fulfills/:id/review` | institutional_admin | Approve or reject a proposal |
| POST | `/api/v1/fulfills/bulk-approve` | institutional_admin | Bulk approve selected proposals |

## Dependencies
- **Blocked by:** S-IA-15-1 (FULFILLS workflow service must exist)
- **Blocks:** None
- **Cross-epic:** S-U-01-3 (RBAC: institutional_admin role required)

## Testing Requirements
### API Tests (10)
1. GET /fulfills/pending returns pending proposals for institution
2. GET /fulfills/pending with course filter
3. GET /fulfills/pending sorted by submission date
4. PATCH /fulfills/:id/review with action=approved
5. PATCH /fulfills/:id/review with action=rejected requires reason
6. Rejected without reason returns 422
7. Approval creates audit trail record
8. Bulk approve processes multiple proposals atomically
9. Review stats return correct counts
10. Unauthorized user gets 403

## Implementation Notes
- FulfillsReviewQueue is an Organism with FulfillsProposalCard and FulfillsReviewStats Molecules
- Only Institutional Admins see this queue (RBAC enforced at controller level)
- Audit trail stored in `fulfills_reviews` table
- Reject reason is required to give Course Directors actionable feedback
- Use design tokens for proposal card styling, status badges (pending: yellow, approved: green, rejected: red)
- UI mirrors the Concept Review Queue pattern (S-F-13-1) for consistency
- Prototype shows SLO text, parent session, linked ILO, LCME element, mapped by -- preserve all in production
