Generate a comprehensive project handoff document.

Usage: /handoff

Use when: handing project to another developer, taking a long break,
or wanting a full snapshot of project state beyond what /checkpoint captures.

## Steps

### 1. Read All State Files
- SESSION_STATE.md
- docs/coverage.yaml (full, not summary)
- docs/ARCHITECTURE_DECISIONS.md
- docs/error-log.yaml (full)
- CLAUDE.md (current rules)
- All docs/solutions/*.md (list with summaries)
- git log --oneline -20

### 2. Generate docs/HANDOFF.md

```markdown
# Project Handoff — [Project Name]
Generated: [date]

## Project State
- Stories completed: N/M (X%)
- Active story: STORY-ID (phase, task)
- Current branch: branch-name

## Lane Progress
[Full backlog summary from /backlog]

## What's Been Built
[List of major components/features that are working]

## Architectural Decisions
[Copy from ARCHITECTURE_DECISIONS.md]

## Patterns Established
[List all docs/solutions/*.md with one-line summaries]

## Known Issues & Workarounds
[From error-log.yaml — recurring issues and their rules]

## CLAUDE.md Rules Accumulated
[Copy "Things Claude Gets Wrong" section]

## How to Continue
1. Clone repo, checkout [branch]
2. Start Claude Code: `claude`
3. Run: `/resume`
4. The session state will guide you to the next task
5. Use `/pull LANE` to see available work

## Critical Context
[Narrative: key decisions, tradeoffs, things that aren't obvious
from the code alone. This is the "tribal knowledge" section.]
```

### 3. Git Commit
git add docs/HANDOFF.md && git commit -m "docs: project handoff"
