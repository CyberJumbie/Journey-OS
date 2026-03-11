---
description: End the current session. Write SESSION_STATE.md. Reset context. (Run /compound first if story is complete.)
allowed-tools: Bash, Read, Write
---

You are ending this session. Capture state. Then reset.

**If the story is complete:** Run /compound first, then /commit, then /clear.
**If the story is in-progress:** Run /checkpoint first, then /clear.
**If the session had no active story:** Run /clear directly.

---

## Step 1 — Confirm Context Is Saved

```bash
git log --oneline -5  # Confirm compound commit and/or checkpoint commit exist
git status            # No uncommitted changes (if any: warn user)
```

If there are uncommitted changes that haven't been /checkpoint'd: STOP.
Print: "Uncommitted work found. Run /checkpoint before /clear."

---

## Step 2 — Write Final SESSION_STATE.md

```bash
CURRENT_BRANCH=$(git branch --show-current)
LAST_3=$(git log --oneline -5 | grep "feat\|compound" | head -3)
```

Write SESSION_STATE.md (max 40 lines):

```markdown
# SESSION_STATE.md
*Session ended: [date time]*

## Current Story
**ID:** [P1-XXX | none]
**Status:** [complete — awaiting PR review | in-progress — checkpoint saved | none]
**Branch:** [branch name | dev]

## Last 3 Completed Stories
- P1-XXX — [title] — [date]
- P1-YYY — [title] — [date]
- P1-ZZZ — [title] — [date]

## Next Ready Queue
1. P1-XXX — [title] — [priority %]
2. P1-XXX — [title] — [priority %]
3. P1-XXX — [title] — [priority %]

## Phase 1 Progress
[N]/29 stories done | [N] in progress | [N] ready | [N] blocked

## To Resume
[if story in-progress:]
  git checkout [branch]
  pnpm typecheck
  Read SESSION_STATE.md → /story P1-XXX → continue from task [N]

[if story complete, PR open:]
  Review PR [URL]
  After merge: /commit --prod → /deploy

[if no active story:]
  /next
```

---

## Step 3 — Commit SESSION_STATE if changed

```bash
if git diff --name-only | grep -q "SESSION_STATE.md"; then
  git add SESSION_STATE.md
  git commit -m "chore(session): end-of-session state — [P1-XXX status]"
  git push origin $(git branch --show-current)
fi
```

---

## Step 4 — Print Reset Summary

```
═══════════════════════════════════════════════
SESSION ENDED
═══════════════════════════════════════════════
Active story:  P1-XXX — [status]
Branch:        [branch name] — pushed ✅
STATE:         SESSION_STATE.md written ✅

Phase 1:       [N]/29 stories done

TO RESUME NEXT SESSION:
  1. git checkout [branch] && git pull
  2. Read SESSION_STATE.md (or run /status)
  3. Run /next (or /story P1-XXX to resume)

Context is now safe to clear.
Run /compact now.
═══════════════════════════════════════════════
```
