# STORY-F-62: Self-Review Mode

**Epic:** E-23 (Faculty Review UI)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-23-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to review my own generated questions with appropriate restrictions so that I can self-check work while maintaining review integrity.

## Acceptance Criteria
- [ ] Self-review mode activated when reviewer is same as question generator
- [ ] Visual indicator: banner showing "Self-Review Mode" with different styling
- [ ] Restriction: self-reviewed approvals marked as `self_approved` (distinct from `approved`)
- [ ] `self_approved` items may require secondary review based on automation level config
- [ ] Self-reviewer cannot change critic scores (read-only in self-review)
- [ ] Comments still available for self-documentation
- [ ] Institution setting to enable/disable self-review entirely
- [ ] 5-8 API tests: self-review detection, restricted actions, self_approved status, institution toggle
- [ ] TypeScript strict, named exports only

## Reference Screens
> Filter/mode in `QuestionReviewList.tsx`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/questions/QuestionReviewList.tsx` | `apps/web/src/app/(protected)/review/page.tsx` | Add "My Generated" filter option to existing filter chips; when active, show self-review banner; restrict approve action to produce `self_approved` status; no new page needed -- extends existing review page |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/self-review.types.ts` |
| Service | apps/server | `src/services/review/self-review.service.ts` |
| View | apps/web | `src/components/review/self-review-banner.tsx` |
| Tests | apps/server | `src/services/review/__tests__/self-review.test.ts` |

## Database Schema
No new tables. Extends existing structures:

```sql
-- Add self_approved to questions status CHECK constraint (if not already present):
-- ALTER TABLE questions DROP CONSTRAINT questions_status_check;
-- ALTER TABLE questions ADD CONSTRAINT questions_status_check
--   CHECK (status IN ('draft', 'validating', 'validated', 'scoring', 'pending_review',
--     'in_review', 'approved', 'self_approved', 'rejected', 'revision_requested',
--     'needs_manual_review', 'archived'));

-- Institution setting for self-review toggle:
-- Uses existing institution_settings key-value pattern:
-- key: 'allow_self_review', value: 'true' | 'false'
```

Before writing DDL, verify via Supabase MCP `list_tables`.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/review/:questionId/self-review-check` | Faculty+ | Check if current user is the question generator |
| GET | `/api/v1/settings/self-review` | InstitutionalAdmin+ | Get self-review setting |
| PATCH | `/api/v1/settings/self-review` | InstitutionalAdmin+ | Toggle self-review on/off |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-58 (Review queue page exists)
- **Cross-epic:** None

## Testing Requirements
### API Tests (5-8)
1. Self-review detected when reviewer_id matches question.generated_by
2. Self-review approve produces `self_approved` status instead of `approved`
3. Self-reviewer cannot modify critic scores (returns 403 on score edit)
4. Comments allowed in self-review mode
5. Institution setting `allow_self_review=false` blocks self-review entirely (returns 403)
6. Institution setting `allow_self_review=true` permits self-review
7. Default institution setting is `true` (self-review allowed)
8. `self_approved` items flagged for optional secondary review

## Implementation Notes
- Self-review is common in smaller programs where faculty numbers are limited.
- `self_approved` status useful for audit reports -- shows which items had independent review vs. self-review.
- Auth check: compare `question.generated_by` with `request.user.id`.
- Consider configurable policy: some institutions may allow self-review only for specific question types.
- Self-review cannot change the automation level routing decision.
- SelfReviewBanner component: informational banner with distinct styling (e.g., `--color-warning` background tint). Shows "You are reviewing your own question" message with restrictions listed.
- OOP with `#private` fields; constructor DI for settings service, question repository.
- Use `@web/*` path alias for all web app imports.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
