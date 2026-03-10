---
description: Push feat branch and open PR to dev. Run AFTER /compound. Use --prod to merge dev → main.
argument-hint: "[--prod] [optional message override]"
allowed-tools: Bash
---

**Prerequisite:** `/compound` must have run this session. It handles BACKLOG.md, SESSION_STATE.md, and the knowledge commit. This command handles only the code PR.

**Mode A (no flag):** Push `feat/P1-XXX` → open PR to `dev`
**Mode B (`--prod`):** Squash-merge `dev` → `main` → tag release

---

## PRE-FLIGHT

```bash
# 1. Confirm /verify and /review and /compound have all passed
# If any were skipped this session: STOP.

# 2. Check branch
git branch --show-current
# Must be feat/P1-XXX — not main, not dev

# 3. Confirm /compound already committed context artifacts
git log --oneline -3
# Should see: "compound(P1-XXX): extract learnings..."
```

If on `main` or `dev` directly:
```
⛔ Cannot commit directly to [main|dev].
  git checkout dev && git pull origin dev
  git checkout -b feat/P1-XXX-[short-title]
```

---

## MODE A — Code Commit + PR to dev

### Stage + Commit code changes

```bash
# /compound already committed CLAUDE.md, .context/, docs/solutions/, SESSION_STATE.md
# This commit is code only
git add -A
git status  # verify only code files (apps/, packages/, scripts/)

git commit -m "feat(P1-XXX): [story title — imperative present tense]

[Body: WHAT changed and WHY. Not HOW.]

Story: P1-XXX
ACs met: AC1, AC2, AC3
Layer violations: none
TypeScript: clean"
```

Good commit message bodies:
```
# P1-014 example:
All cross-database writes now route through DualWriteService: Supabase
first, Neo4j second, sync_status updated on both outcomes.
Neo4j failures are non-fatal — Supabase record persists with sync_status='failed'.

# P1-019 example:
Vignette builder node streams via STATE_DELTA events so the faculty
workbench renders the patient scenario progressively as it's generated.
```

### Push

```bash
git push origin feat/P1-XXX-[short-title]
# First push: git push -u origin feat/P1-XXX-[short-title]
```

### Open PR

```bash
gh pr create \
  --base dev \
  --head feat/P1-XXX-[short-title] \
  --title "feat(P1-XXX): [story title]" \
  --body "## Story
**[P1-XXX] — [Full Story Title]**

## Acceptance Criteria
- [ ] AC1: [from story]
- [ ] AC2: [from story]
- [ ] AC3: [from story]

## Vertical Slice
| Layer | Change |
|-------|--------|
| DB | [Supabase + Neo4j changes] |
| API | [Routes added/modified] |
| Frontend | [Component wired | REWRITE | N/A] |
| Tests | [What smoke test covers] |

## Architecture Review
| Check | Result |
|-------|--------|
| Layer constraints | ✅ |
| DualWriteService | ✅ all cross-DB writes routed |
| TypeScript strict | ✅ zero errors |
| ESLint | ✅ zero warnings |
| Neo4j MERGE | ✅ no raw CREATE |
| Skinny nodes | ✅ no text content in graph |
| Smoke test | ✅ |

## Solution Docs Written
$(cat docs/solutions/index.yaml 2>/dev/null | tail -3 | sed 's/^/- /' || echo '- none')

---
/codereview to run structured review"
```

### Print Summary

```
═══════════════════════════════════════════════
COMMIT COMPLETE — P1-XXX (dev)
═══════════════════════════════════════════════
Branch:  feat/P1-XXX-[name]
PR:      [GitHub PR URL]
Target:  dev

Next: request review or run /codereview
After PR merged: /commit --prod
═══════════════════════════════════════════════
```

---

## MODE B — Merge dev → main + Tag (`/commit --prod`)

**Pre-checks:**
```bash
# PR merged to dev?
gh pr list --state merged --base dev | head -5

# dev CI passing?
gh run list --branch dev --limit 3

# Any other in-progress stories?
grep "in-progress" BACKLOG.md

# dev ahead of main?
git log main..dev --oneline | head -5
```

If checks fail: STOP. Print what's blocking.

```bash
# Pull latest dev
git checkout dev && git pull origin dev

# Determine version (MINOR for new epic, PATCH for single story)
NEXT_VERSION="v0.X.Y"

# Squash merge to main
git checkout main && git pull origin main
git merge --squash dev

git commit -m "release($NEXT_VERSION): [one-line summary]

Stories:
$(git log main..dev --oneline | sed 's/^/  - /')

Phase 1: [N]/29 stories | Breaking changes: NONE"

# Tag + push
git tag -a $NEXT_VERSION -m "Release $NEXT_VERSION"
git push origin main
git push origin $NEXT_VERSION
```

```
═══════════════════════════════════════════════
RELEASE COMPLETE — $NEXT_VERSION (main)
═══════════════════════════════════════════════
main is deployable. Run /deploy.
═══════════════════════════════════════════════
```
