Reconstruct context from the previous session's checkpoint.

Usage: /resume

Run this as your FIRST command in every new session (after Claude Code
auto-loads CLAUDE.md). This replaces the old pattern of just reading
SESSION_STATE.md — it loads the full context stack.

## Steps

### 1. Read Core State Files (always — small, fast)
Read these files directly (no RLM needed, all under 5KB):

a. SESSION_STATE.md
   - Current story, lane, phase, task number
   - Narrative handoff from previous session
   - Open questions
   - "Context Files to Read on Resume" list

b. docs/coverage.yaml
   - Per-lane progress (done/ready/blocked counts)
   - Last 5 completed stories
   - Error pipeline stats

c. docs/ARCHITECTURE_DECISIONS.md
   - All architectural decisions made during development
   - These override source docs when they conflict

d. docs/error-log.yaml (summary only — last 5 errors)

### 2. Read Context Files from Handoff
SESSION_STATE.md contains a list: "Context Files to Read on Resume."
Read each one. These are typically:
- The current story brief (3-8KB)
- 1-2 solution docs referenced in the current story
- Files created in the previous session (to review what was built)

### 3. Check Git State
- git branch — confirm on the correct branch
- git status — any uncommitted changes from last session?
- git log --oneline -3 — recent commits for context

### 4. Reconstruct Working Context
Synthesize what was read into a mental model:
- What story am I working on? What does it do?
- What phase am I in? What's the next task?
- What patterns have been established? (from solutions/)
- What mistakes have been made before? (from CLAUDE.md + error log)
- What architectural decisions affect this work? (from ARCHITECTURE_DECISIONS.md)

### 5. Report
```
Session resumed.
  Story: STORY-IA-4 "Program management CRUD"
  Lane: institutional_admin (priority 2)
  Phase: Implement (task 3 of 7 — ProgramService)
  Branch: feat/STORY-IA-4

  Previous session completed:
    ✅ Task 1: ProgramModel
    ✅ Task 2: ProgramRepository (dual-write pattern)

  Next task: ProgramService — unique name validation per institution (AC3)

  Patterns loaded:
    - docs/solutions/dual-write-pattern.md
    - docs/solutions/rbac-middleware-pattern.md

  Architecture decisions relevant:
    - Program URL paths use slugified names (not UUID-only)

  Errors to avoid:
    - Always include SuperAdmin RLS bypass
    - Named exports only

  Ready to continue. Run the next task or /plan to review the plan.
```

### 6. If No Previous Session (First Session)
If SESSION_STATE.md says "run /classify to start":
- Report: "No previous session. Starting fresh."
- Suggest: /classify if spec phase, /pull if build phase

### 7. If Story Was Completed in Previous Session
If SESSION_STATE.md says phase = "Complete":
- Report: "Previous story completed. Ready for next."
- Suggest: /pull LANE to get next story
