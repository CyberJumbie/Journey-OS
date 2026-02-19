Assign all stories to persona lanes, order within lanes, and detect cross-lane dependencies.

Usage: /prioritize

Prerequisite: ALL stories must exist (run /decompose-all first).

## Steps

1. Read all stories from .context/spec/stories/SPRINT-*-STORIES.md
2. Read persona definitions from .context/spec/personas/
3. Read or generate lane config:
   - If .context/spec/backlog/LANE-CONFIG.yaml exists, use it
   - If not, generate from personas with default priority order
   - WAIT for human to review and adjust lane priorities

4. For each story, determine lane:
   a. Read the story's persona(s) and user flow(s)
   b. If single persona → assign to that persona's lane
   c. If infrastructure/shared → assign to universal lane
   d. If multi-persona → assign to highest-priority persona's lane
   e. Tag story with lane prefix: STORY-{PREFIX}-{N}

5. Within each lane, order stories by:
   a. Dependency depth (zero dependencies first)
   b. Unblock count (enables more downstream = higher priority)
   c. Feature completeness (finish a flow before starting another)
   d. Size (S before M before L)

6. Detect cross-lane dependencies:
   For each story, check if any dependency is in a different lane.
   Record in CROSS-LANE-DEPENDENCIES.md.

7. Renumber stories within each lane: STORY-{PREFIX}-1, STORY-{PREFIX}-2, ...

8. Generate backlog files:
   - .context/spec/backlog/LANE-CONFIG.yaml
   - .context/spec/backlog/BACKLOG-UNIVERSAL.md
   - .context/spec/backlog/BACKLOG-SUPERADMIN.md
   - .context/spec/backlog/BACKLOG-INSTITUTIONAL-ADMIN.md
   - .context/spec/backlog/BACKLOG-FACULTY.md
   - .context/spec/backlog/BACKLOG-STUDENT.md
   - .context/spec/backlog/BACKLOG-ADVISOR.md
   - .context/spec/backlog/CROSS-LANE-DEPENDENCIES.md

9. Rename story files to use new IDs (STORY-{PREFIX}-{N}-BRIEF.md)

10. Report:
    - Stories per lane with counts
    - Cross-lane dependency count
    - Estimated build order (which lanes unblock which)
    - Any circular dependencies (ERROR if found)

WAIT for human review. The lane assignments and ordering govern
all development-time decisions via /pull.
