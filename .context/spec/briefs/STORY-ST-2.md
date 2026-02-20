# STORY-ST-2: Student Dashboard Page

**Epic:** E-42 (Student Dashboard)
**Feature:** F-20
**Sprint:** 27
**Lane:** student (P4)
**Size:** L
**Old ID:** S-ST-42-1

---

## User Story
As a **Student (Marcus Williams)**, I need a comprehensive dashboard showing my mastery overview, Step 1 readiness score, and USMLE coverage heatmap so that I can track my overall preparation progress at a glance.

## Acceptance Criteria
- [ ] Dashboard page at `/student` with `student` role-based route guard
- [ ] Mastery overview card with aggregate mastery percentage displayed as a progress ring
- [ ] Step 1 readiness score (0-100) with pass probability estimate
- [ ] USMLE system coverage heatmap (organ systems x disciplines grid)
- [ ] Color-coded heatmap cells: green (>80%), yellow (50-80%), red (<50%) using design tokens
- [ ] KPI strip (inverted, navy-deep background): Questions Answered, Accuracy Rate, Current Streak, Study Time
- [ ] Quick-start "Start Practice" button navigating to practice launcher
- [ ] Responsive layout: 2-column on desktop, single-column on mobile
- [ ] Loading skeletons while data fetches
- [ ] Empty state for new students with no practice data
- [ ] Page title and breadcrumb navigation
- [ ] Refresh button to reload dashboard data
- [ ] Student sidebar navigation: Dashboard, My Courses, Practice, Progress, Resources
- [ ] Performance: initial render < 2s with mock data

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/dashboard/StudentDashboard.tsx` | `apps/web/src/app/(protected)/student/page.tsx` | Convert React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract sidebar to shared layout. Replace `useNavigate` with Next.js `Link`/`useRouter`. |
| `components/shared/progress-ring.tsx` | `packages/ui/src/atoms/progress-ring.tsx` | Already uses CSS variables. Move to UI package as reusable atom. |
| `components/shared/stat-card.tsx` | `packages/ui/src/molecules/stat-card.tsx` | Already uses design tokens. Move to UI package as molecule. |
| `components/shared/DashboardComponents.tsx` | `packages/ui/src/atoms/` (split) | Split monolithic file into individual atoms: `WovenField`, `AscSquares`, `Sparkline`, `ProgressBar`. Replace color constants with CSS custom properties. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/dashboard.types.ts`, `src/student/mastery.types.ts` |
| Model | apps/server | `src/modules/student/models/student-mastery.model.ts` |
| Repository | apps/server | `src/modules/student/repositories/student-mastery.repository.ts` |
| Service | apps/server | `src/modules/student/services/student-dashboard.service.ts` |
| Service | apps/server | `src/modules/student/services/mock-mastery.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/student-dashboard.controller.ts` |
| Route | apps/server | `src/modules/student/routes/student-dashboard.routes.ts` |
| Layout | apps/web | `src/app/(protected)/student/layout.tsx` |
| View (Page) | apps/web | `src/app/(protected)/student/page.tsx` |
| Template | apps/web | `src/components/templates/student-dashboard-template.tsx` |
| Organism | apps/web | `src/components/student/mastery-overview-card.tsx` |
| Organism | apps/web | `src/components/student/readiness-score-card.tsx` |
| Organism | apps/web | `src/components/student/coverage-heatmap.tsx` |
| Organism | apps/web | `src/components/student/kpi-strip.tsx` |
| Molecule | apps/web | `src/components/student/student-sidebar.tsx` |
| Atom | packages/ui | `src/atoms/progress-ring.tsx` |
| Atom | packages/ui | `src/molecules/stat-card.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/student-dashboard.service.test.ts` |
| API Tests | apps/server | `src/modules/student/__tests__/student-dashboard.controller.test.ts` |
| E2E | apps/web | `e2e/student-dashboard.spec.ts` |

## Database Schema
**Supabase tables (verify with `list_tables` before writing DDL):**

```sql
-- practice_sessions: stores completed practice session records
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  question_count INT NOT NULL,
  correct_count INT DEFAULT 0,
  duration_seconds INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- student_mastery: per-concept mastery state (mock initially, BKT later)
CREATE TABLE student_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  concept_id UUID NOT NULL,
  mastery_level FLOAT NOT NULL DEFAULT 0.0 CHECK (mastery_level BETWEEN 0.0 AND 1.0),
  questions_attempted INT DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, concept_id)
);
```

**Neo4j relationships:**
- `(Student)-[:HAS_MASTERY {level: float, updated_at: datetime}]->(Concept)`
- `(Student)-[:COMPLETED]->(PracticeSession)`

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/dashboard` | Student | Aggregate dashboard data (mastery, readiness, KPIs) |
| GET | `/api/v1/student/mastery/overview` | Student | System-level mastery overview |
| GET | `/api/v1/student/mastery/heatmap` | Student | USMLE systems x disciplines coverage matrix |

## Dependencies
- **Blocks:** STORY-ST-5, STORY-ST-6, STORY-ST-7, STORY-ST-8
- **Blocked by:** Auth guards (universal lane), student registration
- **Cross-epic:** Uses MOCK mastery data until STORY-ST-3 (BKT) is ready in Sprint 31

## Testing Requirements
- **API Tests (70%):** Dashboard service returns expected shape with mock data. Controller returns 200 for authenticated student, 401 for unauthenticated, 403 for non-student roles. Mastery overview aggregates correctly from mock data. Heatmap returns correct grid dimensions (12 systems x 7 disciplines).
- **E2E (30%):** Student dashboard loads with KPI strip, mastery ring, and heatmap visible. "Start Practice" button navigates to practice launcher. Responsive layout collapses to single column on mobile viewport.

## Implementation Notes
- Mock mastery service returns realistic but static data; will be swapped for BKT service in Sprint 31 via dependency injection.
- Heatmap uses Recharts for rendering. Charting SVG props (`stroke`, `fill`) use hex with `/* token: --color-name */` comments per architecture rules.
- USMLE systems: Cardiovascular, Respiratory, Renal, GI, Endocrine, Reproductive, Musculoskeletal, Neurology, Psychiatry, Hematology, Immunology, Multisystem/General.
- Dashboard template follows Atomic Design (template layer composes organisms).
- Student layout.tsx provides the sidebar shell; page.tsx is the dashboard content. Layout uses `export default` per Next.js App Router requirement.
- The canonical dashboard reference at `05-reference/screens/journey-os-dashboard.jsx` defines the layout pattern: inverted KPI strip, 2-column grid, sidebar with collapsible hover.
