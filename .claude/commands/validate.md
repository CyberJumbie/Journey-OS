Validate implementation for story $ARGUMENTS with 4-pass review.

Usage: /validate STORY-ID

## Pass 1: Code Quality (automated)
- Run type check: npx tsc --noEmit
- Run linter: npx eslint
- Run unit tests: npx vitest run --filter $ARGUMENTS
Report: PASS/FAIL per check with error details.

## Pass 2: API Tests (70% of test effort)
Run vitest suites covering this story's functionality:

**Data Layer** (via MCP if configured):
- Tables/nodes exist with correct schema
- Seed data present
- Constraints satisfied

**Business Logic** (vitest):
- CRUD operations at service/controller layer
- Input validation: invalid inputs rejected with correct error codes
- Authorization: wrong-role requests rejected
- Edge cases: empty data, duplicates, boundary values
- Domain-specific: whatever acceptance criteria require

Report: PASS/FAIL per test with assertion details.

## Pass 3: E2E Tests (30% — ONLY if critical journey)
Check: does this story touch a critical user journey?
- YES → Run the Playwright spec
  - Use accessibility-tree selectors (getByRole, getByLabel)
  - Appropriate timeouts for async (30-60s for LLM responses)
  - Capture trace file (not just screenshots)
- NO → SKIP this pass. State: "Not a critical journey — skipped."

Report: PASS/FAIL per step with trace link.

## Pass 4: Multi-Perspective Domain Review
Four focused questions:

**4a. SECURITY**
Does this story introduce auth bypass, data leak, or unvalidated input?
Check: middleware coverage, access control, input sanitization.

**4b. PERFORMANCE**
Does this story introduce N+1 queries, unbounded loops, or missing indexes?
Check: query patterns, pagination, rendering efficiency.

**4c. DATA INTEGRITY**
Does this story maintain consistency across data stores?
Check: sync status, FK relations, referential integrity, no orphans.

**4d. ARCHITECTURE**
Does this story respect layer boundaries and conventions?
Check: import direction, package boundaries, naming, exports.

Report: PASS/FAIL per perspective with specific finding if FAIL.

## Final Verdict
All four passes must PASS. If any FAIL:
- Identify specific failure
- Suggest fix
- Do NOT proceed to /compound until all pass
