# STORY-AD-9: Admin Cohort Analytics

**Epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Feature:** F-21
**Sprint:** 38
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-45-4

---

## User Story
As an **institutional admin**, I need aggregate risk metrics and trend monitoring across cohorts so that I can assess the effectiveness of academic support programs and allocate advising resources appropriately.

## Acceptance Criteria
- [ ] Admin analytics page at `/admin/cohort-analytics` with role guard (institutional_admin, superadmin)
- [ ] Cohort risk distribution: donut chart of risk levels per cohort
- [ ] Risk trend over time: line chart showing risk level changes across weeks (8-week window)
- [ ] Intervention effectiveness metrics: % of students who improved after intervention
- [ ] Cohort comparison: side-by-side risk profiles across different cohorts/programs
- [ ] Key metrics cards: total at-risk count, average resolution time, intervention rate, improvement rate
- [ ] Filter by cohort, time period, course, program
- [ ] Export data as CSV for institutional reporting
- [ ] Loading skeletons for all chart sections
- [ ] Empty state when no risk data exists
- [ ] Responsive layout: charts stack vertically on mobile

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/analytics/InstitutionalAnalytics.tsx` | `apps/web/src/app/(protected)/admin/cohort-analytics/page.tsx` | Use as primary layout template. Replace department performance cards with cohort risk distribution cards. Replace faculty leaderboard with intervention effectiveness rankings. Keep time period selector (week/month/year). Keep KPI card grid pattern (4 cards). Add CSV export button pattern from Department Performance header. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/cohort-analytics.types.ts`, `src/admin/index.ts` |
| Service | apps/server | `src/modules/admin/services/cohort-analytics.service.ts` |
| Controller | apps/server | `src/modules/admin/controllers/cohort-analytics.controller.ts` |
| Route | apps/server | `src/modules/admin/routes/cohort-analytics.routes.ts` |
| Page | apps/web | `src/app/(protected)/admin/cohort-analytics/page.tsx` |
| Template | apps/web | `src/components/templates/cohort-analytics-template.tsx` |
| Organism | apps/web | `src/components/admin/cohort-risk-distribution.tsx` |
| Organism | apps/web | `src/components/admin/risk-trend-chart.tsx` |
| Organism | apps/web | `src/components/admin/intervention-effectiveness.tsx` |
| Organism | apps/web | `src/components/admin/cohort-comparison-table.tsx` |
| Hook | apps/web | `src/hooks/use-cohort-analytics.ts` |
| API Tests | apps/server | `src/modules/admin/__tests__/cohort-analytics.service.test.ts` |

## Database Schema

