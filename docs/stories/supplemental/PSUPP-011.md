# PSUPP-011: Analytics Home (/analytics)
**Group:** Analytics Hub
**Component:** `Analytics` | `pages/analytics/Analytics.tsx`
**Priority:** P1 — navigation entry point; currently an orphan route
**Depends:** P3-007 (USMLE heatmap), P3-011 (dashboard data), P3-013 (course detail)
**Specialist:** @frontend-specialist

**As a** faculty member or institution admin
**I want** a single analytics home screen that links to all analytical views
**So that** I can navigate to any data view without having to remember individual routes

## Acceptance Criteria
- Route: `/analytics`
- Role-adaptive: shows different cards depending on role
- **Faculty view** — 4 cards:
  1. USMLE Coverage Heatmap → `/analytics/usmle-heatmap`
  2. Coverage Map (D3 graph) → `/analytics/coverage-map`
  3. Gap Priorities → `/analytics/gaps`
  4. Personal Performance → `/analytics/personal`
- **Institution admin / admin view** — 6 cards (adds):
  5. Institutional USMLE Coverage → `/institution/usmle-coverage`
  6. Faculty Coverage Comparison → `/institution/faculty-coverage`
- Each card: title, 1-line description, last-updated timestamp, key metric teaser
  - USMLE Heatmap card: "X of 112 cells covered"
  - Coverage Map card: "Y SubConcepts, Z% with ≥1 question"
  - Gap Priorities card: "Top gap: [System] [Discipline]"
- Endpoint: `GET /api/v1/analytics/summary` — returns teaser metrics for all cards
- No heavy data on this screen — teasers only (fast)

## Files to Create
- `frontend/src/app/(faculty)/analytics/page.tsx`
- `frontend/src/hooks/useAnalyticsSummary.ts`
- `backend/src/controllers/analytics-summary.controller.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/analytics/summary" -H "Authorization: Bearer $JWT"
# Expected: { heatmapCoveredCells: N, subConceptsTotal: M, topGap: {...} }
# Response time < 200ms (cached from existing materialized data)
```
