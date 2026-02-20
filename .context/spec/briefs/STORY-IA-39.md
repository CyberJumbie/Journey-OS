# STORY-IA-39: Report Snapshot Service

**Epic:** E-31 (LCME Report Export)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-31-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to capture point-in-time compliance snapshots so that I can track compliance changes over time and prepare for LCME site visits.

## Acceptance Criteria
- [ ] Snapshot creation: captures current compliance state with timestamp
- [ ] Snapshot record: id, institution_id, created_at, created_by, compliance_data (JSON)
- [ ] Compliance data includes: all standards, elements, compliance scores, evidence chain summaries
- [ ] API endpoint: POST /api/compliance/snapshots (create), GET /api/compliance/snapshots (list)
- [ ] Snapshot detail: GET /api/compliance/snapshots/:id
- [ ] Snapshot immutable after creation (no edits)
- [ ] Storage in Supabase with JSONB column for compliance data
- [ ] Snapshot naming: auto-generated "YYYY-MM-DD HH:mm" with optional custom label
- [ ] Retention policy: keep snapshots for 7 years (LCME accreditation cycle)
- [ ] Maximum 100 snapshots per institution (soft limit with warning)
- [ ] Snapshot list UI component showing available snapshots

## Reference Screens
> No direct screen for the service. UI component feeds into STORY-IA-43 (PDF Export) and STORY-IA-44 (Comparison).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A (backend service) | N/A | Service only. UI consumers: snapshot-list.tsx and create-snapshot-button.tsx used within compliance pages. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/snapshot.types.ts` |
| Model | apps/server | `src/modules/compliance/models/compliance-snapshot.model.ts` |
| Repository | apps/server | `src/modules/compliance/repositories/snapshot.repository.ts` |
| Service | apps/server | `src/modules/compliance/services/snapshot.service.ts` |
| Controller | apps/server | `src/modules/compliance/controllers/snapshot.controller.ts` |
| Route | apps/server | `src/modules/compliance/routes/snapshot.routes.ts` |
| View - List | apps/web | `src/components/organisms/compliance/snapshot-list.tsx` |
| View - Button | apps/web | `src/components/molecules/create-snapshot-button.tsx` |
| Tests | apps/server | `src/modules/compliance/__tests__/snapshot.service.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/snapshot.repository.test.ts` |

## Database Schema

### Supabase -- `compliance_snapshots` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `label` | varchar(255) | NULL (optional custom label) |
| `compliance_data` | jsonb | NOT NULL |
| `overall_score` | numeric(5,2) | NOT NULL |
| `standards_count` | integer | NOT NULL |
| `elements_count` | integer | NOT NULL |
| `created_by` | uuid | NOT NULL, FK -> auth.users |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/compliance/snapshots` | institutional_admin | Create compliance snapshot |
| GET | `/api/v1/compliance/snapshots` | institutional_admin | List snapshots for institution |
| GET | `/api/v1/compliance/snapshots/:id` | institutional_admin | Get snapshot detail |

## Dependencies
- **Blocked by:** S-IA-30-1 (compliance computation data to snapshot)
- **Blocks:** S-IA-31-2 (PDF export needs snapshot), S-IA-31-3 (comparison needs snapshots)
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. POST /compliance/snapshots creates snapshot from current compliance data
2. Snapshot compliance_data contains all standards and elements
3. Snapshot is immutable (no PATCH endpoint)
4. GET /compliance/snapshots returns list ordered by date
5. GET /compliance/snapshots/:id returns full snapshot detail
6. Snapshots scoped to admin's institution
7. Custom label stored when provided
8. Warning returned when approaching 100 snapshot limit
9. Snapshot overall_score matches computed compliance
10. Unauthorized user gets 403

## Implementation Notes
- Snapshot captures the full compliance computation result as immutable JSON
- JSONB storage enables querying within snapshot data if needed
- 7-year retention aligns with LCME 8-year accreditation cycle plus buffer
- Consider compressing large snapshots (GZIP) for storage efficiency
- Private fields with `#` syntax, constructor DI per architecture rules
- Snapshot list component renders as a table with date, label, overall score, and action buttons
