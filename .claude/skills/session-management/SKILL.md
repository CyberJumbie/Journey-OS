---
name: session-management
description: "Invoke at session start (SessionStart hook), when running /checkpoint, /resume, or /handoff. Handles cross-session context reconstruction so Claude Code can pick up exactly where the last session left off without reloading source documents."
---

# Skill: Cross-Session Context Management

## The Problem
Claude Code has no memory between sessions. When you start a fresh session,
Claude sees CLAUDE.md and nothing else. It doesn't know what's been built,
what patterns were established, what mistakes to avoid, or where work was
interrupted. Without explicit context management, every session starts cold.

## The Solution: Layered Context Reconstruction

Session context is rebuilt from small, targeted files that together give
Claude Code full situational awareness without consuming excessive tokens.

### Layer 1: CLAUDE.md (~50 lines, auto-loaded)
Repo-wide rules. Always present. Includes "Things Claude Gets Wrong"
which grows over time via /compound.

### Layer 2: SESSION_STATE.md (~30-50 lines, loaded at startup)
Current position: active story, PIVC phase, active lane, branch.
Plus: a narrative handoff from the previous session.

### Layer 3: docs/coverage.yaml (~20-40 lines, loaded at startup)
Per-lane progress: done/ready/blocked counts.
Recently completed stories (last 5).

### Layer 4: docs/ARCHITECTURE_DECISIONS.md (loaded at startup)
Running log of architectural decisions made DURING development.
Not the source docs — these are decisions that DIVERGED from or
EXTENDED the source docs. Critical for maintaining consistency.

### Layer 5: docs/solutions/ (loaded on demand)
Reusable patterns with YAML frontmatter. Only loaded when relevant
to the current story. Claude Code checks here before writing new code.

### Layer 6: docs/error-log.yaml (loaded at startup, just the summary)
Error count, recurrence rate, last 3 errors. Not the full log.

### Layer 7: Story brief (loaded when /pull or /plan runs)
The self-contained context packet. Contains everything for implementation.

## Total Context Budget at Session Start

| File | Approx Size | Always Loaded |
|------|-------------|---------------|
| CLAUDE.md | ~2KB | Yes (automatic) |
| SESSION_STATE.md | ~2KB | Yes (startup hook) |
| docs/coverage.yaml (summary) | ~1KB | Yes (startup hook) |
| docs/ARCHITECTURE_DECISIONS.md | ~2KB | Yes (startup hook) |
| Error log summary | ~0.5KB | Yes (startup hook) |
| **Total startup context** | **~7.5KB** | |

This is well within Claude Code's context budget. The story brief (~5KB)
loads only when work begins, bringing total working context to ~12KB.

Compare this to loading source docs directly: 700KB for Journey OS.
That's a 58x reduction.

## SESSION_STATE.md Format

```markdown
# Session State

## Position
- Story: STORY-IA-4
- Lane: institutional_admin
- Phase: Implement (task 3 of 7)
- Branch: feat/STORY-IA-4
- Mode: Standard

## Handoff (written by previous session's /checkpoint)
Implementing STORY-IA-4 "Program management CRUD." Completed tasks 1-2:
created ProgramModel (apps/server/src/models/program.ts) and
ProgramRepository (apps/server/src/repositories/program.repository.ts).
Repository uses Supabase MCP for CRUD and Neo4j MCP for graph node creation.
Followed the dual-write pattern from docs/solutions/dual-write-pattern.md.
Next: task 3 is ProgramService with validation logic. The brief specifies
programs must have unique names within an institution (AC3).

Key decision this session: used slugify for program URL paths instead of
UUID-only, added to ARCHITECTURE_DECISIONS.md.

## Files Modified This Session
- apps/server/src/models/program.ts (created)
- apps/server/src/repositories/program.repository.ts (created)
- docs/ARCHITECTURE_DECISIONS.md (updated)

## Open Questions
- None currently

## Context Files to Read on Resume
1. .context/spec/stories/STORY-IA-4-BRIEF.md (the full brief)
2. docs/solutions/dual-write-pattern.md (pattern used in repo layer)
3. apps/server/src/models/program.ts (review what was built)
4. apps/server/src/repositories/program.repository.ts (review what was built)
```

## The "Context Files to Read on Resume" List
This is the key innovation. /checkpoint writes a specific list of files
that the next session needs to read to reconstruct full context. These are
small, targeted files — not source docs.

The /resume command reads these files and only these files.

## Cross-Session Consistency Rules

1. NEVER rely on conversational memory. Everything persists in files.
2. /checkpoint writes state BEFORE ending. No session ends without it.
3. /resume reads state BEFORE working. No work starts without it.
4. Architectural decisions go in ARCHITECTURE_DECISIONS.md, not just chat.
5. Solution patterns go in docs/solutions/, not just the code.
6. Errors go in error-log.yaml AND CLAUDE.md rules, not just the fix.
