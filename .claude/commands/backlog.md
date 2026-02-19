Show the full backlog state across all persona lanes.

Usage: /backlog
       /backlog LANE (show detail for one lane)

## Full View (/backlog)

Read all backlog files and coverage.yaml. Display:

```
═══════════════════════════════════════════════════════════════
BACKLOG STATUS
═══════════════════════════════════════════════════════════════

UNIVERSAL (P0)     ████████░░  8/10 done  | 1 ready | 1 blocked
SUPERADMIN (P1)    ██░░░░░░░░  2/6 done   | 1 ready | 3 blocked
INST ADMIN (P2)    ███░░░░░░░  3/12 done  | 2 ready | 7 blocked
FACULTY (P3)       ░░░░░░░░░░  0/18 done  | 3 ready | 15 blocked
STUDENT (P4)       ░░░░░░░░░░  0/14 done  | 0 ready | 14 blocked
ADVISOR (P5)       ░░░░░░░░░░  0/8 done   | 0 ready | 8 blocked

Total: 13/68 done (19%) | 7 ready | 48 blocked

Next recommended: /pull universal — STORY-U-9 unblocks 5 downstream
═══════════════════════════════════════════════════════════════
```

## Lane Detail (/backlog LANE)

```
═══════════════════════════════════════════════════════════════
INSTITUTIONAL ADMIN LANE (priority 2)
═══════════════════════════════════════════════════════════════

✅ STORY-IA-1  Institution model + CRUD          S   done
✅ STORY-IA-2  Program management model           S   done
✅ STORY-IA-3  Institution settings page           M   done
🟢 STORY-IA-4  Program management CRUD            M   READY ← next
🟢 STORY-IA-5  Faculty assignment + roles          M   READY
🔴 STORY-IA-6  Course creation with KG link        L   blocked by STORY-F-3
🔴 STORY-IA-7  Analytics dashboard                 L   blocked by STORY-F-5
🔴 STORY-IA-8  Coverage report viewer              M   blocked by STORY-U-8
🔴 STORY-IA-9  Student roster management           M   blocked by STORY-S-1
...

Cross-lane blockers:
  STORY-F-3 blocks: IA-6, IA-7
  STORY-U-8 blocks: IA-8
  STORY-S-1 blocks: IA-9
═══════════════════════════════════════════════════════════════
```
