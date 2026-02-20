# STORY-ST-9: Comparative Percentile

**Epic:** E-43 (Student Progress Analytics)
**Feature:** F-20
**Sprint:** 28
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-43-3

---

## User Story
As a **Student (Marcus Williams)**, I need to see how my performance compares to my cohort (anonymized) so that I can understand my relative standing and adjust my study strategy.

## Acceptance Criteria
- [ ] Opt-in toggle for comparative analytics (default: off)
- [ ] Percentile rank displayed per USMLE system (e.g., "72nd percentile")
- [ ] Bell curve visualization showing student's position in cohort distribution
- [ ] Overall percentile rank across all systems
- [ ] Anonymized: no individual student data exposed, only aggregate statistics
- [ ] Minimum cohort size of 10 before percentiles are shown (privacy threshold)
- [ ] Privacy notice explaining data usage before opt-in
- [ ] Opt-in preference stored in Supabase `profiles` or `user_preferences` table
- [ ] Service computes percentiles from anonymized aggregate queries
- [ ] Loading state and empty state (insufficient cohort data)
- [ ] Renders within the analytics page (STORY-ST-8)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentAnalytics.tsx` (USMLE Systems tab) | `apps/web/src/components/student/comparative-percentile.tsx` | Add percentile overlay to the USMLE Systems section. Add bell curve chart and opt-in toggle. Privacy notice as a dialog. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/analytics.types.ts` (extend with percentile types) |
| Service | apps/server | `src/modules/student/services/comparative-percentile.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/student-analytics.controller.ts` (extend) |
| Organism | apps/web | `src/components/student/comparative-percentile.tsx` |
| Molecule | apps/web | `src/components/student/percentile-bell-curve.tsx` |
| Molecule | apps/web | `src/components/student/opt-in-toggle.tsx` |
| Molecule | apps/web | `src/components/student/privacy-notice-dialog.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/comparative-percentile.service.test.ts` |
| API Tests | apps/server | `src/modules/student/__tests__/comparative-percentile.privacy.test.ts` |

## Database Schema
**Supabase:** Uses existing `student_mastery` table for aggregate queries.

```sql
-- Add opt-in preference to profiles or user_preferences
-- (verify actual table name with list_tables before writing DDL)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  comparative_analytics_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
```

**Percentile computation query:**
```sql
SELECT
  PERCENT_RANK() OVER (ORDER BY avg_mastery) AS percentile
FROM (
  SELECT student_id, AVG(mastery_level) as avg_mastery
  FROM student_mastery
  WHERE concept_id IN (SELECT id FROM concepts WHERE usmle_system = $1)
  GROUP BY student_id
) sub
WHERE student_id = $2;
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/analytics/percentile` | Student | Percentile ranks per system and overall |
| PUT | `/api/v1/student/preferences/comparative` | Student | Update opt-in preference |

**Response shape (GET /percentile):**
```typescript
{
  opted_in: boolean;
  overall_percentile: number | null;  // null if not opted in or insufficient cohort
  by_system: Array<{
    system: string;
    percentile: number;
    cohort_size: number;
  }>;
  cohort_distribution: {
    mean: number;
    std_dev: number;
    student_position: number;
  } | null;
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-2 (dashboard exists), STORY-ST-8 (analytics page exists)
- **Cross-epic:** None

## Testing Requirements
- **API Tests (70%):** Percentile returns null when not opted in. Percentile returns null when cohort < 10 students. Correct percentile computation with known data (e.g., student at 75th percentile of 20-student cohort). Per-system percentile only includes students in same institution. Opt-in toggle persists to database. Aggregate queries never expose individual student scores.
- **Privacy tests:** Verify no individual mastery values appear in API response. Verify cohort_size >= 10 enforced. Verify RLS prevents cross-institution data leakage.
- **E2E (0%):** No critical journey.

## Implementation Notes
- Privacy is critical: use only aggregate SQL functions (`PERCENT_RANK`, `AVG`, `STDDEV`), never return individual student rows.
- Minimum cohort size (10) prevents de-anonymization in small classes. If cohort < 10, return null with explanation message.
- Bell curve visualization uses a normal distribution curve (Recharts AreaChart) with the student's position marked.
- SVG charting props use hex with `/* token: --color-name */` comment.
- Opt-in preference uses `profiles` table column. Verify actual table name with `list_tables` MCP call before DDL.
- Institution scoping: percentiles computed only against students in the same `institution_id`.
