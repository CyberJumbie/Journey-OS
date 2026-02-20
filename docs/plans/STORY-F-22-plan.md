# Plan: STORY-F-22 — Inngest Notification Triggers

## Tasks (from brief, with refinements)

| # | Task | File | Notes |
|---|------|------|-------|
| 0 | Install `inngest` package | `apps/server/package.json` | **Not currently installed** — `pnpm --filter server add inngest` |
| 1 | Define trigger event types, recipient resolution types | `packages/types/src/notification/trigger.types.ts` | Create. 6 payload interfaces + `ResolvedRecipients` + `TriggerDedupKey` |
| 2 | Update notification barrel export | `packages/types/src/notification/index.ts` | Edit — add `export * from "./trigger.types"` |
| 3 | Root barrel — **no change needed** | `packages/types/src/index.ts` | Already exports `./notification` |
| 4 | Rebuild types package | `packages/types/tsconfig.json` | `tsc -b` after type changes |
| 5 | Add `NotificationTriggerError` | `apps/server/src/errors/notification.error.ts` | Edit — append class extending `JourneyOSError` with code `"NOTIFICATION_TRIGGER_ERROR"` |
| 6 | Export new error | `apps/server/src/errors/index.ts` | Edit — add to existing notification.error re-export |
| 7 | Add `existsByEventId()` to repository | `apps/server/src/repositories/notification.repository.ts` | Edit — query `metadata->>'event_id'` + `metadata->>'trigger_type'` for idempotency |
| 8 | Create Inngest client singleton | `apps/server/src/inngest/client.ts` | Create — `new Inngest({ id: "journey-os" })` |
| 9 | Implement `TriggerResolverService` | `apps/server/src/services/notification/trigger-resolver.service.ts` | Create — OOP, `#supabaseClient`, switch-based resolution, `#resolveInstitutionalAdmins()` helper |
| 10 | Implement `notify-batch-complete.fn.ts` | `apps/server/src/inngest/functions/notify-batch-complete.fn.ts` | Create — dedup → resolve → create |
| 11 | Implement `notify-review-request.fn.ts` | `apps/server/src/inngest/functions/notify-review-request.fn.ts` | Create — bulk via `createBatch()` |
| 12 | Implement `notify-review-decision.fn.ts` | `apps/server/src/inngest/functions/notify-review-decision.fn.ts` | Create |
| 13 | Implement `notify-gap-scan.fn.ts` | `apps/server/src/inngest/functions/notify-gap-scan.fn.ts` | Create |
| 14 | Implement `notify-kaizen.fn.ts` | `apps/server/src/inngest/functions/notify-kaizen.fn.ts` | Create — handles both drift + lint; lint suppressed when `critical_findings === 0` |
| 15 | Create Inngest barrel + function list | `apps/server/src/inngest/index.ts` | Create — exports all functions for registration |
| 16 | Register Inngest serve route in Express app | `apps/server/src/index.ts` | Edit — add `app.use("/api/inngest", serve(...))` |
| 17 | Write API tests (12 tests) | `apps/server/src/__tests__/notification/triggers.test.ts` | Create — mock Inngest step runner, NotificationService, TriggerResolverService |

## Implementation Order

```
Types (1-4) → Error (5-6) → Repository (7) → Inngest Client (8) →
Service (9) → Functions (10-14) → Barrel + Registration (15-16) → Tests (17)
```

## Patterns to Follow

- **OOP + DI:** JS `#private` fields, constructor DI for `SupabaseClient` — matches `NotificationRepository` and `NotificationService`
- **Inngest function pattern:** `step.run()` for each discrete step (dedup check, resolve, create) — provides automatic retries per step
- **Idempotency:** Store `{ event_id, trigger_type }` in notification `metadata` JSONB. Query `metadata->>'event_id'` before creation
- **Bulk notifications:** Use existing `repository.createBatch()` for `review.request` (multiple reviewers)
- **Error class:** Extend `JourneyOSError` from `base.errors.ts` — code: `"NOTIFICATION_TRIGGER_ERROR"`
- **Kaizen lint suppression:** Short-circuit return when `critical_findings === 0`
- **Notification types:** Use existing `NotificationType` values (`"alert"`, `"course"`, etc.) — no new types needed in the enum
- `docs/solutions/notification-ownership-pattern.md` — ownership/auth reference
- `docs/solutions/supabase-mock-factory.md` — test mock patterns

