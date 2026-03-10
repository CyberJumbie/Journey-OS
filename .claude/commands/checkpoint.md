---
description: Mid-story save. Persist current PIVC phase, task progress, and decisions. WIP git commit. Use when pausing mid-story or approaching context limit.
allowed-tools: Bash, Read, Write
---

You are saving progress mid-story. This lets you pause now and resume exactly here next session.

---

## Step 1 — Capture Exact State

```bash
git status         # What's staged vs unstaged
git diff --stat    # What files changed
git branch --show-current
pnpm typecheck 2>&1 | grep "error" | head -5  # Current typecheck state
```

---

## Step 2 — Write SESSION_STATE.md

Overwrite SESSION_STATE.md with current state (max 40 lines):

```markdown
# SESSION_STATE.md
*Checkpoint: [date time]*

## Current Story
**ID:** P1-XXX
**Title:** [title]
**Phase:** [PLAN | IMPLEMENT | VERIFY | REVIEW | COMPOUND]
**Task:** [N] of [M] — [exact task description from /plan]

## Progress
Completed tasks:
- [task 1 description] ✅
- [task 2 description] ✅

Current task:
- [task N description] — [what's done, what's left]
  Files touched: [file1, file2]

Remaining tasks:
- [task N+1]
- [task N+2]

## Typecheck Status
[CLEAN | N errors — paste first 3]

## Decisions Made This Session
- [decision]: [rationale + doc reference]

## Resume Instructions
1. git checkout [branch-name]
2. pnpm typecheck (confirm state above)
3. Open [primary file being worked on]
4. Continue: [exact next action — one sentence]

## Context Loaded
- .context/entities.yaml ✅
- .context/routes.yaml ✅
- docs/solutions/[SOL-NNN] ✅
```

---

## Step 3 — WIP Commit

```bash
git add -A
git commit -m "wip(P1-XXX): checkpoint — [current task description]

Phase: [IMPLEMENT task N of M]
Typecheck: [clean | N errors]
Next: [one-line resume instruction]"

git push origin feat/P1-XXX-[branch-name]
```

---

## Step 4 — Print

```
═══════════════════════════════════════════════
CHECKPOINT SAVED — P1-XXX
═══════════════════════════════════════════════
Phase:   [IMPLEMENT]
Task:    [N] of [M] — [description]
Branch:  feat/P1-XXX pushed ✅
State:   SESSION_STATE.md written ✅

TO RESUME:
  git checkout feat/P1-XXX-[name]
  Read SESSION_STATE.md
  Run /status → /story P1-XXX → continue

Context is now safe to clear.
═══════════════════════════════════════════════
```
