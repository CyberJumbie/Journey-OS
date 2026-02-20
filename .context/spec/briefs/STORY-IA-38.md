# STORY-IA-38: Gap Alert Service

**Epic:** E-29 (Gap-Driven Generation)
**Feature:** F-13
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-29-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need automatic alerts when new coverage gaps are detected so that I can proactively address curriculum blind spots before they accumulate.

## Acceptance Criteria
- [ ] GapAlertService listens for `coverage.gaps.detected` Inngest events from nightly job
- [ ] Creates in-app notifications for institutional admins of affected institution
- [ ] Alert content: system, discipline, number of new gaps, link to heatmap drill-down
- [ ] Alert severity levels: info (1-2 new gaps), warning (3-5), critical (6+)
- [ ] Alerts visible on faculty dashboard and admin dashboard
- [ ] Alert deduplication: don't re-alert for gaps already flagged and not yet resolved
- [ ] 5-8 API tests: event consumption, notification creation, severity classification, deduplication, alert content

## Reference Screens
> No direct screen -- backend service with notification delivery.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | Backend-only story. Notifications appear in existing notification UI and dashboard feeds. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/alerts.types.ts` |
| Service | apps/server | `src/services/coverage/gap-alert.service.ts` |
| Inngest | apps/server | `src/inngest/functions/gap-alert-handler.fn.ts` |
| Repository | apps/server | `src/repositories/notification.repository.ts` (update or create) |
| Tests | apps/server | `src/services/coverage/__tests__/gap-alert.test.ts` |

## Database Schema
Uses existing `notifications` table. No new tables needed.

### Notification Record Shape
```json
{
  "id": "uuid",
  "user_id": "uuid (institutional admin)",
  "type": "coverage_gap",
  "severity": "info | warning | critical",
  "title": "New Coverage Gaps Detected",
  "body": "3 new gaps found in Cardiovascular / Pathology",
  "link": "/coverage/cardiovascular/pathology",
  "is_read": false,
  "created_at": "timestamptz"
}
```

## API Endpoints
No new API endpoints. Service is triggered by Inngest event handler.

## Dependencies
- **Blocked by:** S-IA-28-4 (nightly job emits gap events)
- **Blocks:** None
- **Cross-epic:** S-F-32-1 (faculty dashboard activity feed), S-IA-36-1 (admin dashboard)

## Testing Requirements
### API Tests (7)
1. Event handler creates notification on `coverage.gaps.detected` event
2. Alert content includes system, discipline, gap count, drill-down link
3. Severity: info for 1-2 gaps, warning for 3-5, critical for 6+
4. Deduplication: no re-alert for existing unread gap notification
5. Notification targets institutional admins of affected institution
6. Link format: `/coverage/${system}/${discipline}`
7. Multiple gap events for different system-disciplines create separate notifications

## Implementation Notes
- Inngest event handler: `inngest.createFunction({id: 'gap-alert-handler'}, {event: 'coverage.gaps.detected'}, async ({event}) => {...})`
- Notification stored in Supabase `notifications` table
- Deduplication: check `notifications` table for existing unread gap alerts for same system-discipline before creating new one
- Link format: `/coverage/${system}/${discipline}` -- deep link to drill-down page
- Future: email alerts via E-34 notification system; for now, in-app only
- Private fields with `#` syntax, constructor DI per architecture rules
