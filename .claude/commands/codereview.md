---
description: Full structured code review of a PR or branch. Produces a reviewer checklist with APPROVE / REQUEST CHANGES verdict.
argument-hint: "[PR number, branch name, or 'current' for current branch]"
allowed-tools: Bash, Read, Grep
---

You are performing a structured code review of $ARGUMENTS.
This is a systematic audit — every section must be completed.
Your output is a review comment that goes directly on the GitHub PR.

---

## Step 1 — Load Context

```bash
# If argument is a PR number
gh pr view $ARGUMENTS --json title,body,files,additions,deletions,commits

# If argument is a branch name
git log dev..$ARGUMENTS --oneline
git diff dev..$ARGUMENTS --stat

# If argument is 'current'
git diff dev...HEAD --stat
git log dev...HEAD --oneline
```

Find the story ID from the PR title or branch name (e.g., `feat/P1-014`).
Read the story file: `docs/stories/P1-XXX.md` (or BACKLOG.md entry).
Note every acceptance criterion.

---

## Step 2 — The Full Diff

```bash
# Get the complete diff
git diff dev...$ARGUMENTS 2>/dev/null || git diff dev...HEAD
```

Read every changed file. Don't skim.

---

## Step 3 — Acceptance Criteria Coverage

For each AC in the story, find the code that implements it:

```
AC1: [exact AC text from story]
  Status: ✅ IMPLEMENTED | ❌ NOT FOUND | ⚠️ PARTIAL
  Evidence: [file:line-range — what implements this]
  Notes: [any concern]

AC2: [exact AC text]
  Status: ✅/❌/⚠️
  Evidence: [file:line]
  Notes:

[... for all ACs]
```

If any AC is ❌ NOT FOUND → this is an automatic REQUEST CHANGES.

---

## Step 4 — Layer Constraint Audit

Check each layer systematically. Run the grep commands and report results.

### Routes Layer
```bash
# Routes must ONLY: apply middleware + call controller
# Check for any business logic, DB calls, or response formatting
git diff dev...$ARGUMENTS -- "backend/src/routes/**" | grep "^+" | \
  grep -v "router\.\|middleware\|controller\.\|import\|export\|^++"
```
Report: ✅ Routes clean | ❌ Logic found at [file:line — describe violation]

### Controllers Layer
```bash
# Controllers must NOT access DB directly
git diff dev...$ARGUMENTS -- "backend/src/controllers/**" | grep "^+" | \
  grep "supabase\.\|neo4j\.\|prisma\.\|\.query("
```
Report: ✅ No direct DB in controllers | ❌ Direct DB at [file:line]

```bash
# Controllers must call services only
git diff dev...$ARGUMENTS -- "backend/src/controllers/**" | grep "^+" | \
  grep -v "service\.\|req\.\|res\.\|next\.\|z\.\|import\|export\|^++"
```

### Services Layer
```bash
# Services must NOT make direct DB calls
git diff dev...$ARGUMENTS -- "backend/src/services/**" | grep "^+" | \
  grep "supabase\.\|neo4j\.\|prisma\.\|\.query("
# Should only show: DualWriteService calls + repository calls
```
Report: ✅ Services use repositories/DualWriteService | ❌ Direct DB at [file:line]

### Repositories Layer
```bash
# Repositories should ONLY contain queries — no business logic
git diff dev...$ARGUMENTS -- "backend/src/repositories/**" | grep "^+" | \
  grep -v "supabase\.\|neo4j\.\|return\|const\|import\|export\|async\|await\|^++"
```
Report: ✅ Repositories contain queries only | ❌ Logic found at [file:line]

### DualWriteService Usage
```bash
# All cross-DB writes must go through DualWriteService
# Find any Supabase write followed by Neo4j write outside the service
git diff dev...$ARGUMENTS | grep "^+" | grep "session\.run\|driver\.session\|\.executeWrite"
# Any hit outside dual-write.service.ts is a violation
```
Report: ✅ DualWriteService used for all cross-DB writes | ❌ Violation at [file:line]

---

## Step 5 — Architecture Rules Audit (The 10 Rules)

**Rule 1 — TypeScript strict:**
```bash
# No `any` types
git diff dev...$ARGUMENTS | grep "^+" | grep ": any\|as any\|<any>"
```
✅ Zero `any` | ❌ Found at [file:line — quote the line]

**Rule 2 — Supabase-first dual-write:**
```bash
# Check any Neo4j write has a preceding Supabase write
git diff dev...$ARGUMENTS | grep -B 10 "session\.run\|executeWrite" | grep "supabase\."
```
✅ Supabase-first confirmed | ❌ Neo4j written before/without Supabase at [file:line]

**Rule 3 — MERGE not CREATE:**
```bash
git diff dev...$ARGUMENTS | grep "^+" | grep "CREATE (" | grep -v "CREATE INDEX\|CREATE CONSTRAINT\|CREATE EXTENSION\|-- "
```
✅ No raw CREATE statements | ❌ CREATE found at [file:line — is it in a query?]

**Rule 4 — Skinny nodes:**
```bash
# Check Neo4j MERGE/SET for text content properties
git diff dev...$ARGUMENTS | grep "^+" | grep -E "SET.*\.(content|text|body|description|vignette|stem|rationale)\s*="
```
✅ No content in graph nodes | ❌ Text content in graph node at [file:line]

**Rule 5 — Stream via AG-UI:**
*Only applies to pipeline node stories.*
```bash
git diff dev...$ARGUMENTS | grep "^+" | grep "res\.json\|res\.send" | grep -v "error\|health\|status"
```
✅ Streaming via STATE_DELTA/TEXT_MESSAGE | ❌ Batched response at [file:line] | N/A

