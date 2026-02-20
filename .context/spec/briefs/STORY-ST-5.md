# STORY-ST-5: Session History

**Epic:** E-42 (Student Dashboard)
**Feature:** F-20
**Sprint:** 27
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-42-4

---

## User Story
As a **Student (Marcus Williams)**, I need to view my practice session history with date, duration, and score so that I can track my study habits and identify patterns.

## Acceptance Criteria
- [ ] Session history table with columns: date, duration, questions answered, score, concepts covered
- [ ] Sortable by date (default: newest first), duration, or score
- [ ] Pagination: 10 sessions per page
- [ ] Filter by date range (last 7 days, 30 days, all time)
- [ ] Filter by USMLE system
- [ ] Click session row to expand and show concept-level breakdown
- [ ] Empty state for students with no sessions
- [ ] Session data stored in Supabase with dual-write to Neo4j
- [ ] API endpoint returns paginated session history
- [ ] Loading skeleton for table rows
- [ ] Displays within the student dashboard page as a section

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/dashboard/StudentDashboard.tsx` (recent activity section) | `apps/web/src/components/student/session-history-table.tsx` | Extract the "Recent Sessions" list from StudentDashboard. Replace inline styles with Tailwind. Add pagination, sorting, and filtering. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/session.types.ts` |
| Model | apps/server | `src/modules/student/models/practice-session.model.ts` |
| Repository | apps/server | `src/modules/student/repositories/practice-session.repository.ts` |
| Service | apps/server | `src/modules/student/services/session-history.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/session-history.controller.ts` |
| Route | apps/server | `src/modules/student/routes/session-history.routes.ts` |
| Organism | apps/web | `src/components/student/session-history-table.tsx` |
| Molecule | apps/web | `src/components/student/session-detail-row.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/session-history.service.test.ts` |
| API Tests | apps/server | `src/modules/student/__tests__/session-history.controller.test.ts` |

## Database Schema
Uses `practice_sessions` table defined in STORY-ST-2. Additionally:

```sql
-- session_concept_breakdown: per-concept stats within a session
CREATE TABLE session_concept_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL,
  concept_name TEXT NOT NULL,
  usmle_system TEXT,
  questions_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  mastery_delta FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_concept_session ON session_concept_breakdown(session_id);
```

**Neo4j relationships:**
- `(Student)-[:COMPLETED {score: float, duration_s: int, completed_at: datetime}]->(PracticeSession)`
- `(PracticeSession)-[:COVERED]->(Concept)`

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/sessions` | Student | Paginated session history with filters |
| GET | `/api/v1/student/sessions/:sessionId` | Student | Single session detail with concept breakdown |

**Query parameters for GET /sessions:**
- `page` (default 1), `limit` (default 10)
- `sort` (default `started_at`), `order` (default `desc`)
- `date_range` (`7d`, `30d`, `all`)
- `usmle_system` (filter by system name)

## Dependencies
- **Blocks:** STORY-ST-11 (time-on-task needs session data model)
- **Blocked by:** STORY-ST-2 (dashboard page exists)
- **Cross-epic:** Session records created by adaptive practice (STORY-ST-12) in Sprint 32; mock data until then

## Testing Requirements
- **API Tests (70%):** Session history returns paginated results. Sorting by date/score/duration works correctly. Filters by date range and USMLE system return correct subsets. Session detail includes concept breakdown. Only returns sessions for the authenticated student (RLS). Empty response for students with no sessions.
- **E2E (0%):** Covered by dashboard E2E in STORY-ST-2.

## Implementation Notes
- DualWriteService: Supabase first (`practice_sessions` table) then Neo4j `(Student)-[:COMPLETED]->(PracticeSession)`.
- Apply all `.eq()` filters BEFORE `.order()` and `.range()` in Supabase queries (per CLAUDE.md).
- Table component should use a reusable DataTable pattern from packages/ui.
- Consider virtual scrolling if session count exceeds 100 rows.
- Session concept breakdown is denormalized for fast read; computed when session completes.
