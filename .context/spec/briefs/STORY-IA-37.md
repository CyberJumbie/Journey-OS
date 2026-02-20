# STORY-IA-37: Lint Results UI

**Epic:** E-37 (KaizenML Linting & Golden Dataset)
**Feature:** F-17
**Sprint:** 15
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-37-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a lint results page showing errors with severity, affected nodes, and suggested fixes so that I can triage and resolve data quality issues efficiently.

## Acceptance Criteria
- [ ] Lint report list: paginated table of past lint runs with date, total findings, severity breakdown
- [ ] Report detail view: grouped findings by rule with severity badges
- [ ] Each finding shows: rule name, severity, affected node(s) with links, message, suggested fix
- [ ] Filter by: severity level, rule category, date range
- [ ] Sort by: severity (default), date, affected node count
- [ ] Aggregate stats: total critical/warning/info counts, trend sparkline
- [ ] Quick action: "Mark as resolved" to dismiss a finding
- [ ] Export lint report as CSV
- [ ] 8-12 API tests: report list, report detail, filtering, resolution marking, export

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/settings/SystemConfigurationDashboard.tsx` (results section) | `apps/web/src/app/(protected)/admin/kaizen/page.tsx` | Prototype shows system health metrics. Production replaces with lint report list and finding cards. Extract system metric/service status patterns for lint finding severity display. Remove `C` color constants and font refs. Remove `useBreakpoint`, `useNavigate`, `useLocation`. Convert `export default` (required for page.tsx). Use design tokens for severity badges: critical (red), warning (amber), info (blue). Add recharts sparkline for trend. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/kaizen/lint-ui.types.ts` |
| Controller | apps/server | `src/controllers/kaizen/lint-report.controller.ts` |
| Route | apps/server | `src/routes/kaizen/lint-report.routes.ts` |
| View - List Page | apps/web | `src/app/(protected)/admin/kaizen/page.tsx` |
| View - Detail Page | apps/web | `src/app/(protected)/admin/kaizen/[reportId]/page.tsx` |
| View - Report Table | apps/web | `src/components/organisms/kaizen/lint-report-table.tsx` |
| View - Finding Card | apps/web | `src/components/molecules/finding-card.tsx` |
| View - Severity Badge | apps/web | `src/components/atoms/severity-badge.tsx` |
| Hook | apps/web | `src/hooks/use-lint-reports.ts` |
| Tests | apps/server | `src/controllers/kaizen/__tests__/lint-report.controller.test.ts` |

## Database Schema
Uses existing lint report tables from S-IA-37-1. No new tables.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/kaizen/reports` | institutional_admin | List lint reports (paginated) |
| GET | `/api/v1/kaizen/reports/:reportId` | institutional_admin | Get report detail with findings |
| PATCH | `/api/v1/kaizen/findings/:findingId/resolve` | institutional_admin | Mark finding as resolved |
| GET | `/api/v1/kaizen/reports/:reportId/export` | institutional_admin | Export report as CSV |

## Dependencies
- **Blocked by:** S-IA-37-1 (lint engine produces reports to display)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /kaizen/reports returns paginated list
2. GET /kaizen/reports/:reportId returns findings grouped by rule
3. Filter by severity level
4. Filter by rule category
5. Filter by date range
6. Sort by severity (default)
7. PATCH /findings/:id/resolve marks finding resolved
8. Resolved findings have resolver_id and timestamp
9. CSV export includes all finding fields
10. Unauthorized user gets 403

## Implementation Notes
- Severity badge colors: critical (red), warning (amber), info (blue) -- use design tokens
- Affected node links navigate to the relevant entity page (concept, SLO, question)
- Trend sparkline shows finding counts over last 30 days using recharts
- "Mark as resolved" adds `resolved_by` and `resolved_at` to finding record
- CSV export includes all finding fields for offline analysis
- Consider grouping findings by affected entity for node-centric triage view
- Report detail page uses Next.js dynamic segment `[reportId]`
