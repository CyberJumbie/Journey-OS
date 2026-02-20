# STORY-AD-5: Advisor Dashboard Page

**Epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Feature:** F-21
**Sprint:** 38
**Lane:** advisor (P5)
**Size:** L
**Old ID:** S-AD-45-1

---

## User Story
As an **academic advisor**, I need a dashboard showing my at-risk students with risk scores and concept-level diagnostics so that I can prioritize my interventions and understand each student's specific challenges.

## Acceptance Criteria
- [ ] Dashboard page at `/advisor` with role-based route guard (advisor role only)
- [ ] At-risk student list sorted by risk severity (critical first, then high, moderate)
- [ ] Per student card: name, risk level badge (color-coded), confidence score, top 3 struggling concepts
- [ ] Risk distribution chart: donut chart showing low/moderate/high/critical counts across cohort
- [ ] Filter: by risk level, by cohort, by course
- [ ] Search: by student name or ID
- [ ] Click student card to expand full concept diagnostic view
- [ ] Concept diagnostic: prerequisite chain visualization showing root causes (D3.js tree layout)
- [ ] Unacknowledged flag count badge in sidebar navigation
- [ ] Quick action buttons: acknowledge flag, schedule meeting, view intervention history
- [ ] Responsive layout with card grid (2 cols desktop, 1 col mobile)
- [ ] Loading skeletons for all data sections
- [ ] Empty state when no at-risk students found
- [ ] Real-time flag count via SSE (new flags during session update badge count)
- [ ] KPI strip: total at-risk count, new flags today, avg confidence, pending interventions

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/dashboard/Dashboard.tsx` | `apps/web/src/app/(protected)/advisor/page.tsx` | Use as layout template: sidebar + top bar + content grid. Replace faculty KPIs with advisor-specific metrics (at-risk count, flag count, intervention stats). Replace course cards with at-risk student cards. |
| `.context/source/05-reference/app/app/components/shared/stat-card.tsx` | `apps/web/src/components/advisor/advisor-stat-card.tsx` | Reuse StatCard molecule for KPI strip. Use inverted variant in welcome banner. Adapt labels: "At-Risk Students", "New Flags Today", "Pending Interventions", "Avg Confidence". |
| `.context/source/05-reference/app/app/components/shared/DashboardComponents.tsx` | Import shared components from `@journey-os/ui` | Reuse WovenField, AscSquares, Sparkline, ProgressBar from shared UI. MasteryCell can be adapted for concept mastery display in diagnostic view. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/advisor/dashboard.types.ts`, `src/advisor/index.ts` |
| Service | apps/server | `src/modules/advisor/services/advisor-dashboard.service.ts` |
| Controller | apps/server | `src/modules/advisor/controllers/advisor-dashboard.controller.ts` |
| Route | apps/server | `src/modules/advisor/routes/advisor-dashboard.routes.ts` |
| Page | apps/web | `src/app/(protected)/advisor/page.tsx` |
| Template | apps/web | `src/components/templates/advisor-dashboard-template.tsx` |
| Organism | apps/web | `src/components/advisor/at-risk-student-card.tsx` |
| Organism | apps/web | `src/components/advisor/risk-distribution-chart.tsx` |
| Organism | apps/web | `src/components/advisor/concept-diagnostic-view.tsx` |
| Organism | apps/web | `src/components/advisor/prerequisite-chain-viz.tsx` |
| Molecule | apps/web | `src/components/advisor/advisor-stat-card.tsx` |
| Hook | apps/web | `src/hooks/use-advisor-dashboard.ts` |
| Hook | apps/web | `src/hooks/use-sse-flag-count.ts` |
| API Tests | apps/server | `src/modules/advisor/__tests__/advisor-dashboard.service.test.ts` |
| API Tests | apps/server | `src/modules/advisor/__tests__/advisor-dashboard.controller.test.ts` |
| E2E | apps/web | `e2e/advisor-dashboard.spec.ts` |

## Database Schema

**Supabase (read-only queries joining existing tables):**
```sql
-- Dashboard aggregation RPC function
CREATE OR REPLACE FUNCTION get_advisor_dashboard(p_advisor_id UUID, p_institution_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_at_risk', (
      SELECT count(*) FROM risk_flags
      WHERE institution_id = p_institution_id AND status != 'resolved'
      AND risk_level IN ('high', 'critical')
    ),
    'new_flags_today', (
      SELECT count(*) FROM risk_flags
      WHERE institution_id = p_institution_id AND status = 'created'
      AND created_at >= CURRENT_DATE
    ),
    'pending_interventions', (
      SELECT count(*) FROM interventions
      WHERE advisor_id = p_advisor_id AND outcome_status = 'pending'
    ),
    'risk_distribution', (
      SELECT json_agg(json_build_object('level', risk_level, 'count', cnt))
      FROM (
        SELECT risk_level, count(*) AS cnt
        FROM risk_flags
        WHERE institution_id = p_institution_id AND status != 'resolved'
        GROUP BY risk_level
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**No new tables.** Dashboard reads from `risk_flags`, `risk_predictions`, `profiles`, `interventions`.

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/advisor/dashboard` | Dashboard summary (KPIs, risk distribution) | advisor |
| GET | `/api/advisor/students/at-risk` | Paginated at-risk student list with filters | advisor |
| GET | `/api/advisor/students/:studentId/diagnostic` | Full concept diagnostic for a student | advisor |
| GET | `/api/advisor/flags/count` | SSE endpoint for real-time flag count | advisor |

## Dependencies
- **Blocked by:** STORY-AD-4 (risk flags must exist to display)
- **Blocks:** STORY-AD-7 (recommendation engine integrated into dashboard), STORY-AD-8 (intervention logging modal in dashboard)
- **Cross-epic:** Reads risk flags from E-44, student profile data from E-07

## Testing Requirements
- 6 API tests: dashboard summary RPC, at-risk student list with pagination, filter by risk level, filter by course, student diagnostic endpoint, SSE flag count stream
- 1 E2E test: advisor logs in, sees at-risk student list, clicks student card, views concept diagnostic, acknowledges a flag

## Implementation Notes
- Prerequisite chain visualization uses D3.js force-directed graph or tree layout. Install `d3` as dependency in apps/web.
- SSE for real-time flag updates uses the project's SSE pattern (not Socket.io). Server sends `flag_count` events when new flags are generated.
- Advisor sees only students in their assigned institution (RBAC filter via `institution_id` from JWT).
- Dashboard data joins Supabase (risk_flags, profiles) with data from Python API (concept diagnostics, prerequisite chains). Express server orchestrates both sources.
- Use `Promise.all` for independent queries (KPIs + student list + risk distribution) to minimize latency.
- Risk level badge colors: critical = `--color-error` red, high = `--color-warning` orange, moderate = yellow, low = `--color-success` green. Use design tokens only.
- At-risk student card pattern follows the course card layout from Dashboard.tsx reference: left color indicator bar + student info + action buttons.
- Page uses Next.js App Router `export default` for `page.tsx` (exception to named-exports-only rule).
- Web app imports use `@web/*` path alias (not `@/*`).
