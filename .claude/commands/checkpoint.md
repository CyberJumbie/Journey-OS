Save comprehensive session state for cross-session continuity.

Usage: /checkpoint
       /checkpoint end (same but signals session is done)

EVERY session must end with /checkpoint. Non-negotiable.
The next session's /resume depends on this being complete and accurate.

## Steps

### 1. Capture Current Position
- Current story ID, lane, PIVC phase, task number (e.g., "task 3 of 7")
- Git branch, uncommitted changes (git status)

### 2. Write the Narrative Handoff (3-8 sentences)
Tell the next session EXACTLY what's going on:
- What story and what it does
- What tasks are COMPLETE (with file paths)
- What task is NEXT (specific details from the brief)
- What patterns/solutions were used (reference docs/solutions/)
- Decisions made that affect future work
- Gotchas the next session should watch for

Good: "Implementing STORY-IA-4 Program management CRUD. Completed tasks 1-2:
ProgramModel and ProgramRepository using dual-write pattern from
docs/solutions/dual-write-pattern.md. Next: task 3 ProgramService —
brief says programs need unique names within institution (AC3)."

Bad: "Working on IA-4. Did some stuff. Keep going."

### 3. List Files Modified This Session (full paths)

### 4. List Open Questions (if any)

### 5. Write "Context Files to Read on Resume"
Specific files the next session should read:
- The story brief (if mid-story)
- Solution docs referenced this session
- Files created this session that need review
- ARCHITECTURE_DECISIONS.md if decisions were made

### 6. Update Persistent Files
a. SESSION_STATE.md — rewrite with all above sections
b. docs/coverage.yaml — update if stories completed
c. docs/ARCHITECTURE_DECISIONS.md — append if decisions made:
   "### [date] STORY-ID: Short title
   Decision: what was decided
   Rationale: why
   Affected files: which files"
d. CLAUDE.md "Things Claude Gets Wrong" — append if errors found

### 7. Git Commit
Mid-story: git add -A && git commit -m "wip(STORY-ID): checkpoint at [phase]"
Story complete: verify /compound already committed.

### 8. Report
"Checkpoint saved. To resume: start new session → /resume"
