# /epic — Run a full epic using subagents

Implement an entire epic by spawning story agents in sequence.
Each story gets its own focused agent context — no context bleed between stories.

Usage: /epic 1.1  or  /epic 1.2  or  /epic P1-016:P1-023

## Step 1: Load epic context

```bash
# Identify epic number from argument
epic="$ARGUMENTS"

case $epic in
  "1.1") cat docs/context-packets/CP-EPIC-1.1.md ;;
  "1.2") cat docs/context-packets/CP-EPIC-1.2.md ;;
  "1.3") cat docs/context-packets/CP-EPIC-1.3.md ;;
  "1.4") cat docs/context-packets/CP-EPIC-1.4.md ;;
esac
```

## Step 2: Confirm story sequence

Epic 1.1: P1-001 → P1-002 → P1-003 → P1-004 → P1-005 → P1-006 → P1-007 → P1-008
Epic 1.2: P1-009 → P1-014 → P1-010 → P1-011 → P1-012 → P1-013 → P1-015
  (Note: P1-014 DualWriteService must come before P1-010 parsers)
Epic 1.3: P1-016 → P1-017 → P1-018 → P1-019 → P1-020 → P1-021 → P1-022 → P1-023
Epic 1.4: P1-024 → P1-025 → P1-026 → P1-027 → P1-028 → P1-029

## Step 3: Spawn story-implementer for each story

For each story in sequence:

```
Task: Implement story {STORY_ID} for Journey OS

Required context (load before implementing):
- .claude/CLAUDE.md (The 10 Rules)
- docs/context-packets/CP-EPIC-{N}.{N}.md (full epic context)
- docs/stories/{STORY_ID}.md (specific ACs)

Story: {STORY_ID}
Files to create: {from context packet FILE MAP for this story}
Exit criteria: {smoke test from context packet}

STOP after this story's smoke test passes. Do not implement adjacent stories.
Update SESSION_STATE.md when done.
```

## Step 4: Verify epic exit gate

After all stories complete:
```bash
# Epic 1.1 exit gate
neo4j: node count ~557
supabase: all 8 tables accessible
GET /health → { status: 'ok', neo4j: true, supabase: true }
STATE_DELTA proven working in browser

# Epic 1.2 exit gate
MATCH (sc:SubConcept) RETURN count(sc) → 15-40
MATCH ()-[:TEACHES]->() RETURN count(*) → matches SubConcept count
content_chunk_embeddings rows with sync_status='synced'

# Epic 1.3 exit gate
Full pipeline generates a question end-to-end
assessment_items row created with status='draft'
5 options rows created

# Epic 1.4 exit gate
End-to-end: login → select course → generate question → approve → view in bank
```

## Step 5: Run /review on entire epic
After exit gate passes, run full /review before marking epic DONE.

## Step 6: Update BACKLOG.md
Mark epic as COMPLETED with date.
