# STORY-SA-9: Institution Detail View

**Epic:** E-05 (Institution Monitoring)
**Feature:** F-02
**Sprint:** 9
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-05-2

---

## User Story
As a **SuperAdmin**, I need an institution detail view showing usage metrics and user breakdown so that I can assess the health and engagement of each institution on the platform.

## Acceptance Criteria
- [ ] Institution detail page at `/admin/institutions/[id]` (SuperAdmin only)
- [ ] Header card: institution name, status badge (with icon), "Member since" date, contact email, website link, last active relative time
- [ ] Metrics grid (3-column on desktop, 2 on tablet, 1 on mobile): Total Users, Faculty, Students, Courses, Questions, Storage (GB)
- [ ] Charts row (2-column): User Growth line chart (last 7 days), Question Bank Growth bar chart (last 7 days)
- [ ] Activity timeline: last 10 significant events (user_added, course_created, question_generated, login, system) with icons, descriptions, actor names, relative timestamps
- [ ] Back navigation button to institution list (`/admin/institutions`)
- [ ] Loading spinner state, error state with "Back to Institutions" button, 404 state
- [ ] Action buttons for Suspend/Reactivate (triggers from STORY-SA-8)
- [ ] Data fetched from `GET /api/v1/admin/institutions/:id/detail`
- [ ] Charts use Recharts (lightweight, React-native) for line and bar charts
- [ ] 8-10 API tests

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/InstitutionDetailView.tsx` | `apps/web/src/app/(protected)/admin/institutions/[id]/page.tsx` | Replace inline styles with Tailwind + design tokens. Replace inline SVG charts with Recharts components. Extract header, metrics grid, charts, and timeline into separate organisms. Convert from React Router to Next.js (useParams -> params prop). Replace mock data with API fetch via custom hook. Extract activity event icons/colors to shared utility. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/institution-detail.types.ts` (exists) |
| Service | apps/server | `src/services/admin/institution-monitoring.service.ts` (update, add detail method) |
| Controller | apps/server | `src/controllers/admin/institution.controller.ts` (update, add detail endpoint) |
| Routes | apps/server | `src/routes/admin/institution.routes.ts` (update) |
| Organisms | apps/web | `src/components/admin/institution-detail-header.tsx`, `src/components/admin/institution-metrics-grid.tsx`, `src/components/admin/institution-charts.tsx`, `src/components/admin/institution-activity-timeline.tsx` |
| Molecules | apps/web | `src/components/admin/metric-card.tsx`, `src/components/admin/activity-event-row.tsx` |
| Page | apps/web | `src/app/(protected)/admin/institutions/[id]/page.tsx` |
| Hook | apps/web | `src/hooks/use-institution-detail.ts` |
| Tests | apps/server | `src/controllers/admin/__tests__/institution-detail.test.ts` |
| Tests | apps/web | `src/components/admin/__tests__/institution-detail-page.test.tsx` |

## Database Schema

### Supabase -- queries across existing tables
Aggregation queries for institution detail:

**User breakdown:**
```sql
SELECT role, COUNT(*) as count
FROM profiles
WHERE institution_id = $id
GROUP BY role
```

**Active users (last 30 days):**
```sql
SELECT COUNT(DISTINCT id)
FROM profiles
WHERE institution_id = $id
  AND last_login_at > now() - interval '30 days'
```

**Course count:**
```sql
SELECT COUNT(*)
FROM courses c
JOIN programs p ON c.program_id = p.id
WHERE p.institution_id = $id
```

**Question count (approximation):**
```sql
SELECT COUNT(*)
FROM questions q
JOIN courses c ON q.course_id = c.id
JOIN programs p ON c.program_id = p.id
WHERE p.institution_id = $id
```

**Storage usage:**
```sql
SELECT COUNT(*) as doc_count, COALESCE(SUM(file_size), 0) as total_bytes
FROM uploaded_documents ud
JOIN courses c ON ud.course_id = c.id
JOIN programs p ON c.program_id = p.id
WHERE p.institution_id = $id
```