**Supabase (read-only aggregation queries via RPC):**
```sql
-- Cohort analytics aggregation RPC
CREATE OR REPLACE FUNCTION get_cohort_analytics(
  p_institution_id UUID,
  p_time_start TIMESTAMPTZ,
  p_time_end TIMESTAMPTZ,
  p_cohort_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_at_risk', (
      SELECT count(DISTINCT student_id) FROM risk_flags
      WHERE institution_id = p_institution_id
      AND status != 'resolved'
      AND risk_level IN ('high', 'critical')
      AND (p_cohort_id IS NULL OR student_id IN (
        SELECT student_id FROM cohort_members WHERE cohort_id = p_cohort_id
      ))
    ),
    'avg_resolution_time_hours', (
      SELECT EXTRACT(EPOCH FROM avg(resolved_at - created_at)) / 3600
      FROM risk_flags
      WHERE institution_id = p_institution_id
      AND status = 'resolved'
      AND created_at BETWEEN p_time_start AND p_time_end
    ),
    'intervention_rate', (
      SELECT ROUND(
        count(DISTINCT i.student_id)::numeric /
        NULLIF(count(DISTINCT rf.student_id), 0) * 100, 1
      )
      FROM risk_flags rf
      LEFT JOIN interventions i ON rf.student_id = i.student_id
        AND i.created_at BETWEEN p_time_start AND p_time_end
      WHERE rf.institution_id = p_institution_id
      AND rf.created_at BETWEEN p_time_start AND p_time_end
    ),
    'improvement_rate', (
      SELECT ROUND(
        count(*) FILTER (WHERE outcome_status = 'improved')::numeric /
        NULLIF(count(*) FILTER (WHERE outcome_status != 'pending'), 0) * 100, 1
      )
      FROM interventions
      WHERE institution_id = p_institution_id
      AND created_at BETWEEN p_time_start AND p_time_end
    ),
    'risk_distribution', (
      SELECT json_agg(json_build_object('level', risk_level, 'count', cnt))
      FROM (
        SELECT risk_level, count(*) AS cnt
        FROM risk_flags
        WHERE institution_id = p_institution_id
        AND status != 'resolved'
        AND created_at BETWEEN p_time_start AND p_time_end
        GROUP BY risk_level
      ) sub
    ),
    'risk_trend', (
      SELECT json_agg(json_build_object(
        'week', week_start,
        'low', low_count,
        'moderate', moderate_count,
        'high', high_count,
        'critical', critical_count
      ) ORDER BY week_start)
      FROM (
        SELECT
          date_trunc('week', created_at) AS week_start,
          count(*) FILTER (WHERE risk_level = 'low') AS low_count,
          count(*) FILTER (WHERE risk_level = 'moderate') AS moderate_count,
          count(*) FILTER (WHERE risk_level = 'high') AS high_count,
          count(*) FILTER (WHERE risk_level = 'critical') AS critical_count
        FROM risk_flags
        WHERE institution_id = p_institution_id
        AND created_at BETWEEN p_time_start AND p_time_end
        GROUP BY date_trunc('week', created_at)
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CSV export function
CREATE OR REPLACE FUNCTION export_cohort_analytics_csv(
  p_institution_id UUID,
  p_time_start TIMESTAMPTZ,
  p_time_end TIMESTAMPTZ
)
RETURNS TABLE (
  student_name TEXT,
  risk_level VARCHAR,
  confidence NUMERIC,
  flag_status VARCHAR,
  intervention_count BIGINT,
  latest_outcome VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.full_name AS student_name,
    rf.risk_level,
    rf.confidence,
    rf.status AS flag_status,
    count(i.id) AS intervention_count,
    (SELECT outcome_status FROM interventions
     WHERE student_id = rf.student_id
     ORDER BY created_at DESC LIMIT 1) AS latest_outcome,
    rf.created_at
  FROM risk_flags rf
  JOIN profiles p ON rf.student_id = p.id
  LEFT JOIN interventions i ON rf.student_id = i.student_id
  WHERE rf.institution_id = p_institution_id
  AND rf.created_at BETWEEN p_time_start AND p_time_end
  GROUP BY p.full_name, rf.risk_level, rf.confidence, rf.status, rf.student_id, rf.created_at
  ORDER BY rf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**No new tables.** All data read from `risk_flags`, `interventions`, `profiles`, `cohort_members`.

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/admin/cohort-analytics` | Cohort analytics summary (KPIs, distributions, trends) | institutional_admin, superadmin |
| GET | `/api/admin/cohort-analytics/comparison` | Side-by-side cohort risk comparison | institutional_admin, superadmin |
| GET | `/api/admin/cohort-analytics/export` | CSV export of risk + intervention data | institutional_admin, superadmin |

## Dependencies
- **Blocked by:** STORY-AD-4 (risk flags data), STORY-AD-8 (intervention data for effectiveness metrics)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
- 5 API tests: cohort analytics RPC aggregation, time period filtering, cohort comparison query, CSV export streaming response, auth guard (admin/superadmin only)
- 0 E2E tests

## Implementation Notes
- Aggregate queries use Supabase RPC with `GROUP BY` and `date_trunc` for time bucketing. All complex queries encapsulated in Postgres functions, not client-side.
- Intervention effectiveness: compare students who received interventions vs those who didn't (within same risk level). Simple percentage, not causal inference.
- This view serves UF-34 (Admin Cohort Analytics Monitoring) from the user flows spec.
- CSV export uses streaming response (`Content-Type: text/csv`, `Content-Disposition: attachment`) for large datasets. Express streams rows from Supabase query.
- Charts use Recharts library (already used in the project). For Recharts SVG props (`stroke`, `fill`), use hex with `/* token: --color-name */` comment per architecture rules.
- Time period selector follows the InstitutionalAnalytics.tsx pattern: week/month/year toggle buttons.
- KPI card layout uses the 4-card grid pattern from InstitutionalAnalytics.tsx: icon + label + value with color-coded icon backgrounds.
- Page uses Next.js App Router `export default` for `page.tsx` (exception to named-exports-only rule).
- Web app imports use `@web/*` path alias.
- Use `Promise.all` for independent sub-queries within the analytics service to minimize latency.
