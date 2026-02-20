# STORY-IA-38 Brief: Gap Alert Service

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-38
old_id: S-IA-29-3
epic: E-29 (Gap-Driven Generation)
feature: F-13 (Coverage Gap Analysis)
sprint: 8
lane: institutional_admin
lane_priority: 2
within_lane_order: 38
size: S
depends_on:
  - STORY-IA-15 (institutional_admin) — Nightly coverage job emits gap events
blocks: []
personas_served: [institutional_admin, faculty]
```

---

## Section 1: Summary

**What to build:** A `GapAlertService` that listens for `coverage.gaps.detected` Inngest events emitted by the nightly coverage job, creates in-app notifications for institutional admins of the affected institution, and classifies alert severity based on gap count.

**Parent epic:** E-29 (Gap-Driven Generation) under F-13 (Coverage Gap Analysis). This story is the alert/notification layer that ensures admins are proactively informed when new curriculum coverage gaps are discovered.

**User story:** As an Institutional Admin, I need automatic alerts when new coverage gaps are detected so that I can proactively address curriculum blind spots before they accumulate.

**Personas:** Institutional Admin (receives alerts), Faculty (sees alerts on dashboard activity feed).

**Key constraints:**
- Inngest event handler, not an HTTP endpoint
- Alert severity: info (1-2 new gaps), warning (3-5), critical (6+)
- In-app notifications only (email deferred to E-34 notification system)
- Deduplication: no re-alerts for gaps already flagged and not yet resolved
- Notifications stored in Supabase `notifications` table
- Deep link to coverage heatmap drill-down page

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Gap alert types | `packages/types/src/coverage/alerts.types.ts` | 45m |
| 2 | Types barrel export | `packages/types/src/coverage/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | GapAlertService | `apps/server/src/services/coverage/gap-alert.service.ts` | 2h |
| 5 | NotificationRepository (create or update) | `apps/server/src/repositories/notification.repository.ts` | 1.5h |
| 6 | Inngest function registration | `apps/server/src/inngest/functions/gap-alert-handler.ts` | 1h |
| 7 | API tests | `apps/server/src/__tests__/coverage/gap-alert.test.ts` | 2h |

**Total estimate:** ~7.5h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/coverage/alerts.types.ts

/** Alert severity based on gap count */
export type GapAlertSeverity = "info" | "warning" | "critical";

/** Inngest event payload for coverage.gaps.detected */
export interface CoverageGapsDetectedEvent {
  readonly institution_id: string;
  readonly system: string;
  readonly discipline: string;
  readonly new_gap_count: number;
  readonly gap_details: readonly GapDetail[];
  readonly run_date: string;
}

/** Individual gap detail within an event */
export interface GapDetail {
  readonly topic: string;
  readonly sub_concepts: readonly string[];
  readonly current_coverage_pct: number;
}

/** Gap alert notification content */
export interface GapAlertContent {
  readonly system: string;
  readonly discipline: string;
  readonly new_gap_count: number;
  readonly severity: GapAlertSeverity;
  readonly link: string;
}

/** Notification record (stored in Supabase) */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly type: NotificationType;
  readonly severity: GapAlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown>;
  readonly link: string;
  readonly read: boolean;
  readonly created_at: string;
}

/** Supported notification types */
export type NotificationType =
  | "gap_scan"
  | "batch_complete"
  | "review_request"
  | "review_decision"
  | "lint_alert"
  | "drift_detected"
  | "system";
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_notifications_table
-- This may already exist from STORY-F-2. If so, this is a no-op confirmation.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN (
      'gap_scan', 'batch_complete', 'review_request',
      'review_decision', 'lint_alert', 'drift_detected', 'system'
    )),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    link TEXT NOT NULL DEFAULT '',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS: users can only read/modify their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role inserts notifications" ON notifications
    FOR INSERT WITH CHECK (true);
```

---

## Section 5: API Contract (complete request/response)

This story is primarily an Inngest event handler, not an HTTP endpoint. However, the notifications it creates are read via the notification endpoints built in STORY-F-2.

### Inngest Function: `gap-alert-handler`

**Event:** `coverage.gaps.detected`

**Event payload:**
```json
{
  "name": "coverage.gaps.detected",
  "data": {
    "institution_id": "inst-uuid-1",
    "system": "Cardiovascular",
    "discipline": "Pathology",
    "new_gap_count": 4,
    "gap_details": [
      {
        "topic": "Myocardial Infarction",
        "sub_concepts": ["Troponin elevation", "ST changes"],
        "current_coverage_pct": 12
      }
    ],
    "run_date": "2026-02-19T02:00:00Z"
  }
}
```

**Behavior:**
1. Classify severity: 1-2 gaps = info, 3-5 = warning, 6+ = critical
2. Check deduplication: query `notifications` for unread `gap_scan` alerts with same system+discipline for this institution
3. If duplicate exists, skip
4. Find all institutional_admin users for the institution
5. Create notification for each admin
6. Return success

**Notification created:**
```json
{
  "user_id": "admin-uuid-1",
  "type": "gap_scan",
  "severity": "warning",
  "title": "4 new coverage gaps in Cardiovascular / Pathology",
  "body": "The nightly coverage scan detected 4 new gaps in Cardiovascular / Pathology. Review and address these gaps to maintain curriculum completeness.",
  "metadata": {
    "system": "Cardiovascular",
    "discipline": "Pathology",
    "new_gap_count": 4,
    "run_date": "2026-02-19T02:00:00Z"
  },
  "link": "/coverage/Cardiovascular/Pathology",
  "read": false
}
```

---

## Section 6: Frontend Spec

No new frontend components in this story. The notifications created by GapAlertService are displayed via:
- Faculty dashboard activity feed (STORY-F-32 -- future)
- Admin dashboard notifications (STORY-IA-36 -- future)
- Notification bell/panel (STORY-F-2 -- notification model)

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/alerts.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Create or Edit |
| 3 | `packages/types/src/index.ts` | Types | Edit (add coverage export) |
| 4 | Supabase migration via MCP (notifications table if not exists) | Database | Apply |
| 5 | `apps/server/src/repositories/notification.repository.ts` | Repository | Create or Edit |
| 6 | `apps/server/src/services/coverage/gap-alert.service.ts` | Service | Create |
| 7 | `apps/server/src/inngest/functions/gap-alert-handler.ts` | Inngest | Create |
| 8 | `apps/server/src/inngest/index.ts` | Inngest | Edit (register function) |
| 9 | `apps/server/src/__tests__/coverage/gap-alert.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-15 | institutional_admin | **NOT YET** | Nightly coverage job that emits `coverage.gaps.detected` events |