## Key Design Decisions

### Inngest Client + Registration
The `inngest/` directory doesn't exist yet. Create:
- `client.ts` — singleton `new Inngest({ id: "journey-os" })`
- `functions/` — one file per trigger (kaizen combines drift + lint)
- `index.ts` — barrel exporting all functions
- Register in Express via `serve({ client, functions })` at `/api/inngest`

### TriggerResolverService Recipient Resolution
| Event | Recipient Logic |
|-------|----------------|
| `batch.complete` | `payload.owner_id` directly |
| `review.request` | `payload.assigned_reviewer_ids` directly |
| `review.decision` | `payload.generator_id` directly |
| `gap.scan.complete` | `payload.course_owner_id` directly |
| `kaizen.drift.detected` | Query `profiles` for users with `role = 'institutional_admin'` AND `institution_id` matching payload |
| `kaizen.lint.complete` | Same as drift — institutional admins for the institution |

Most recipients come directly from the payload. Only kaizen events need a DB query.

### Repository Addition
Add `existsByEventId(eventId: string, triggerType: string): Promise<boolean>` to `NotificationRepository` — queries `metadata->>'event_id'` and `metadata->>'trigger_type'`. This keeps the dedup logic in the data layer.

## Testing Strategy

### API Tests: 12 tests (vitest)
```
describe("Notification Triggers")
  describe("notify-batch-complete")
    ✓ creates notification for batch owner with success/failure summary
    ✓ skips duplicate notification when event_id already processed (idempotency)

  describe("notify-review-request")
    ✓ creates notifications for all assigned reviewers (bulk)
    ✓ includes question title in notification body

  describe("notify-review-decision")
    ✓ notifies question generator of approval decision
    ✓ notifies question generator of rejection with comment

  describe("notify-gap-scan")
    ✓ notifies course owner when gaps detected
    ✓ includes gap count and critical gap count in body

  describe("notify-kaizen")
    ✓ notifies institutional admins of drift detection
    ✓ notifies institutional admins when critical lint findings > 0
    ✓ does NOT notify when kaizen lint has 0 critical findings

  describe("TriggerResolverService")
    ✓ resolves correct recipient user IDs for each event type
```

**Mock strategy:**
- `vi.hoisted()` for mock variables (inngest step runner, NotificationService, repository)
- Mock Inngest `step.run()` to execute callbacks immediately
- Mock `NotificationRepository.existsByEventId()` for dedup tests
- Mock `NotificationService.create()` / `createBatch()` to verify payloads

### E2E: Not required
Backend-only Inngest functions — no user-facing UI.

## Figma Make

- [x] Code directly (no frontend components)

## Risks / Edge Cases

1. **`inngest` not installed** — Must `pnpm --filter server add inngest` first. Brief claims "already installed" but it's not in `package.json`.
2. **Institutional admin resolution** — kaizen events need to query profiles by `institution_id` + role. Must verify `profiles` table has `role` and `institution_id` columns (brief may use wrong names).
3. **Barrel stripping** — PostToolUse eslint hook can strip "unused" exports from barrel files (recurrence: 5). Must re-verify barrels after edits.
4. **Inngest serve route** — Adding to `index.ts` requires careful edit to avoid breaking existing route registrations. Import + usage in same edit.
5. **Notification metadata JSONB filtering** — Supabase `metadata->>'event_id'` filter must work with existing JSONB column. No index exists — acceptable for dedup (low volume per event).
6. **Event source stories not yet built** — The services that emit these events (batch, review, gap scan, kaizen) may not exist yet. Triggers are safe to build first since they listen passively.

## Acceptance Criteria (verbatim from brief)

1. `batch.complete` event triggers notification to batch owner with success/failure summary
2. `review.request` event triggers notifications to all assigned reviewers
3. `review.decision` event triggers notification to question generator with decision and comment
4. `gap.scan.complete` event triggers notification to course owner with gap count
5. `kaizen.drift.detected` triggers notification to institutional admins with severity
6. `kaizen.lint.complete` triggers notification to institutional admins only if `critical_findings > 0`
7. Each trigger function is idempotent: replaying an event with the same `event_id` does not create duplicate notifications
8. TriggerResolverService correctly maps each event type to target user(s)
9. Custom error class `NotificationTriggerError` used for all trigger failures
10. All 12 API tests pass
11. TypeScript strict mode, named exports only
