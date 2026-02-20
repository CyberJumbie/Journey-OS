# STORY-ST-11: Time-on-Task Analytics

**Epic:** E-43 (Student Progress Analytics)
**Feature:** F-20
**Sprint:** 28
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-43-2

---

## User Story
As a **Student (Marcus Williams)**, I need to see how much time I spend studying each concept area so that I can optimize my study schedule and allocate more time to weak areas.

## Acceptance Criteria
- [ ] Stacked bar chart showing time per USMLE system
- [ ] Time period selector: last 7 days, 30 days, 90 days
- [ ] Total study time displayed prominently
- [ ] Average session duration statistic
- [ ] Sessions per week statistic with target indicator (goal: >=3/week)
- [ ] Drill-down: click system bar to see time per concept within that system
- [ ] Efficiency metric: mastery gain per hour studied per system
- [ ] API aggregates time from `practice_sessions` and `student_responses` tables
- [ ] Loading state with skeleton
- [ ] Empty state when no sessions exist
- [ ] Renders within the analytics page (STORY-ST-8)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentAnalytics.tsx` (Time Analysis tab) | `apps/web/src/components/student/time-on-task-chart.tsx` | Extract the time distribution section. Replace static mock data with API-driven stacked bar chart. Add drill-down interaction. |
| `pages/student/StudentProgress.tsx` (Study Time stat) | `apps/web/src/components/student/study-stats-card.tsx` | Extract the study time KPI stat card. Add sessions/week with target line. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/analytics.types.ts` (extend with time-on-task types) |
| Service | apps/server | `src/modules/student/services/time-on-task.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/student-analytics.controller.ts` (extend) |
| Organism | apps/web | `src/components/student/time-on-task-chart.tsx` |
| Molecule | apps/web | `src/components/student/study-stats-card.tsx` |
| Molecule | apps/web | `src/components/student/system-time-breakdown.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/time-on-task.service.test.ts` |

## Database Schema
No additional tables. Aggregates from existing tables:

**Query pattern:**
```sql
-- Time per USMLE system
SELECT
  scb.usmle_system,
  SUM(ps.duration_seconds) as total_seconds,
  COUNT(DISTINCT ps.id) as session_count
FROM practice_sessions ps
JOIN session_concept_breakdown scb ON scb.session_id = ps.id
WHERE ps.student_id = $1
  AND ps.completed_at >= $2
  AND ps.status = 'completed'
GROUP BY scb.usmle_system
ORDER BY total_seconds DESC;

-- Efficiency: mastery gain per hour
SELECT
  scb.usmle_system,
  SUM(scb.mastery_delta) as total_mastery_gain,
  SUM(ps.duration_seconds) / 3600.0 as total_hours
FROM practice_sessions ps
JOIN session_concept_breakdown scb ON scb.session_id = ps.id
WHERE ps.student_id = $1 AND ps.completed_at >= $2
GROUP BY scb.usmle_system;
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/analytics/time` | Student | Time-on-task breakdown |

**Query parameters:**
- `range` (`7d`, `30d`, `90d`)

**Response shape:**
```typescript
{
  total_seconds: number;
  avg_session_seconds: number;
  sessions_this_week: number;
  sessions_target: number;  // 3
  by_system: Array<{
    system: string;
    total_seconds: number;
    session_count: number;
    efficiency: number;  // mastery gain per hour
  }>;
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-5 (session history data model exists)
- **Cross-epic:** None

## Testing Requirements
- **API Tests (70%):** Time aggregation returns correct totals for given date range. Per-system breakdown sums to total. Efficiency metric computes mastery_gain / hours correctly. Sessions-per-week count is accurate. Empty response for students with no sessions. Date range filtering excludes out-of-range sessions.
- **E2E (0%):** No critical journey.

## Implementation Notes
- Time tracking granularity: per-question timestamps stored in `student_responses.response_time_ms`. Session-level duration in `practice_sessions.duration_seconds`.
- Efficiency metric = `(total_mastery_delta / total_hours_spent)` per system; useful for study planning recommendations.
- Engagement target of >=3 sessions/week aligns with E-43 Definition of Done.
- Stacked bar chart uses Recharts `<BarChart>` with `<Bar stackId="time">`. Colors from design tokens.
- SVG props use hex with `/* token: --color-name */` comment per architecture rules.
- Drill-down: clicking a system bar section filters to show concept-level time within that system (sub-query).
