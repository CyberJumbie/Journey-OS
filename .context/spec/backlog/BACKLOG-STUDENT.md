# Student Lane Backlog (P4)

**Stories:** 15 | **Sizes:** S:0 M:11 L:4
**Status:** All pending
**Cross-lane blockers:** U-6, U-8, F-69

Learning path, assessments, adaptive practice, progress.

---

## Ordered Backlog

| # | New ID | Old ID | Epic | Size | Title | Blocked By |
|---|--------|--------|------|------|-------|------------|
| 1 | STORY-ST-1 | S-ST-40-1 | E-40 | M | FastAPI Service Scaffold | **[X]U-6** |
| 2 | STORY-ST-2 | S-ST-42-1 | E-42 | L | Student Dashboard Page | **[X]U-6, [X]U-8** |
| 3 | STORY-ST-3 | S-ST-40-3 | E-40 | L | BKT Mastery Estimation | ST-1 |
| 4 | STORY-ST-4 | S-ST-40-2 | E-40 | L | IRT 3PL Calibration | ST-1, **[X]F-69** |
| 5 | STORY-ST-5 | S-ST-42-4 | E-42 | M | Session History | ST-2 |
| 6 | STORY-ST-6 | S-ST-42-2 | E-42 | M | Mastery Breakdown Component | ST-2 |
| 7 | STORY-ST-7 | S-ST-42-3 | E-42 | M | Readiness Tracker | ST-2 |
| 8 | STORY-ST-8 | S-ST-43-1 | E-43 | M | Trend Charts | ST-2 |
| 9 | STORY-ST-9 | S-ST-43-3 | E-43 | M | Comparative Percentile | ST-2 |
| 10 | STORY-ST-10 | S-ST-40-4 | E-40 | M | Adaptive Item Selection | ST-1, ST-4, ST-3 |
| 11 | STORY-ST-11 | S-ST-43-2 | E-43 | M | Time-on-Task Analytics | ST-5 |
| 12 | STORY-ST-12 | S-ST-41-1 | E-41 | M | Practice Launcher | ST-10 |
| 13 | STORY-ST-13 | S-ST-41-2 | E-41 | L | Question View Component | ST-12 |
| 14 | STORY-ST-14 | S-ST-41-3 | E-41 | M | Feedback View | ST-13 |
| 15 | STORY-ST-15 | S-ST-41-4 | E-41 | M | Session Summary | ST-12, ST-13 |

**[X]** = cross-lane dependency

---

## Critical Path Notes

- **STORY-ST-3 (BKT Mastery)** is the sole Student-to-Advisor gate — all 9 advisor stories depend transitively on it.
- **STORY-ST-4 (IRT Calibration)** has a cross-lane dep on F-69 (Retired Exam Import) for calibration data.
- E-42 (Student Dashboard) can start in parallel with E-40 once U-6 and U-8 are done — uses mock mastery until ST-3 replaces it.
