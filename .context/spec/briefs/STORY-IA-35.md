# STORY-IA-35: Lint Alert Integration

**Epic:** E-37 (KaizenML Linting & Golden Dataset)
**Feature:** F-17
**Sprint:** 15
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-37-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need push notifications when new lint issues are detected so that critical data quality problems are addressed promptly without checking the dashboard manually.

## Acceptance Criteria
- [ ] Alert triggered on lint run completion when critical findings > 0
- [ ] Alert triggered on golden dataset drift detection
- [ ] Alert payload: summary of findings count by severity, link to report
- [ ] Alert channel: in-app notification (prepares for E-34 notification system)
- [ ] Interim implementation: Supabase `notifications` table insert + SSE push
- [ ] Configurable alert threshold: minimum severity to trigger notification
- [ ] Alert suppression: don't re-alert for previously seen findings
- [ ] 5-8 API tests: alert trigger conditions, suppression logic, threshold config

## Reference Screens
> No direct screen -- backend service with notification delivery.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | Backend-only story. Notifications appear in existing notification UI. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/kaizen/alert.types.ts` |
| Service | apps/server | `src/services/kaizen/lint-alert.service.ts` |
| Tests | apps/server | `src/services/kaizen/__tests__/lint-alert.test.ts` |

## Database Schema
Uses existing `notifications` table. No new tables needed.

## API Endpoints
No new API endpoints. Service is triggered internally by lint engine events.

## Dependencies
- **Blocked by:** S-IA-37-1 (lint engine produces findings to alert on)
- **Blocks:** None
- **Cross-epic:** S-F-34-1 (Sprint 19 notification model -- interim solution until then)

## Testing Requirements
### API Tests (7)
1. Alert triggered when critical findings > 0
2. Alert triggered on drift detection event
3. Alert payload contains severity breakdown and report link
4. Alert suppressed for previously seen findings (fingerprint match)
5. Configurable threshold filters low-severity findings
6. Drift alerts have higher urgency than lint alerts
7. Notification created in Supabase notifications table

## Implementation Notes
- Interim notification: direct Supabase insert until E-34 notification system is built
- When E-34 is available, refactor to use NotificationService instead of direct insert
- Alert suppression uses finding fingerprint: hash of (ruleId + affectedNodeId)
- SSE push to admin dashboard for real-time alert display
- Drift alerts are higher priority than lint alerts -- consider separate urgency level
- Private fields with `#` syntax per architecture rules
- Constructor DI for notification repository and lint engine
