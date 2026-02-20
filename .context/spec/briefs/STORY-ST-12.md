# STORY-ST-12: Practice Launcher

**Epic:** E-41 (Adaptive Practice UI)
**Feature:** F-19
**Sprint:** 32
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-41-1

---

## User Story
As a **Student (Marcus Williams)**, I need to configure and launch an adaptive practice session by selecting concept scope and session parameters so that I can focus my practice on specific areas.

## Acceptance Criteria
- [ ] Practice launcher page at `/student/practice`
- [ ] Concept scope selection: by USMLE system, by course, or all concepts
- [ ] Multi-select: choose one or more systems/courses via checkbox list
- [ ] Session configuration: question count (10, 25, 50, custom via slider)
- [ ] Time mode toggle: timed or untimed
- [ ] Timed mode: configurable per-question timer (60s, 90s, 120s)
- [ ] Preview: estimated session duration based on question count and timer
- [ ] Mastery summary for selected scope (from BKT service)
- [ ] "Start Session" button creates session record and navigates to first question
- [ ] Session state stored server-side with session ID
- [ ] Validation: at least one concept scope selected, question count 1-100
- [ ] Three mode tabs: Practice Sets, Quick Practice, Custom Session
- [ ] Practice sets filtered by difficulty and topic

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentPractice.tsx` | `apps/web/src/app/(protected)/student/practice/page.tsx` | Convert React Router to Next.js. Replace inline styles with Tailwind + design tokens. Extract sidebar to shared layout. Replace `useNavigate` with `useRouter`. Convert mode tabs to production components. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/practice/session-config.types.ts` |
| Service | apps/server | `src/modules/practice/services/practice-session.service.ts` |
| Controller | apps/server | `src/modules/practice/controllers/practice-session.controller.ts` |
| Route | apps/server | `src/modules/practice/routes/practice-session.routes.ts` |
| View (Page) | apps/web | `src/app/(protected)/student/practice/page.tsx` |
| Template | apps/web | `src/components/templates/practice-launcher-template.tsx` |
| Organism | apps/web | `src/components/practice/scope-selector.tsx` |
| Organism | apps/web | `src/components/practice/session-config-form.tsx` |
| Organism | apps/web | `src/components/practice/practice-set-grid.tsx` |
| Molecule | apps/web | `src/components/practice/quick-practice-card.tsx` |
| Molecule | apps/web | `src/components/practice/practice-set-card.tsx` |
| API Tests | apps/server | `src/modules/practice/__tests__/practice-session.service.test.ts` |
| API Tests | apps/server | `src/modules/practice/__tests__/practice-session.controller.test.ts` |

## Database Schema
Uses `practice_sessions` table defined in STORY-ST-2. Session creation inserts a new row:

```sql
INSERT INTO practice_sessions (
  student_id, status, question_count, config, started_at
) VALUES (
  $1, 'in_progress', $2, $3::jsonb, NOW()
);
```

**Config JSONB shape:**
```json
{
  "scope": { "type": "systems", "ids": ["cardiovascular", "respiratory"] },
  "time_mode": "timed",
  "timer_seconds": 90,
  "mode": "adaptive"
}
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/practice/sessions` | Student | Create a new practice session |
| GET | `/api/v1/practice/sets` | Student | List available practice sets with filters |
| GET | `/api/v1/practice/scope-mastery` | Student | Mastery summary for selected scope |

**POST /sessions request:**
```typescript
{
  scope: { type: "systems" | "courses" | "all"; ids?: string[] };
  question_count: number;
  time_mode: "timed" | "untimed";
  timer_seconds?: number;  // required if timed
}
```

**POST /sessions response:**
```typescript
{
  session_id: string;
  first_item: { item_id: string; concept_id: string; expected_difficulty: number };
}
```

## Dependencies
- **Blocks:** STORY-ST-13, STORY-ST-14, STORY-ST-15
- **Blocked by:** STORY-ST-10 (adaptive item selection algorithm)
- **Cross-epic:** None

## Testing Requirements
- **API Tests (70%):** Session creation returns valid session_id and first item. Validation rejects empty scope. Validation rejects question_count outside 1-100. Timed mode requires timer_seconds. Session record persisted in Supabase. Controller extracts user.id from req and passes to service.
- **E2E (0%):** Covered by adaptive practice E2E in STORY-ST-13.

## Implementation Notes
- Session creation calls Python adaptive service to precompute initial item queue via internal HTTP.
- Scope selection tree mirrors USMLE taxonomy; use Neo4j graph for hierarchy retrieval.
- Every controller handler MUST extract `user.id` from `req` and pass to service (per CLAUDE.md).
- Practice set cards show: title, description, question count, estimated time, difficulty badge, best score.
- Quick practice mode pre-selects "include weak areas" and uses BKT service to identify focus areas.
- The `PracticeSet` interface from prototype maps to curated question collections, which may be stored as JSONB config or a separate `practice_sets` table.
