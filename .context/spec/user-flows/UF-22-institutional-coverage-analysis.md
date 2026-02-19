# UF-22: Institutional Coverage Analysis

**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** View cross-course USMLE coverage across the entire institution, identify systemic gaps, and prioritize which courses need content generation attention

## Preconditions
- Inst Admin is logged in at `/admin`
- Multiple courses with items exist across the institution
- USMLE framework seeded (F-08)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | See "Institutional Coverage: 68%" KPI | Click for details |
| 2 | `/admin/analytics` (Analytics) | See institutional coverage strip with trend line | Coverage improving/declining over time |
| 3 | `/admin/analytics` | See aggregate 16x7 heatmap: all courses combined | Institution-wide USMLE coverage |
| 4 | `/admin/analytics` | See course comparison table: per-course coverage % ranked | Identify lowest-coverage courses |
| 5 | `/admin/analytics` | Click on a course row | Drill into course-specific heatmap (same as UF-21) |
| 6 | `/admin/analytics` | See "Systemic Gaps" section: topics with <30% coverage across all courses | Institution-wide blind spots |
| 7 | `/admin/analytics` | Click "Email Faculty" next to a gap | Compose notification to relevant Course Directors about coverage gaps |

## Error Paths
- **No courses with items**: Step 2 — "No assessment data yet. Faculty need to generate questions."
- **Single course only**: Step 4 — Table shows one row; comparison not meaningful
- **Coverage data stale**: Step 2 — "Recalculating institution coverage..." with progress indicator

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/coverage/heatmap?scope=institution` | Step 3 — aggregate heatmap |
| GET | `/api/v1/analytics/coverage?group_by=course` | Step 4 — per-course comparison |
| GET | `/api/v1/courses/:id/coverage` | Step 5 — drill-down |
| GET | `/api/v1/coverage/gaps?scope=institution&threshold=30` | Step 6 — systemic gaps |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin/analytics`
2. Verify aggregate heatmap renders
3. Verify course comparison table shows all courses
4. Click a course to verify drill-down
Assertions:
- Heatmap aggregates across all institution courses
- Course comparison shows correct per-course coverage %
- Admin sees all courses (not RLS-restricted by assignment)

## Source References
- PRODUCT_BRIEF.md § Dr. Kenji Takahashi (institutional-level visibility)
- ROADMAP_v2_3.md § Sprint 8 (gap detection)
- PERSONA-MATRIX.md § Analytics (cohort analytics for Inst Admin)
- DESIGN_SPEC.md § 5.1 Group K (Analytics)
