# Session State — 2026-02-20

## Current Position
- **Active story:** STORY-F-3 (Import Parser)
- **Lane:** faculty (P3)
- **Phase:** PLANNED — awaiting approval
- **Branch:** main
- **Previous story:** STORY-F-2 (Notification Model & Repository) — done (recorded retroactively)

## Narrative Handoff

STORY-IA-12 (KaizenML Lint Rule Engine) is fully complete. This is the data quality linting system — 9 pluggable rules that check the knowledge graph and item bank for issues like orphan concepts, dangling SLOs, stale items, tag inconsistencies, score skew, and missing provenance. 6 rules are live with real Supabase/Neo4j queries; 3 are stubs awaiting upstream prerequisites (embedding-drift needs baseline snapshot infra, duplicate-mappings needs course model mapping table, low-confidence-tags needs tag_confidences column).

Key implementation details:
- Pluggable rule engine pattern: registry → engine → rule interface → per-tenant config. Documented in `docs/solutions/pluggable-rule-engine-pattern.md`
- DB: `lint_reports` (JSONB findings) + `lint_rule_configs` (UNIQUE institution_id+rule_id) with RLS enabled
- All 5 routes under `/api/v1/institution/lint/` guarded with `rbac.require(AuthRole.INSTITUTIONAL_ADMIN)`
- 23 tests passing (10 engine + 8 rule + 5 controller)
- Schema gaps handled: `assessment_items.tags` is `text[]` not JSONB, no `tag_confidences` column, `batch_id` used instead of `generation_session_id`, `courses` has no `institution_id` column
- Compound done: new CLAUDE.md rule (test mock response types), error-log.yaml created, solution doc captured

This story unblocks IA-35 (Lint Alert Integration), IA-36 (Golden Dataset Service), IA-37 (Lint Results UI).

Overall progress: 20/166 stories (12%), 504 API tests. SA lane nearly complete (7/9 done). IA lane ramping up (4/44 done).

## Files Modified This Session

### STORY-IA-12 Implementation (27 files committed)
- `packages/types/src/kaizen/lint.types.ts` — LintSeverity, LintFinding, LintReport, LintRuleConfig, LintRule, LintContext
- `packages/types/src/kaizen/index.ts` — barrel
- `packages/types/src/index.ts` — added kaizen export
- `apps/server/src/errors/kaizen.error.ts` — KaizenError, LintRuleNotFoundError, LintReportNotFoundError, LintEngineError
- `apps/server/src/errors/index.ts` — added kaizen exports
- `apps/server/src/models/lint-report.model.ts` — OOP model with #private fields
- `apps/server/src/repositories/lint-report.repository.ts` — CRUD + config ops
- `apps/server/src/services/kaizen/rules/orphan-concepts.rule.ts` — Neo4j, warning
- `apps/server/src/services/kaizen/rules/dangling-slo.rule.ts` — Supabase, critical
- `apps/server/src/services/kaizen/rules/embedding-drift.rule.ts` — STUB
- `apps/server/src/services/kaizen/rules/stale-items.rule.ts` — Supabase, info
- `apps/server/src/services/kaizen/rules/tag-inconsistency.rule.ts` — Supabase, warning
- `apps/server/src/services/kaizen/rules/duplicate-mappings.rule.ts` — STUB
- `apps/server/src/services/kaizen/rules/missing-provenance.rule.ts` — Supabase, info
- `apps/server/src/services/kaizen/rules/score-skew.rule.ts` — Supabase, warning
- `apps/server/src/services/kaizen/rules/low-confidence-tags.rule.ts` — STUB
- `apps/server/src/services/kaizen/lint-rule-registry.service.ts` — Map-based registry
- `apps/server/src/services/kaizen/lint-engine.service.ts` — scan orchestrator
- `apps/server/src/controllers/kaizen/lint.controller.ts` — 5 handler methods
- `apps/server/src/index.ts` — 9 new rules + 5 routes registered
- `apps/server/src/services/kaizen/__tests__/lint-engine.service.test.ts` — 10 tests
- `apps/server/src/services/kaizen/rules/__tests__/orphan-concepts.rule.test.ts` — 3 tests
- `apps/server/src/services/kaizen/rules/__tests__/dangling-slo.rule.test.ts` — 2 tests
- `apps/server/src/services/kaizen/rules/__tests__/stale-items.rule.test.ts` — 3 tests
- `apps/server/src/controllers/kaizen/__tests__/lint.controller.test.ts` — 5 tests
- `docs/solutions/pluggable-rule-engine-pattern.md` — new solution doc
- `docs/error-log.yaml` — created with 2 entries
- `CLAUDE.md` — new rule: test mock response types

### Supabase Migration
- `create_lint_tables` — lint_reports + lint_rule_configs with indexes + RLS

## Open Questions
None.

## Context Files to Read on Resume
- `.context/spec/backlog/BACKLOG-INSTITUTIONAL-ADMIN.md` — IA lane ordering
- `.context/spec/backlog/CROSS-LANE-DEPENDENCIES.md` — cross-lane blockers
- `docs/solutions/pluggable-rule-engine-pattern.md` — new pattern from this session
- The brief for whatever story is pulled next
