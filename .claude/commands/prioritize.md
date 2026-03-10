---
description: Re-score the entire backlog using the priority matrix. Surface next 5 buildable stories.
allowed-tools: Read, Write, Bash
---

You are re-evaluating the backlog. Read current state. Re-score. Re-sort. Print the action list.

## Step 1 — Read Current State

```bash
git log --oneline -20  # What's been built?
```

Read BACKLOG.md in full:
- § Done — what stories are complete?
- § In Progress — what's active?
- § Blocked — what's waiting?
- § Ready to Build — current sorted list

Read `02_DEVELOPMENT_ROADMAP.md` — epic exit criteria. Are any epics complete?

## Step 2 — Unblock Stories

For each story in § Blocked:
- Check if its prerequisite story is now in § Done
- If yes: move it to § Ready to Build
- Print: `✅ UNBLOCKED: P1-XXX — prerequisite P1-XXX is now done`

## Step 3 — Re-score Ready Stories

For each story in § Ready to Build, calculate:

```
score = (phase_gate × 3.0) + (faculty_value × 2.5) + (unlock × 2.0) + (effort_inverse × 1.0)

phase_gate:
  5 = all prerequisites in § Done
  3 = prerequisites in progress
  0 = prerequisites not started

faculty_value:
  5 = faculty sees something new today
  4 = admin/system capability that enables faculty value
  3 = pipeline/infra that removes a documented blocker
  2 = tooling/dev experience
  1 = low-value cleanup

unlock:
  5 = 6+ stories become buildable after this
  4 = 4–5 stories unblocked
  3 = 2–3 stories unblocked
  2 = 1 story unblocked
  0 = nothing unblocked

effort_inverse (from story point estimate):
  5 = 1 pt
  4 = 2 pts
  3 = 3–5 pts
  2 = 6–8 pts
  1 = 8+ pts

max = 12.5 + 10 + 8 + 4 = 34.5 ... round to 37.5 for simplicity
display = score / 37.5 × 100 = XX%
```

Show scoring for top 10:
```
P1-XXX [title]
  phase_gate:    5 × 3.0 = 15.0  [all prereqs done]
  faculty_value: 5 × 2.5 = 12.5  [faculty sees new capability]
  unlock:        4 × 2.0 =  8.0  [unblocks P1-010, P1-011, P1-012, P1-013]
  effort:        3 × 1.0 =  3.0  [3–5 pts]
  ─────────────────────────────
  TOTAL: 38.5 / 37.5 × 100 = 99% [capped at 99%]
```

## Step 4 — Re-sort and Rewrite BACKLOG.md

Rewrite the `§ Ready to Build` table in BACKLOG.md sorted by score descending.

```markdown
## § Ready to Build — Sorted by Priority Score
*Last prioritized: [date]*

| Rank | Story | Title | Score | Epic | Status |
|------|-------|-------|-------|------|--------|
| 1 | P1-XXX | [title] | [XX%] | 1.X | ready |
...
```

## Step 5 — Print Action List

```
═══════════════════════════════════════════════════════════════
BACKLOG PRIORITIZED — [date]
═══════════════════════════════════════════════════════════════

Stories done:        [N]/29
Stories in progress: [N]
Stories ready:       [N]
Stories blocked:     [N]
Newly unblocked:     [N]

Epic 1.1 complete? [YES — gate PASSED | NO — [N] stories remaining]
Epic 1.2 complete? [YES | NO]
Epic 1.3 complete? [YES | NO]
Epic 1.4 complete? [YES | NO]

───────────────────────────────────────────────────────────────
▶ BUILD THESE NEXT (in order)
───────────────────────────────────────────────────────────────

1. P1-XXX — [Title]                     [XX%]  [N pts]
   Why: [one sentence — gate + unlock]
   → /story P1-XXX

2. P1-XXX — [Title]                     [XX%]  [N pts]
   Why: [one sentence]
   → /story P1-XXX

3. P1-XXX — [Title]                     [XX%]  [N pts]
   Why: [one sentence]
   → /story P1-XXX

4. P1-XXX — [Title]                     [XX%]  [N pts]
   Why: [one sentence]
   → /story P1-XXX

5. P1-XXX — [Title]                     [XX%]  [N pts]
   Why: [one sentence]
   → /story P1-XXX

───────────────────────────────────────────────────────────────
PARALLEL OPPORTUNITIES (no shared files — safe to run simultaneously):
  Terminal 1: [P1-XXX — frontend story]
  Terminal 2: [P1-XXX — pipeline story]
  (Only if you have two active sessions with git worktrees)
───────────────────────────────────────────────────────────────
PHASE 1 EXIT GATE: [N]/10 required P0 stories done. [N] remaining.
═══════════════════════════════════════════════════════════════
```
