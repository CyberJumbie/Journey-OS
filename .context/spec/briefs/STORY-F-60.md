# STORY-F-60: Automation Level Configuration

**Epic:** E-22 (Critic Agent & Review Router)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-22-3

---

## User Story
As an **Institutional Admin**, I need to configure the automation level for question review so that our institution can choose between full automation, checkpoint-based, or fully manual review workflows.

## Acceptance Criteria
- [ ] Three automation levels: `full_auto`, `checkpoints`, `manual`
- [ ] `full_auto`: critic scores drive auto-approve/reject, minimal human touch
- [ ] `checkpoints`: auto-reject works, but all approvals require human confirmation
- [ ] `manual`: all items route to human review regardless of critic scores
- [ ] Setting stored per institution in Supabase `institution_settings` table
- [ ] Settings page UI for institutional admin to toggle level
- [ ] Router service reads automation level before applying routing logic
- [ ] 5-8 API tests: each level behavior, default fallback, setting persistence
- [ ] TypeScript strict, named exports only

## Reference Screens
**None** -- backend-only story with a small admin settings UI addition.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/automation.types.ts` |
| Service | apps/server | `src/services/review/automation-config.service.ts` |
| Repository | apps/server | `src/repositories/institution-settings.repository.ts` (extend existing) |
| Controller | apps/server | `src/controllers/review/automation-config.controller.ts` |
| View | apps/web | `src/app/(protected)/admin/settings/automation/page.tsx` |
| Tests | apps/server | `src/services/review/__tests__/automation-config.test.ts` |

## Database Schema
No new tables. Adds an `automation_level` setting to the existing `institution_settings` table.

```sql
-- If institution_settings uses key-value pattern:
INSERT INTO institution_settings (institution_id, key, value)
VALUES (:institutionId, 'review_automation_level', '"checkpoints"')
ON CONFLICT (institution_id, key) DO UPDATE SET value = EXCLUDED.value;

-- If institution_settings uses columns, may need migration:
-- ALTER TABLE institution_settings ADD COLUMN review_automation_level varchar(20) DEFAULT 'checkpoints';
```

Before writing DDL, verify the actual `institution_settings` table structure via Supabase MCP `list_tables`.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/settings/automation` | InstitutionalAdmin+ | Get current automation level |
| PATCH | `/api/v1/settings/automation` | InstitutionalAdmin+ | Update automation level |

## Dependencies
- **Blocks:** None (router reads automation level reactively)
- **Blocked by:** STORY-F-56 (Router exists to respect automation level)
- **Cross-epic:** None

## Testing Requirements
### API Tests (5-8)
1. `full_auto` level allows auto-approve and auto-reject
2. `checkpoints` level allows auto-reject but forces review for approvals
3. `manual` level routes all items to review regardless of score
4. Default automation level is `checkpoints` for new institutions
5. PATCH updates automation level and persists to database
6. GET returns current automation level
7. Non-admin role returns 403
8. Changing level does not retroactively affect items already in queue

## Implementation Notes
- Default automation level for new institutions: `checkpoints` (safe middle ground).
- Only `institutional_admin` and `superadmin` roles can change automation level -- use RBAC `require(AuthRole.INSTITUTIONAL_ADMIN)`.
- Changing automation level does not retroactively affect items already in the queue.
- UI should show a clear explanation of each level with expected review volume impact.
- Consider audit log entry when automation level is changed.
- Review router service reads automation level from `AutomationConfigService` before applying routing logic.
- OOP with `#private` fields; constructor DI for settings repository.
- Use `@web/*` path alias for all web app imports.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
