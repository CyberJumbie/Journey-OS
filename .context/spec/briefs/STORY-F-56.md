# STORY-F-56: Review Router

**Epic:** E-22 (Critic Agent & Review Router)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-22-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a review router that automatically routes questions based on critic scores so that high-quality items are fast-tracked, poor items are rejected, and borderline items reach human reviewers.

## Acceptance Criteria
- [ ] Router accepts `CriticResult` and applies threshold-based routing
- [ ] Three outcomes: `auto_approve` (composite >= 4.2), `route_to_review` (2.5-4.2), `auto_reject` (< 2.5)
- [ ] Thresholds configurable per institution and per question type
- [ ] Auto-approve writes `approved` status + audit trail
- [ ] Auto-reject writes `rejected` status with critic justification as reason
- [ ] Route-to-review assigns to review queue with priority based on score
- [ ] Priority assignment: lower composite score = higher review priority
- [ ] Routing decision logged with full provenance (critic scores, thresholds applied, outcome)
- [ ] Custom error class: `RoutingError`
- [ ] 8-12 API tests: each routing outcome, threshold edge cases, config override, priority assignment, audit trail
- [ ] TypeScript strict, named exports only

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/router.types.ts` |
| Service | apps/server | `src/services/review/review-router.service.ts` |
| Repository | apps/server | `src/repositories/review-queue.repository.ts` |
| Errors | apps/server | `src/errors/router.errors.ts` |
| Tests | apps/server | `src/services/review/__tests__/review-router.test.ts` |

## Database Schema

### Supabase -- `review_queue` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `question_id` | uuid | NOT NULL, FK -> questions, UNIQUE |
| `priority` | integer | NOT NULL, CHECK (priority >= 1 AND priority <= 5) |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'in_review', 'revised') |
| `assigned_reviewer_id` | uuid | NULL, FK -> auth.users |
| `routing_decision` | jsonb | NOT NULL |
| `critic_composite_score` | float | NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Supabase -- `routing_audit_log` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `question_id` | uuid | NOT NULL, FK -> questions |
| `outcome` | varchar(20) | NOT NULL, CHECK IN ('auto_approve', 'route_to_review', 'auto_reject') |
| `critic_scores` | jsonb | NOT NULL |
| `thresholds_applied` | jsonb | NOT NULL |
| `automation_level` | varchar(20) | NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/review/route` | Internal | Route a question based on critic result |
| GET | `/api/v1/review/audit/:questionId` | Faculty+ | Get routing audit trail |

## Dependencies
- **Blocks:** STORY-F-58 (Review queue list reads routed items)
- **Blocked by:** STORY-F-53 (Critic agent must exist to produce scores)
- **Cross-epic:** STORY-F-58 (Sprint 13 review queue)

## Testing Requirements
### API Tests (8-12)
1. Routes question with composite >= 4.2 to `auto_approve`
2. Routes question with composite 2.5-4.2 to `route_to_review`
3. Routes question with composite < 2.5 to `auto_reject`
4. Edge case: composite exactly 4.2 routes to `auto_approve`
5. Edge case: composite exactly 2.5 routes to `route_to_review`
6. Custom institutional thresholds override defaults
7. Priority assignment: composite 2.5 -> priority 1, composite 4.1 -> priority 5
8. Auto-approve writes `approved` status and creates audit trail
9. Auto-reject writes `rejected` status with justification
10. Route-to-review inserts into `review_queue` with correct priority
11. Routing decision includes full provenance (scores, thresholds, outcome)
12. Throws `RoutingError` on missing critic result

## Implementation Notes
- Thresholds are not hard boundaries -- institutions may want asymmetric thresholds (stricter auto-approve, lenient auto-reject).
- Auto-approved items still appear in review history for audit purposes.
- Review queue priority: 1 (highest) to 5 (lowest), derived from composite score buckets.
- Status transitions: `validated` -> `scoring` -> `auto_approved` | `pending_review` | `auto_rejected`.
- Consider notification trigger on `route_to_review` outcome (integrates with E-34 in Sprint 19).
- Router reads automation level from institution settings (STORY-F-60) before applying logic.
- OOP with `#private` fields; constructor DI for critic service, queue repository, settings service.
- Use `.select().single()` on ALL Supabase write operations.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
