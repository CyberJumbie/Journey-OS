# STORY-F-22: Inngest Notification Triggers

**Epic:** E-34 (Notification System)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-34-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need automatic notifications triggered by system events so that I am informed when batches complete, reviews are requested, and gap scans find issues.

## Acceptance Criteria
- [ ] Trigger on `batch.complete`: notify batch owner with success/failure summary
- [ ] Trigger on `review.request`: notify assigned reviewer (or all eligible reviewers)
- [ ] Trigger on `review.decision`: notify question generator of approve/reject/revise decision
- [ ] Trigger on `gap.scan.complete`: notify course owner when coverage gaps detected
- [ ] Trigger on `kaizen.drift.detected`: notify institutional admins of quality drift
- [ ] Trigger on `kaizen.lint.complete`: notify admins if critical findings > 0
- [ ] Each trigger creates notification via NotificationService (persists + pushes via Socket.io)
- [ ] Trigger functions are idempotent (safe to replay)
- [ ] Custom error class: `NotificationTriggerError`
- [ ] 8-12 API tests: each trigger event, notification content, recipient resolution, idempotency
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Notifications display via Bell Dropdown (STORY-F-23).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/notification/trigger.types.ts` |
| Service | apps/server | `src/services/notification/trigger-resolver.service.ts` |
| Inngest | apps/server | `src/inngest/functions/notify-batch-complete.fn.ts`, `src/inngest/functions/notify-review-request.fn.ts`, `src/inngest/functions/notify-review-decision.fn.ts`, `src/inngest/functions/notify-gap-scan.fn.ts`, `src/inngest/functions/notify-kaizen.fn.ts` |
| Errors | apps/server | `src/errors/notification-trigger.errors.ts` |
| Tests | apps/server | `src/services/notification/__tests__/trigger-resolver.test.ts`, `src/inngest/functions/__tests__/notification-triggers.test.ts` |

## Database Schema
No new tables. Uses existing `notifications` table from STORY-F-2.

## API Endpoints
No REST endpoints. Inngest functions listen for events:

| Event | Trigger | Recipient |
|-------|---------|-----------|
| `batch.complete` | Batch pipeline finishes | Batch owner |
| `review.request` | Question enters review queue | Assigned/eligible reviewers |
| `review.decision` | Reviewer approves/rejects | Question generator |
| `gap.scan.complete` | Coverage gap scan finishes | Course owner |
| `kaizen.drift.detected` | Quality drift detected | Institutional admins |
| `kaizen.lint.complete` | Lint report has critical findings | Institutional admins |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-10 (notification service exists to push through)
- **Cross-lane:** Batch events (E-20), Review events (E-22), Kaizen events (E-37)

## Testing Requirements
### API Tests (8-12)
1. batch.complete trigger creates notification for batch owner
2. review.request trigger creates notification for assigned reviewer
3. review.request trigger creates notifications for multiple eligible reviewers
4. review.decision trigger creates notification for question generator
5. gap.scan.complete trigger creates notification for course owner
6. kaizen.drift.detected trigger creates notification for all institutional admins
7. kaizen.lint.complete trigger creates notification only if critical findings > 0
8. Idempotency: replaying same event does not create duplicate notification
9. TriggerResolverService resolves correct recipient from event context
10. Notification content includes event-specific summary
11. NotificationService.push() called for each created notification
12. Missing recipient gracefully handled (no crash)

## Implementation Notes
- Inngest functions listen for existing events emitted by other services -- no new event emission needed.
- Recipient resolution: TriggerResolverService maps event to target user(s) based on context.
- `review.request` may notify multiple eligible reviewers -- use bulk notification creation.
- Idempotency: use event ID as dedup key in notification creation.
- Notification content templates: structured message builders per trigger type.
- Consider notification batching: if 10 items complete in quick succession, send 1 summary notification.
- See `docs/solutions/notification-ownership-pattern.md` for ownership resolution patterns.