**Rule 6 — Model assignment:**
*Only applies to AI call stories.*
Grep for `claude-haiku` vs `claude-sonnet` usage. Confirm: Haiku for tagging/extraction, Sonnet for generation, Opus only for critic (Phase 2+).
✅ Correct models used | ❌ Wrong model at [file:line] | N/A

**Rule 7 — One file per pipeline node:**
```bash
git diff dev...$ARGUMENTS --name-only | grep "pipeline/nodes/"
# Each new node should be in its own file
```
✅ Each node is one file | ❌ Multiple nodes in one file | N/A

**Rule 8 — Prompts in separate files:**
```bash
# Check for large inline prompt strings in pipeline code
git diff dev...$ARGUMENTS | grep "^+" | grep "system:" | wc -l
# Any count > 2 suggests inline prompts
```
✅ Prompts in pipeline/prompts/ | ❌ Inline prompt string at [file:line] | N/A

**Rule 9 — Labels match NODE_REGISTRY:**
```bash
# Check all Neo4j label references match expected casing
git diff dev...$ARGUMENTS | grep "^+" | grep -E ":\w+" | grep -oP ":\w+" | sort | uniq
# Spot-check: institutional → PascalCase, framework → SCREAMING_SNAKE
```
✅ Labels match NODE_REGISTRY | ❌ Wrong casing at [file:line — which label]

**Rule 10 — No localStorage:**
```bash
git diff dev...$ARGUMENTS | grep "^+" | grep "localStorage\|sessionStorage"
```
✅ No browser storage | ❌ Found at [file:line]

---

## Step 6 — Prototype Contract Check

If this story wires a prototype screen:

```bash
# Find the endpoint being wired
git diff dev...$ARGUMENTS | grep "^+" | grep "router\.\(get\|post\|put\|patch\|delete\)"
```

For each wired endpoint, check `docs/reference/06_SCREEN_BACKEND_MAP.md`:
- Does the response shape match the documented TypeScript contract?
- Are all required fields present?
- Are types correct (string vs number, nullable handling)?

✅ Response shape matches 06_SCREEN_BACKEND_MAP.md | ❌ Mismatch: [which field, actual vs expected] | N/A

---

## Step 7 — Code Quality Observations

Beyond correctness, note anything worth flagging (non-blocking unless critical):

**Error handling:**
- Are error cases caught and returned in the documented format `{ error: { code, message, details } }`?
- Are Neo4j write failures handled gracefully (Supabase persists, sync_status='failed')?

**Edge cases not covered:**
- What happens if Voyage AI returns an error?
- What happens if a course has no content chunks?
- What happens if the JWT is expired mid-request?

**Naming:**
- Do new files follow kebab-case convention?
- Do new types follow PascalCase?
- Do new Neo4j labels match the existing label casing?

---

## Step 8 — Final Verdict

Compile everything into the review output:

```
## Code Review — feat/P1-XXX: [Story Title]
**Reviewer:** Claude Code (automated) | **Date:** [date]

---

### AC Coverage

| AC | Status | Evidence |
|----|--------|---------|
| AC1: [text] | ✅/❌/⚠️ | [file:line] |
| AC2: [text] | ✅/❌/⚠️ | [file:line] |
| AC3: [text] | ✅/❌/⚠️ | [file:line] |

---

### Layer Constraints

| Layer | Status | Notes |
|-------|--------|-------|
| Routes | ✅/❌ | |
| Controllers | ✅/❌ | |
| Services | ✅/❌ | |
| Repositories | ✅/❌ | |
| DualWriteService | ✅/❌ | |

---

### Architecture Rules (The 10)

| Rule | Status | Notes |
|------|--------|-------|
| 1. TypeScript strict | ✅/❌ | |
| 2. Supabase-first | ✅/❌ | |
| 3. MERGE not CREATE | ✅/❌ | |
| 4. Skinny nodes | ✅/❌ | |
| 5. Stream via AG-UI | ✅/N/A | |
| 6. Model assignment | ✅/N/A | |
| 7. One node per file | ✅/N/A | |
| 8. Prompts in files | ✅/N/A | |
| 9. Labels correct | ✅/❌ | |
| 10. No localStorage | ✅/❌ | |

---

### Prototype Contract

✅ Response shape matches 06_SCREEN_BACKEND_MAP.md | ❌ [mismatch details] | N/A

---

### Observations (non-blocking)

- [Observation 1]
- [Observation 2]

---

### Required Changes (blocking — must fix before APPROVE)

[If none]: None.

[If any]:
1. **[File:line]** — [What's wrong] — [What to do instead]
2. **[File:line]** — [What's wrong] — [What to do instead]

---

## VERDICT: ✅ APPROVE | ❌ REQUEST CHANGES

[APPROVE]: All ACs met. All rules followed. No blocking issues.
[REQUEST CHANGES]: [N] blocking issues listed above. Address all before re-review.
```

### Post-Review Actions

**If APPROVE:**
```bash
gh pr review $ARGUMENTS --approve --body "[paste the verdict section above]"
```
Then merge:
```bash
gh pr merge $ARGUMENTS --squash --delete-branch
```

**If REQUEST CHANGES:**
```bash
gh pr review $ARGUMENTS --request-changes --body "[paste full review above]"
```
Print:
```
Review submitted: REQUEST CHANGES
Issues to fix: [N]
After fixes: re-run /verify → /review → /commit (amend) → /codereview
```
