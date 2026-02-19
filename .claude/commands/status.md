Show current project status dashboard with session context.

Usage: /status

Read (small files, no RLM needed):
1. SESSION_STATE.md — current story, lane, phase, task
2. docs/coverage.yaml — per-lane progress
3. docs/error-log.yaml — error pipeline stats
4. docs/ARCHITECTURE_DECISIONS.md — decision count
5. git status — uncommitted changes, current branch
6. git log --oneline -5 — recent commits

Present as dashboard:
```
═══════════════════════════════════════════════════
SESSION STATUS
═══════════════════════════════════════════════════
Story: STORY-IA-4 | Phase: Implement (task 3/7)
Lane: institutional_admin (P2) | Branch: feat/STORY-IA-4

BACKLOG
  UNIVERSAL (P0)   ████████░░  8/10  | 1 ready
  SUPERADMIN (P1)   ██░░░░░░░░  2/6   | 1 ready
  INST ADMIN (P2)   ███░░░░░░░  3/12  | 1 ready ← active
  FACULTY (P3)      ░░░░░░░░░░  0/18  | 3 ready
  STUDENT (P4)      ░░░░░░░░░░  0/14  | 0 ready
  ADVISOR (P5)      ░░░░░░░░░░  0/8   | 0 ready

HEALTH
  Errors captured: 12 | Rules created: 10 | Recurrence: 8%
  Arch decisions: 4 | Solution docs: 3
  Last commit: wip(STORY-IA-4): checkpoint [2h ago]

CONTEXT
  🟢 Fresh context (exchange 3 of 40)
═══════════════════════════════════════════════════
```

Do NOT load .context/source/ docs.
