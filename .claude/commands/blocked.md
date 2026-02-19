Show what's blocking the next stories in a lane.

Usage: /blocked LANE (e.g., /blocked faculty)
       /blocked (no argument — shows all blockers across all lanes)

## Per-Lane View (/blocked LANE)

```
FACULTY LANE — 15 blocked stories

Blocker chain:
  STORY-U-6 "Inngest background jobs" (universal, NOT STARTED)
    └── unblocks: STORY-F-5, STORY-F-8, STORY-F-11

  STORY-U-4 "Embedding pipeline service" (universal, NOT STARTED)
    └── unblocks: STORY-F-7, STORY-F-9

  STORY-IA-3 "Institution settings" (inst_admin, IN PROGRESS)
    └── unblocks: STORY-F-2

Fastest path to unblock faculty:
  1. Complete STORY-U-6 → unblocks 3 faculty stories
  2. Complete STORY-U-4 → unblocks 2 faculty stories
  3. Complete STORY-IA-3 → unblocks 1 faculty story
```

## Global View (/blocked)

```
CROSS-LANE BLOCKER IMPACT

STORY-U-6 (universal) blocks 8 stories across 4 lanes
STORY-U-4 (universal) blocks 5 stories across 3 lanes
STORY-F-3 (faculty) blocks 4 stories across 2 lanes
STORY-IA-3 (inst_admin) blocks 2 stories across 1 lane

Recommendation: Clear universal lane first — it unblocks the most work.
```
