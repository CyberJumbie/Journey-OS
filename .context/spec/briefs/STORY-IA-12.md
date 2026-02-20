# STORY-IA-12: KaizenML Lint Rule Engine

**Epic:** E-37 (KaizenML Linting & Golden Dataset)
**Feature:** F-17 (Admin Dashboard & Data Integrity)
**Sprint:** 15
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-37-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a lint rule engine with 9 rules running on nightly Inngest schedules so that data quality issues in the knowledge graph and item bank are detected automatically.

## Acceptance Criteria
- [ ] 9 lint rules implemented: orphan concepts, dangling SLO links, embedding drift, stale items, tag inconsistency, duplicate framework mappings, missing provenance, score distribution skew, low-confidence tags
- [ ] Each rule returns `{ ruleId, severity, affectedNodes: [], message, suggestedFix }`
- [ ] Inngest cron function: nightly at 2:00 AM UTC (configurable per institution)
- [ ] Lint run creates a `lint_report` record with all findings
- [ ] Incremental linting: only check nodes modified since last run (delta mode)
- [ ] Full lint option: scan entire knowledge graph (manual trigger)
- [ ] Rule enable/disable per institution via institution settings
- [ ] Severity levels: `critical`, `warning`, `info`
- [ ] Custom error classes: `LintEngineError`, `LintRuleError`
- [ ] Parallel rule execution for performance (rules are independent)

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/settings/SystemConfigurationDashboard.tsx` | `apps/web/src/app/(protected)/admin/settings/lint-config/page.tsx` | Extract lint rule configuration section only. Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Build toggle list for enable/disable per rule. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/kaizen/lint.types.ts`, `src/kaizen/report.types.ts` |
| Model | apps/server | `src/models/lint-report.model.ts` |
| Repository | apps/server | `src/repositories/lint-report.repository.ts` |
| Rules | apps/server | `src/services/kaizen/rules/orphan-concepts.rule.ts`, `src/services/kaizen/rules/dangling-slo.rule.ts`, `src/services/kaizen/rules/embedding-drift.rule.ts`, `src/services/kaizen/rules/stale-items.rule.ts`, `src/services/kaizen/rules/tag-inconsistency.rule.ts`, `src/services/kaizen/rules/duplicate-mappings.rule.ts`, `src/services/kaizen/rules/missing-provenance.rule.ts`, `src/services/kaizen/rules/score-skew.rule.ts`, `src/services/kaizen/rules/low-confidence-tags.rule.ts` |
| Service | apps/server | `src/services/kaizen/lint-engine.service.ts`, `src/services/kaizen/lint-rule-registry.service.ts` |
| Inngest | apps/server | `src/inngest/functions/kaizen-lint.fn.ts` |
| Errors | apps/server | `src/errors/kaizen.errors.ts` |
| Controller | apps/server | `src/controllers/admin/lint.controller.ts` |
| Routes | apps/server | `src/routes/admin/lint.routes.ts` |
| Tests | apps/server | `src/services/kaizen/__tests__/lint-engine.test.ts`, `src/services/kaizen/__tests__/lint-rules.test.ts` |

## Database Schema

### Supabase -- `lint_reports` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions(id) |
| `mode` | varchar(20) | NOT NULL, CHECK IN ('delta', 'full') |
| `started_at` | timestamptz | NOT NULL |
| `completed_at` | timestamptz | NULL |
| `duration_ms` | integer | NULL |
| `findings` | jsonb | NOT NULL, DEFAULT '[]' |
| `critical_count` | integer | NOT NULL, DEFAULT 0 |
| `warning_count` | integer | NOT NULL, DEFAULT 0 |
| `info_count` | integer | NOT NULL, DEFAULT 0 |
| `status` | varchar(20) | NOT NULL, DEFAULT 'running', CHECK IN ('running', 'completed', 'failed') |

### Supabase -- `lint_rule_config` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions(id) |
| `rule_id` | varchar(50) | NOT NULL |
| `enabled` | boolean | NOT NULL, DEFAULT true |
| `threshold` | jsonb | NULL (rule-specific config) |

**No Neo4j schema changes** (reads only).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/lint/run` | InstitutionalAdmin+ | Trigger manual full lint run |
| GET | `/api/v1/admin/lint/reports` | InstitutionalAdmin+ | List lint reports |
| GET | `/api/v1/admin/lint/reports/:id` | InstitutionalAdmin+ | Get lint report detail |
| GET | `/api/v1/admin/lint/config` | InstitutionalAdmin+ | Get lint rule configuration |
| PUT | `/api/v1/admin/lint/config` | InstitutionalAdmin+ | Update lint rule enable/disable |

## Dependencies
- **Blocked by:** STORY-IA-5 (admin dashboard exists)
- **Blocks:** None (downstream KaizenML features in future sprints)
- **Cross-lane:** None

## Testing Requirements
### API Tests (15-20)
- Each of the 9 rules: correct detection of its target condition
- Severity classification: critical/warning/info assigned correctly
- Delta mode: only checks nodes modified since last run
- Full scan: checks entire knowledge graph
- Schedule config: Inngest cron triggers at correct time
- Rule enable/disable: disabled rules skipped during execution
- Report creation: lint_report record created with correct finding counts
- Parallel execution: rules execute concurrently
- Error handling: LintRuleError for individual rule failure doesn't abort entire run
- Manual trigger: POST endpoint triggers full scan

## Implementation Notes
- "KaizenML" = continuous improvement for ML-generated content -- brand name for the linting subsystem.
- Orphan concepts: Neo4j nodes with no incoming or outgoing relationships.
- Embedding drift: compare current embeddings to stored baseline; flag if cosine distance > threshold.
- Delta mode uses Supabase `updated_at` timestamps to filter modified nodes.
- Lint report stored in Supabase; affected Neo4j node IDs stored as JSONB array.
- Consider parallel rule execution via `Promise.all` for performance (rules are independent).
- Inngest cron syntax: `"0 2 * * *"` for daily at 2 AM UTC.
- See `docs/solutions/pluggable-rule-engine-pattern.md` for the lint rule engine pattern.
- Service uses `readonly #ruleRegistry` and `readonly #supabaseClient` with constructor DI.
