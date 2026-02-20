# STORY-IA-15: Nightly Coverage Job

**Epic:** E-28 (Coverage Computation & Heatmap)
**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-28-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need coverage data to be automatically recalculated nightly so that the heatmap and gap analysis always reflect the latest question bank state without manual intervention.

## Acceptance Criteria
- [ ] Inngest function `coverage/nightly-recompute` scheduled via cron at 2:00 AM UTC
- [ ] Iterates over all active institutions, computes fresh coverage snapshot for each
- [ ] Compares new snapshot to previous: identifies new gaps and resolved gaps
- [ ] Emits `coverage.gaps.detected` event if new gaps found
- [ ] Stores new snapshot in Supabase `coverage_snapshots` table
- [ ] Job telemetry: duration, institutions processed, errors logged
- [ ] Retry logic: 3 retries with exponential backoff on transient Neo4j failures
- [ ] Keeps last 30 snapshots per institution for trend analysis; prunes older ones

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/jobs.types.ts` |
| Inngest | apps/server | `src/inngest/functions/nightly-coverage.fn.ts` |
| Service | apps/server | `src/services/coverage/nightly-coverage.service.ts` |
| Config | apps/server | `src/config/inngest.config.ts` (update) |
| Tests | apps/server | `src/services/coverage/__tests__/nightly-coverage.test.ts` |

## Database Schema

No new tables. Uses existing `coverage_snapshots` table from STORY-IA-3.

Snapshot pruning: `DELETE FROM coverage_snapshots WHERE institution_id = $id AND computed_at < (SELECT computed_at FROM coverage_snapshots WHERE institution_id = $id ORDER BY computed_at DESC LIMIT 1 OFFSET 30)`.

**No Neo4j schema changes.**

## API Endpoints

No new API endpoints. This is a scheduled job only.

## Dependencies
- **Blocked by:** STORY-IA-3 (Coverage Computation Service provides `computeForInstitution()`)
- **Blocks:** None (downstream gap alert service is a future story)
- **Cross-lane:** None

## Testing Requirements
### API Tests (5-8)
- Scheduled execution: Inngest function registered with correct cron schedule
- Snapshot creation: new snapshot stored for each active institution
- Gap detection: correctly identifies new gaps vs resolved gaps
- Retry on failure: transient Neo4j errors trigger retry with backoff
- Event emission: `coverage.gaps.detected` event emitted when new gaps found
- Snapshot pruning: keeps last 30, deletes older snapshots
- Telemetry: duration and institution count logged

## Implementation Notes
- Inngest cron syntax: `"0 2 * * *"` for daily at 2 AM UTC.
- Job reuses `CoverageComputationService.computeForInstitution(institutionId)` from STORY-IA-3.
- Gap detection: compare `previous_snapshot.matrix[system][discipline].gap_count` vs `new_snapshot.matrix[system][discipline].gap_count`.
- Event payload for `coverage.gaps.detected`: `{ institution_id, new_gaps: [{system, discipline, gap_count}], timestamp }`.
- Monitor via Inngest dashboard for job health.
- Service uses `readonly #coverageService` and `readonly #supabaseClient` with constructor DI.
