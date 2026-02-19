Determine the next story to implement.

Usage: /next

This command now delegates to the /pull system.

## Behavior

1. If a lane was specified in SESSION_STATE.md (from a previous /pull):
   Run /pull for that lane.

2. If no lane is active:
   Find the highest-priority lane (lowest priority number) with unblocked work.
   Equivalent to: /pull (no argument)

3. Show the result with lane context:
   ```
   Next: STORY-IA-4 "Program management CRUD"
   Lane: institutional_admin (priority 2)
   
   To work a different lane: /pull LANE
   To see all lanes: /backlog
   To see blockers: /blocked
   ```

For explicit lane selection, use /pull LANE directly.
