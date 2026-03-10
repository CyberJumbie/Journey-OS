# PSUPP-013: Personal Analytics Dashboard (/analytics/personal)
**Group:** Analytics Hub
**Component:** `PersonalDashboard` | `pages/analytics/PersonalDashboard.tsx`
**Priority:** P2
**Depends:** P1-024 (auth), generation history data
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** a personal performance view showing my generation productivity, quality trends, and approval patterns
**So that** I can improve my prompting and understand how my item quality has changed over time

## Acceptance Criteria
- Route: `/analytics/personal`
- Scoped strictly to the logged-in faculty member's own items
- Endpoint: `GET /api/v1/analytics/personal`
- Sections:
  1. **Productivity** — total items generated lifetime, this month, this week; generation streak (consecutive days)
  2. **Quality Trends** — Recharts LineChart: avg critic score per week (last 12 weeks)
  3. **Approval Funnel** — Recharts FunnelChart: generated → passed validation → auto_approved → faculty_reviewed → approved
  4. **Bloom Distribution** — Recharts RadarChart: how many items at each Bloom level
  5. **Best-Performing Questions** — top 5 by critic score with links to item detail
  6. **Generation by Course** — PieChart: items per course
- All data filtered to `created_by = req.user.id`

## Files to Create
- `frontend/src/app/(faculty)/analytics/personal/page.tsx`
- `frontend/src/hooks/usePersonalAnalytics.ts`
- `backend/src/controllers/personal-analytics.controller.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/analytics/personal" -H "Authorization: Bearer $JWT" | \
  jq '{totalItems, avgCriticScore, approvalRate}'
# Expected: all numeric values, scoped to logged-in user only
```