### NPM Packages (already installed or needed)
- `inngest` -- Event-driven function framework
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/inngest/client.ts` -- Inngest client instance
- Notification repository (from STORY-F-2 or created fresh here)

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock gap event payload
export const MOCK_GAP_EVENT_SMALL = {
  name: "coverage.gaps.detected" as const,
  data: {
    institution_id: "inst-uuid-1",
    system: "Cardiovascular",
    discipline: "Pathology",
    new_gap_count: 2,
    gap_details: [
      { topic: "MI", sub_concepts: ["Troponin"], current_coverage_pct: 10 },
      { topic: "CHF", sub_concepts: ["BNP"], current_coverage_pct: 5 },
    ],
    run_date: "2026-02-19T02:00:00Z",
  },
};

export const MOCK_GAP_EVENT_MEDIUM = {
  ...MOCK_GAP_EVENT_SMALL,
  data: { ...MOCK_GAP_EVENT_SMALL.data, new_gap_count: 4 },
};

export const MOCK_GAP_EVENT_LARGE = {
  ...MOCK_GAP_EVENT_SMALL,
  data: { ...MOCK_GAP_EVENT_SMALL.data, new_gap_count: 8 },
};

// Mock admin users for notification targets
export const MOCK_INST_ADMINS = [
  { id: "admin-uuid-1", email: "admin1@med.edu", institution_id: "inst-uuid-1" },
  { id: "admin-uuid-2", email: "admin2@med.edu", institution_id: "inst-uuid-1" },
];

// Mock existing notification (for deduplication test)
export const MOCK_EXISTING_ALERT = {
  id: "notif-uuid-1",
  user_id: "admin-uuid-1",
  type: "gap_scan" as const,
  severity: "warning" as const,
  title: "4 new coverage gaps in Cardiovascular / Pathology",
  read: false,
  metadata: { system: "Cardiovascular", discipline: "Pathology" },
  created_at: "2026-02-18T02:00:00Z",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/coverage/gap-alert.test.ts`

```
describe("GapAlertService")
  describe("classifySeverity")
    + returns 'info' for 1-2 gaps
    + returns 'warning' for 3-5 gaps
    + returns 'critical' for 6+ gaps

  describe("handleGapEvent")
    + creates notifications for all institutional admins of affected institution
    + sets correct severity based on gap count
    + includes deep link to coverage drill-down page
    + includes system/discipline in notification title
    + stores gap metadata in notification metadata JSONB
    + skips creation when duplicate unread gap_scan alert exists for same system+discipline
    + creates alert when previous alert for same system+discipline was already read
    + handles zero admins gracefully (no error, no notifications)

describe("GapAlertHandler (Inngest)")
  + registers function with id 'gap-alert-handler'
  + calls GapAlertService.handleGapEvent with event data
```

**Total: ~10 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. This is a backend event handler with no direct UI. E2E coverage will be part of the notification panel integration tests.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | GapAlertService processes `coverage.gaps.detected` events | API test |
| 2 | Severity classified correctly: info (1-2), warning (3-5), critical (6+) | API test |
| 3 | Notifications created for all institutional admins of affected institution | API test |
| 4 | Alert includes system, discipline, gap count, and deep link | API test |
| 5 | Deduplication: no re-alert for same system+discipline if unread alert exists | API test |
| 6 | Deduplication resets when previous alert is marked as read | API test |
| 7 | Link format is `/coverage/{system}/{discipline}` | API test |
| 8 | All ~10 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Gap alert service listening to Inngest events | S-IA-29-3 SS User Story |
| Severity levels: info/warning/critical by gap count | S-IA-29-3 SS Acceptance Criteria |
| Alert deduplication | S-IA-29-3 SS Acceptance Criteria |
| Notifications table schema | S-IA-29-3 SS Notes |
| Deep link format | S-IA-29-3 SS Notes |
| Inngest event handler pattern | S-IA-29-3 SS Notes |
| In-app only for now, email via E-34 later | S-IA-29-3 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `notifications` table exists (from STORY-F-2 or created here), `user_profiles` table with role and institution_id
- **Inngest:** Dev server running (`inngest dev`) for local testing
- **Express:** Server running on port 3001
- **No Neo4j needed** for this story
- **No frontend needed** for this story

---

## Section 15: Figma Make Prototype

No UI in this story. Code directly. The notifications created here are consumed by notification UI components in STORY-F-2 and dashboard stories.
