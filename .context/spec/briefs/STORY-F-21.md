# STORY-F-21: Role-Based Dashboard Variants

**Epic:** E-32 (Faculty Dashboard)
**Feature:** F-15
**Sprint:** 8
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-32-4

---

## User Story
As a **Faculty member, Course Director, or Institutional Admin**, I need the dashboard to show role-appropriate content so that each persona sees the metrics and actions most relevant to their responsibilities.

## Acceptance Criteria
- [ ] Dashboard layout composed of: KPI Strip + Activity Feed + Course Cards (from STORY-F-6/7/12)
- [ ] Faculty variant: personal KPIs, own activity, assigned courses
- [ ] Course Director variant: program-level KPIs, program activity, all program courses, faculty performance summary
- [ ] Institutional Admin variant: institution-level KPIs, institution activity, all courses, coverage overview link
- [ ] Role detection from auth context (`useAuth` hook), no role prop drilling
- [ ] Conditional sections: Course Director sees "Faculty Performance" table; Admin sees "Coverage Summary" widget
- [ ] FacultyDashboardPage template composes all sections with correct variant
- [ ] 8-10 API tests: role detection, variant rendering, conditional sections, KPI scoping per role
- [ ] Named exports only, TypeScript strict, design tokens only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production. Must match canonical `journey-os-dashboard.jsx`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/dashboard/Dashboard.tsx` | `apps/web/src/app/(protected)/dashboard/page.tsx` | Role-routing entry point. Detects role from auth context and renders appropriate variant. |
| `.context/source/05-reference/app/app/pages/dashboard/FacultyDashboard.tsx` | `apps/web/src/components/dashboard/faculty-dashboard-page.tsx` | Faculty template composing KPI strip + activity feed + course cards. |
| `.context/source/05-reference/app/app/pages/dashboard/StudentDashboard.tsx` | (deferred to student lane) | Student variant -- not implemented in this story. |
| `.context/source/05-reference/app/app/pages/institution/InstitutionalAdminDashboard.tsx` | `apps/web/src/components/dashboard/admin-dashboard-page.tsx` | Admin variant reference for conditional sections. |
| `.context/source/05-reference/screens/journey-os-dashboard.jsx` | (canonical visual authority) | Match layout, spacing, and visual treatment from canonical dashboard. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/dashboard/dashboard.types.ts` |
| Molecules | packages/ui | `src/molecules/faculty-performance-table.tsx`, `src/molecules/coverage-summary-widget.tsx` |
| Templates | apps/web | `src/components/dashboard/faculty-dashboard-page.tsx`, `src/components/dashboard/admin-dashboard-page.tsx` |
| Pages | apps/web | `src/app/(protected)/dashboard/page.tsx` |
| Hooks | apps/web | `src/hooks/use-dashboard-variant.ts` |
| Tests | apps/web | `src/components/dashboard/__tests__/faculty-dashboard-page.test.tsx`, `src/hooks/__tests__/use-dashboard-variant.test.ts` |

## Database Schema
No new tables. KPI and activity data scoped by role via existing endpoints with `scope` parameter.

## API Endpoints
Reuses existing endpoints from STORY-F-6/7/12 with `scope` parameter:
- `GET /api/v1/dashboard/kpis?scope=personal|program|institution`
- `GET /api/v1/activity?scope=personal|program|institution`
- `GET /api/v1/dashboard/courses?scope=personal|program|institution`

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-6 (Activity Feed), STORY-F-7 (KPI Strip), STORY-F-12 (Course Cards), STORY-U-3 (auth/RBAC)
- **Cross-lane:** STORY-U-3 (Sprint 3 auth)

## Testing Requirements
### Component Tests (8-10)
1. Faculty role renders personal-scoped dashboard
2. Course Director role renders program-scoped dashboard
3. Admin role renders institution-scoped dashboard
4. useDashboardVariant hook returns correct variant for faculty
5. useDashboardVariant hook returns correct variant for course_director
6. useDashboardVariant hook returns correct variant for institutional_admin
7. Faculty Performance table visible only for Course Director
8. Coverage Summary widget visible only for Admin
9. Dashboard page renders without role prop drilling
10. KPI scope parameter matches detected role

## Implementation Notes
- Role hierarchy for dashboard scoping: `institutional_admin` > `course_director` > `faculty`.
- `useDashboardVariant` hook returns `{ variant, scope }` based on user's highest role.
- Faculty Performance table (Course Director only): rows = faculty members, columns = questions generated, approval rate, active courses.
- Coverage Summary widget (Admin only): mini heatmap thumbnail with link to full `/coverage` page.
- All KPI and activity API calls include `scope` parameter: `personal`, `program`, or `institution`.
- Route: `/dashboard` -- same route for all roles, content varies by auth context.
- When testing components that import from `@journey-os/ui`, mock the entire package.
- Use `afterEach(() => cleanup())` in component test files.
