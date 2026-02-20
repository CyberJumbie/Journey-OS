# STORY-F-75: Exam Lifecycle Management

**Epic:** E-27 (Exam Assignment & Export)
**Feature:** F-12
**Sprint:** 30
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-27-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to manage exam status transitions with an audit trail so that I can track the full lifecycle of each exam from creation to archival.

## Acceptance Criteria
- [ ] Status machine: `draft` -> `building` -> `ready` -> `active` -> `closed` -> `archived`
- [ ] Valid transitions enforced (e.g., cannot go from `draft` directly to `closed`)
- [ ] Each transition records: user_id, timestamp, previous status, new status, reason (optional)
- [ ] Audit trail viewable per exam (timeline view)
- [ ] Auto-transition: `ready` -> `active` at scheduled start time (Inngest cron job)
- [ ] Auto-transition: `active` -> `closed` at scheduled end time
- [ ] Manual override: admin can force transition with reason
- [ ] Status badge displayed on exam cards and detail pages (reusable atom)
- [ ] Notification stub on status change (creates notification for exam creator)
- [ ] Custom error class: `InvalidTransitionError`
- [ ] 10-14 API tests: all valid transitions, invalid transitions, audit trail, auto-transition, manual override, notification creation

## Reference Screens
No dedicated screen. Status badge and audit timeline are components used across exam pages.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | `apps/web/src/components/exam/exam-status-badge.tsx` | Atom component in `apps/web`; color-coded badge per status using design tokens (draft=muted, building=blue, ready=green, active=green-bright, closed=amber, archived=gray) |
| N/A | `apps/web/src/components/exam/audit-trail-timeline.tsx` | Vertical timeline molecule showing status transitions with timestamps, actors, and reasons |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/lifecycle.types.ts` |
| Model | apps/server | `src/models/exam/exam-status-machine.ts` |
| Repository | apps/server | `src/repositories/exam/exam-audit.repository.ts` |
| Service | apps/server | `src/services/exam/exam-lifecycle.service.ts` |
| Controller | apps/server | `src/controllers/exam/exam-lifecycle.controller.ts` |
| Routes | apps/server | `src/routes/exam/exam-lifecycle.routes.ts` |
| Job | apps/server | `src/jobs/exam-status-transition.job.ts` |
| Components | apps/web | `src/components/exam/exam-status-badge.tsx`, `src/components/exam/audit-trail-timeline.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/exam-lifecycle.service.test.ts`, `src/models/exam/__tests__/exam-status-machine.test.ts` |

## Database Schema
Uses existing `exams.status` column. New table for exam-specific audit trail:

```sql
CREATE TABLE exam_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason text,
  triggered_by uuid REFERENCES profiles(id),
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'auto', 'admin_override')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_transitions_exam ON exam_status_transitions(exam_id);
CREATE INDEX idx_exam_transitions_created ON exam_status_transitions(created_at);
```

The existing `exams.status` CHECK constraint already has: `draft`, `building`, `ready`, `active`, `closed`, `archived`.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/exams/:id/status` | Transition exam status (body: `{ status, reason }`) |
| GET | `/api/exams/:id/audit-trail` | Get status transition history |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-73 (assignment creates initial lifecycle entry)
- **Cross-lane:** Auto-transitions use Inngest scheduled jobs

## Testing Requirements
- 10-14 API tests: draft->building transition, building->ready transition, ready->active transition, active->closed transition, closed->archived transition, invalid transition (draft->closed) returns 409, invalid transition (archived->active) returns 409, audit trail records all transitions, auto-transition at scheduled time, admin override with reason, notification created on status change, trigger_type correctly set (manual vs auto vs admin_override), reason is optional for normal transitions but required for admin_override
- 0 E2E tests

## Implementation Notes
- State machine pattern: explicit transition map with guard functions for valid transitions.
  ```typescript
  const VALID_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
    draft: ['building'],
    building: ['ready', 'draft'],     // can go back to draft
    ready: ['active', 'building'],     // can go back to building
    active: ['closed'],
    closed: ['archived'],
    archived: [],                      // terminal state
  };
  ```
- Admin override bypasses the transition map but still records the transition with `trigger_type = 'admin_override'` and requires a `reason`.
- Inngest cron job: runs every minute, queries `exam_assignments` for:
  1. `available_from <= now() AND exams.status = 'ready'` -> transition to `active`
  2. `available_until <= now() AND exams.status = 'active'` -> transition to `closed`
- Audit trail stored in `exam_status_transitions` table (append-only). The existing `audit_log` table is too generic; a dedicated table allows efficient per-exam queries.
- Status badge is a reusable atom component. Color mapping:
  - `draft`: `bg-muted/10 text-muted` (gray)
  - `building`: `bg-blue-mid/10 text-blue-mid`
  - `ready`: `bg-green/10 text-green`
  - `active`: `bg-green-dark/10 text-green-dark`
  - `closed`: `bg-amber/10 text-amber`
  - `archived`: `bg-muted/10 text-muted`
- Notification on status change: insert into `notifications` table with type `'system'`, action_url pointing to the exam, for the exam creator.
- Use `#private` fields in `ExamStatusMachine` model class.
- DualWriteService: update Neo4j Exam node `status` property on each transition.