**Activity timeline:**
```sql
SELECT *
FROM activity_events
WHERE institution_id = $id
ORDER BY created_at DESC
LIMIT 10
```

**Chart data (user growth, 7 days):**
```sql
SELECT date_trunc('day', created_at) as date, COUNT(*) as cumulative
FROM profiles
WHERE institution_id = $id
  AND created_at > now() - interval '7 days'
GROUP BY date
ORDER BY date ASC
```

### Neo4j -- read-only (optional, for graph-enriched metrics)
```
MATCH (i:Institution {id: $id})<-[:BELONGS_TO]-(p:Person)
RETURN count(p) as user_count
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/institutions/:id/detail` | SuperAdmin | Get institution detail with metrics |

### Response Shape
```json
{
  "data": {
    "institution": {
      "id": "uuid",
      "name": "string",
      "type": "md|do|combined",
      "status": "active|pending|suspended",
      "contact_email": "string",
      "website": "string|null",
      "created_at": "ISO8601",
      "last_activity": "ISO8601|null"
    },
    "metrics": {
      "total_users": 342,
      "faculty_count": 48,
      "student_count": 286,
      "admin_count": 8,
      "course_count": 28,
      "question_count": 1842,
      "storage_used_gb": 12.4,
      "active_users_30d": 198
    },
    "chart_data": [
      { "date": "Feb 14", "users": 312, "questions": 1620 }
    ],
    "activity_events": [
      {
        "id": "uuid",
        "type": "question_generated",
        "description": "Generated 24 questions for Pharmacology",
        "user_name": "Dr. Sarah Chen",
        "timestamp": "ISO8601"
      }
    ]
  }
}
```

## Dependencies
- **Blocked by:** STORY-SA-7 (Institution List Dashboard -- navigation source)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (10)
1. Detail endpoint returns correct institution data
2. Metrics aggregation returns accurate user counts by role
3. Active users count reflects 30-day window
4. Course count aggregates through programs join correctly
5. Chart data returns daily data points for last 7 days
6. Activity timeline returns last 10 events ordered by timestamp DESC
7. Invalid institution ID returns 404
8. Non-SuperAdmin receives 403 Forbidden
9. Storage usage calculation returns correct GB value
10. Institution with no activity returns empty chart_data and activity_events arrays

### Component Tests (4)
1. Header renders institution name, status badge, and metadata
2. Metrics grid renders all 6 metric cards with correct values
3. Activity timeline renders event rows with icons and relative times
4. Back button navigates to institution list

## Implementation Notes
- The prototype's `InstitutionDetailView.tsx` uses inline SVG for charts. Replace with Recharts `LineChart` and `BarChart` components.
- Recharts SVG props (`stroke`, `fill`) cannot use CSS custom properties -- use hex with `/* token: --color-name */` comment (per Architecture Rules).
- Multiple independent Supabase queries (metrics, chart data, activity events) should be wrapped in `Promise.all` -- never await sequentially.
- The prototype shows a comprehensive detail view. All sections (header, metrics, charts, timeline) should be separate organisms for maintainability.
- Activity event type icons/colors should be mapped via a shared utility function, not inline switch statements.
- The `useParams` hook from React Router must be replaced with Next.js App Router's `params` prop (or `useParams` from `next/navigation`).
- Route: `/admin/institutions/[id]` -- dynamic segment for institution UUID. Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"`.
- Storage is calculated in bytes from the database but displayed in GB in the UI (divide by 1024^3).
- The queries reference tables (`courses`, `programs`, `questions`, `activity_events`, `uploaded_documents`) that may not exist yet. Before writing DDL/queries, run `list_tables` via Supabase MCP to verify actual table/column names. Use stub data or graceful nulls for tables that don't exist yet.
- When querying through intermediate tables (courses -> programs -> institution), use Supabase `!inner` join syntax. See `docs/solutions/supabase-inner-join-filter-pattern.md`.
