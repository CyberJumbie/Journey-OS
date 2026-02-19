# Advisor Lane Backlog (P5)

**Stories:** 9 | **Sizes:** S:0 M:7 L:2
**Status:** All pending
**Cross-lane blockers:** ST-3, F-2

Student monitoring, intervention alerts, progress dashboards.

---

## Ordered Backlog

| # | New ID | Old ID | Epic | Size | Title | Blocked By |
|---|--------|--------|------|------|-------|------------|
| 1 | STORY-AD-1 | S-AD-44-1 | E-44 | L | GNN Risk Model | **[X]ST-3** |
| 2 | STORY-AD-2 | S-AD-44-3 | E-44 | M | Root-Cause Tracing | AD-1, **[X]ST-3** |
| 3 | STORY-AD-3 | S-AD-44-2 | E-44 | M | Trajectory Analysis Service | AD-1, **[X]ST-3** |
| 4 | STORY-AD-4 | S-AD-44-4 | E-44 | M | Risk Flag Generation | AD-1, AD-2, AD-3 |
| 5 | STORY-AD-5 | S-AD-45-1 | E-45 | L | Advisor Dashboard Page | AD-4 |
| 6 | STORY-AD-6 | S-AD-45-5 | E-45 | M | Student Alert View | AD-4, **[X]F-2** |
| 7 | STORY-AD-7 | S-AD-45-2 | E-45 | M | Intervention Recommendation Engine | AD-5, AD-2 |
| 8 | STORY-AD-8 | S-AD-45-3 | E-45 | M | Intervention Logging | AD-5, AD-7 |
| 9 | STORY-AD-9 | S-AD-45-4 | E-45 | M | Admin Cohort Analytics | AD-4, AD-8 |

**[X]** = cross-lane dependency

---

## Critical Path Notes

- Entire lane is gated by **STORY-ST-3 (BKT Mastery Estimation)** from the Student lane.
- **STORY-AD-6 (Student Alert View)** has an additional cross-lane dep on F-2 (Notification infrastructure).
- This is the last lane in the build order — no other lane depends on advisor stories.
