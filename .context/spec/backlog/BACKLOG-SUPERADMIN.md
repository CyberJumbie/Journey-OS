# SuperAdmin Lane Backlog (P1)

**Stories:** 9 | **Sizes:** S:2 M:7 L:0
**Status:** All pending
**Cross-lane blockers:** STORY-U-6 (RBAC Middleware)

Platform-wide management across institutions.

---

## Ordered Backlog

| # | New ID | Old ID | Epic | Size | Title | Blocked By | Unblocks |
|---|--------|--------|------|------|-------|------------|----------|
| 1 | STORY-SA-1 | S-SA-04-1 | E-04 | M | Waitlist Application Form | **[X]U-6** | SA-3 |
| 2 | STORY-SA-2 | S-SA-07-1 | E-07 | M | Global User Directory | **[X]U-6** | SA-4 |
| 3 | STORY-SA-3 | S-SA-04-2 | E-04 | M | Application Review Queue | SA-1, **[X]U-6** | SA-5, SA-6 |
| 4 | STORY-SA-4 | S-SA-07-2 | E-07 | M | User Reassignment | SA-2 | — |
| 5 | STORY-SA-5 | S-SA-04-3 | E-04 | M | Approval Workflow | SA-3 | U-9, IA-1/4/5, SA-7/8 |
| 6 | STORY-SA-6 | S-SA-04-4 | E-04 | S | Rejection Workflow | SA-3 | — |
| 7 | STORY-SA-7 | S-SA-05-1 | E-05 | M | Institution List Dashboard | SA-5 | SA-8, SA-9 |
| 8 | STORY-SA-8 | S-SA-05-3 | E-05 | S | Institution Suspend/Reactivate | SA-7, SA-5 | — |
| 9 | STORY-SA-9 | S-SA-05-2 | E-05 | M | Institution Detail View | SA-7 | — |

**[X]** = cross-lane dependency

---

## Critical Path Notes

- **STORY-SA-5 (Approval Workflow)** is the second most-blocked cross-lane blocker — gates U-9, IA-1, IA-4, IA-5.
- All SA stories are gated by STORY-U-6 (RBAC Middleware).
