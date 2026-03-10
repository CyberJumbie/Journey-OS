---
description: "What do I build right now?" — one story, one command, no ambiguity.
allowed-tools: Bash, Read
---

Read the minimum context needed. Print one answer.

## Step 1 — Read Current State (fast)

```bash
git status                    # Any uncommitted work?
git branch --show-current     # What branch are we on?
git log --oneline -5          # What was recently committed?
```

Read only these sections of BACKLOG.md:
- § In Progress
- § Ready to Build (top 3 rows only)
- § Blocked (scan for newly unblocked items)

## Step 2 — Determine Answer

**If § In Progress has a story:**
→ That story. It's not done. Resume it.
Check for `HANDOFF.md` or `progress.md`. If it exists, read the "Next Session: Start Here" section.

**If § In Progress is empty, § Ready to Build has stories:**
→ Top row of Ready to Build. That's the answer.

**If both are empty:**
→ "Run /prioritize — the backlog needs updating."

## Step 3 — Print ONE Answer

```
═══════════════════════════════════════════════
▶ BUILD THIS NOW
═══════════════════════════════════════════════
Story:    P1-XXX — [Full Story Title]
Epic:     [Epic title] (Week [N]–[N])
Priority: [XX%] | Points: [N] | Status: [ready | resumed]

Why this story right now:
[1 sentence: phase gate + what it unlocks]

How to start:
  /story P1-XXX

[If resuming — include this section:]
─────────────────────────────────────────────
RESUMING (HANDOFF.md found)
Last step completed: [N] of [M]
Next action: [exact first thing to do]
Modified files:
  - [file path]
─────────────────────────────────────────────
═══════════════════════════════════════════════
```

Nothing else. No alternatives. No caveats. One answer.
