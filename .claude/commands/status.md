---
description: Full project dashboard — phase progress, story status, what's blocked, recent activity.
allowed-tools: Bash, Read
---

Read current project state. Print a complete dashboard.

## Gather Data

```bash
git log --oneline -15                          # Recent commits
git log --oneline --since="7 days ago"         # This week
git tag --sort=-version:refname | head -3      # Latest releases
git branch -a | grep "feat/" | head -10       # Active feature branches
```

Read BACKLOG.md — count stories in each section.
Read 02_DEVELOPMENT_ROADMAP.md — phase exit criteria.

## Dashboard

```
╔══════════════════════════════════════════════════════════════════╗
║         JOURNEY OS — PROJECT STATUS DASHBOARD                    ║
║         [current date]                                            ║
╠══════════════════════════════════════════════════════════════════╣
║  PHASE 1 — "The Question Factory"   Consumer: Dr. Amara Osei    ║
║  GOAL: Faculty generates first question from their syllabus       ║
╚══════════════════════════════════════════════════════════════════╝

PHASE 1 EPIC PROGRESS
───────────────────────────────────────────────────────────────────
Epic 1.1  Infrastructure & Spike    [done]/8  stories  [████░░░░░░]  Wks 1–2
Epic 1.2  Single Course Ingestion   [done]/7  stories  [░░░░░░░░░░]  Wks 3–4
Epic 1.3  Generation Pipeline       [done]/8  stories  [░░░░░░░░░░]  Wks 5–6
Epic 1.4  Workbench MVP             [done]/6  stories  [░░░░░░░░░░]  Wks 7–8
───────────────────────────────────────────────────────────────────
TOTAL Phase 1                       [done]/29 stories  [XX% complete]

STORY STATUS
───────────────────────────────────────────────────────────────────
✅ Done:              [N] stories  [list P1-XXX, P1-XXX]
🔨 In Progress:       [N] stories  [list P1-XXX — on branch feat/P1-XXX]
📋 Ready to Build:    [N] stories  [top 3: P1-XXX, P1-XXX, P1-XXX]
⛔ Blocked:           [N] stories  [list P1-XXX — blocked by: P1-XXX]
───────────────────────────────────────────────────────────────────

PHASE 1 EXIT GATE PROGRESS
───────────────────────────────────────────────────────────────────
Exit criteria: Faculty generates first real question from MEDI 531 syllabus
Gate checks:
  Neo4j seeded (~560 nodes):       [✅ DONE | ⏳ P1-005,006 pending]
  Supabase tables live:            [✅ DONE | ⏳ P1-004 pending]
  One syllabus ingested:           [✅ DONE | ⏳ P1-009–015 pending]
  Pipeline end-to-end:             [✅ DONE | ⏳ P1-016–023 pending]
  Faculty can log in + generate:   [✅ DONE | ⏳ P1-024–029 pending]
  CopilotKit spike validated:      [✅ DONE | ⏳ P1-008 pending | ⚠️ RISK]
───────────────────────────────────────────────────────────────────

RELEASES
───────────────────────────────────────────────────────────────────
Latest tag:   [git tag output]
Deployed:     [last /deploy date]
main:         [git log main --oneline -1]
dev:          [git log dev --oneline -1]
───────────────────────────────────────────────────────────────────

ACTIVE BRANCHES
───────────────────────────────────────────────────────────────────
[git branch output for feat/ branches]
───────────────────────────────────────────────────────────────────

RECENT ACTIVITY (last 7 days)
───────────────────────────────────────────────────────────────────
[git log --oneline --since="7 days ago"]
───────────────────────────────────────────────────────────────────

OPEN PRS
───────────────────────────────────────────────────────────────────
[gh pr list --state open 2>/dev/null || echo "Install gh CLI or check GitHub"]
───────────────────────────────────────────────────────────────────

NEXT ACTIONS
───────────────────────────────────────────────────────────────────
▶ Next story to build:  P1-XXX — [title]
▶ Quick start:          /story P1-XXX  →  /plan  →  /implement
▶ Full priority view:   /prioritize
▶ Single answer:        /next
───────────────────────────────────────────────────────────────────
```
