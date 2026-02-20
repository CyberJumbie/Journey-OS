# STORY-F-61: Review Actions

**Epic:** E-23 (Faculty Review UI)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-23-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to approve, reject, or request revision on reviewed questions with comments so that the review workflow produces a clear decision with rationale.

## Acceptance Criteria
- [ ] Three action buttons: Approve, Reject, Request Revision
- [ ] Each action requires a comment (optional for approve, required for reject/revise)
- [ ] Comment thread: threaded discussion on each question for multi-round review
- [ ] Approve: transitions status to `approved`, writes to item bank, triggers dual-write
- [ ] Reject: transitions status to `rejected` with reason, archives question
- [ ] Request Revision: transitions to `revision_requested`, notifies original generator
- [ ] Revision resubmission re-enters validation -> critic -> router pipeline
- [ ] Audit trail: all actions logged with actor, timestamp, comment, previous status
- [ ] 10-14 API tests: each action, comment threading, status transitions, audit trail, resubmission flow
- [ ] TypeScript strict, named exports only

## Reference Screens
> Part of `QuestionDetailView.tsx` -- the action buttons sidebar.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/questions/QuestionDetailView.tsx` (sidebar actions card) | `apps/web/src/components/review/review-action-bar.tsx` | Extract Approve/Reject/Edit buttons into `ReviewActionBar` organism; replace `toast` notifications with proper success/error handling via API; add required comment textarea for reject/revision; replace `export default` with named export; replace hardcoded `bg-success`, `border-destructive` with design token classes; add comment thread component below actions |
| `pages/faculty/QuestWorkbench.tsx` (review mode action buttons) | `apps/web/src/components/review/review-action-bar.tsx` | Merge approve/edit/reject button pattern from workbench review mode into the ReviewActionBar; replace inline `style={{}}` with Tailwind design tokens; replace `C.green`, `C.red` color constants with CSS custom properties |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/action.types.ts` |
| Service | apps/server | `src/services/review/review-action.service.ts`, `src/services/review/comment-thread.service.ts` |
| Controller | apps/server | `src/controllers/review/review-action.controller.ts` |
| Repository | apps/server | `src/repositories/review-comment.repository.ts` |
| View | apps/web | `src/components/review/review-action-bar.tsx`, `src/components/review/comment-thread.tsx` |
| Tests | apps/server | `src/services/review/__tests__/review-action.test.ts`, `src/services/review/__tests__/comment-thread.test.ts` |

## Database Schema

### Supabase -- `review_comments` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `question_id` | uuid | NOT NULL, FK -> questions |
| `author_id` | uuid | NOT NULL, FK -> auth.users |
| `parent_id` | uuid | NULL, FK -> review_comments (self-referencing for threads) |
| `content` | text | NOT NULL |
| `action_type` | varchar(30) | NULL, CHECK IN ('approve', 'reject', 'request_revision') |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### Supabase -- `review_audit_log` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `question_id` | uuid | NOT NULL, FK -> questions |
| `actor_id` | uuid | NOT NULL, FK -> auth.users |
| `action` | varchar(30) | NOT NULL, CHECK IN ('approve', 'reject', 'request_revision', 'resubmit') |
| `previous_status` | varchar(30) | NOT NULL |
| `new_status` | varchar(30) | NOT NULL |
| `comment` | text | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/review/:questionId/approve` | Faculty+ | Approve question with optional comment |
| POST | `/api/v1/review/:questionId/reject` | Faculty+ | Reject question with required comment |
| POST | `/api/v1/review/:questionId/revise` | Faculty+ | Request revision with required comment |
| GET | `/api/v1/review/:questionId/comments` | Faculty+ | Get comment thread for question |
| POST | `/api/v1/review/:questionId/comments` | Faculty+ | Add comment to thread |

## Dependencies
- **Blocks:** STORY-F-68 (Item bank needs approved items)
- **Blocked by:** STORY-F-58 (Review queue exists to navigate from)
- **Cross-epic:** STORY-F-68 (Sprint 18 item bank)

## Testing Requirements
### API Tests (10-14)
1. Approve transitions status to `approved`
2. Approve with optional comment stores comment
3. Reject requires comment, returns 400 without it
4. Reject transitions status to `rejected` with reason
5. Request revision requires comment
6. Request revision transitions to `revision_requested`
7. Revision resubmission creates new version
8. Comment thread returns threaded comments for question
9. Reply comment links to parent via parent_id
10. Audit trail logs action with actor, timestamp, previous/new status
11. DualWriteService triggers on approve (Supabase + Neo4j)
12. Non-reviewer returns 403 on action endpoints
13. Action on already-approved question returns 409

## Implementation Notes
- Approve action triggers DualWriteService: Supabase `questions` table update -> Neo4j `Question` node status update.
- Comment thread stored in Supabase `review_comments` table with `question_id` FK.
- Revision resubmission creates a new version, preserving the original for audit.
- Consider optimistic UI update for action buttons with rollback on failure.
- Keyboard shortcuts: Ctrl+Enter approve, Ctrl+Shift+R reject, Ctrl+Shift+E request revision.
- Multi-table writes (question status + comment + audit log) must use `supabase.rpc()` with a Postgres function for atomicity. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- OOP with `#private` fields; constructor DI for all service dependencies.
- Use `.select().single()` on ALL Supabase write operations.
- Every controller handler must extract `user.id` from `req` and pass to service layer.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
