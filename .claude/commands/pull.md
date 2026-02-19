Pull the next unblocked story from a persona lane.

Usage: /pull LANE (e.g., /pull institutional_admin, /pull universal, /pull faculty)
       /pull (no argument — returns next story from highest-priority lane with work)

This is the PRIMARY command during development. It replaces /next.

## Steps

1. Read docs/coverage.yaml for completed stories
2. Read .context/spec/backlog/BACKLOG-{LANE}.md for lane's ordered backlog
3. Read .context/spec/backlog/CROSS-LANE-DEPENDENCIES.md

4. For each story in the lane (in priority order):
   a. Is it already done? → skip
   b. Check in-lane dependencies: all done? 
   c. Check cross-lane dependencies: all done?
   d. If both pass → this is the next unblocked story

5. If an unblocked story is found, report:
   ```
   Next unblocked: STORY-IA-4 "Program management CRUD"
     Lane: institutional_admin (priority 2)
     Size: M
     Dependencies met:
       ✅ STORY-U-2 "Auth + RBAC middleware" (universal) — done
       ✅ STORY-IA-3 "Institution settings page" (this lane) — done
     Brief: .context/spec/stories/STORY-IA-4-BRIEF.md
     
   Ready to go. Run /plan STORY-IA-4 to start.
   ```

6. If NO unblocked stories in this lane, report:
   ```
   All institutional_admin stories are blocked.
   
   Blockers:
     STORY-IA-5 ← blocked by STORY-F-3 (faculty) [NOT STARTED]
     STORY-IA-7 ← blocked by STORY-U-6 (universal) [IN PROGRESS]
   
   Suggestion: /pull universal — STORY-U-6 unblocks 3 stories across 2 lanes
   Alternative: /pull faculty — STORY-F-3 unblocks 2 institutional_admin stories
   ```

7. If no lane specified (/pull with no argument):
   Find the highest-priority lane (lowest priority number) with unblocked work.
   Return that story.

8. Update SESSION_STATE.md with the selected story and lane.

## Lane Shortcuts
- /pull u → universal
- /pull sa → superadmin
- /pull ia → institutional_admin
- /pull f → faculty
- /pull s → student
- /pull a → advisor
