---
description: Extract learnings from completed implementation. Produce solution docs, update CLAUDE.md error patterns, mark story progress, commit. Run after /review passes.
allowed-tools: Bash, Read, Write
---

You are extracting accumulated knowledge from this story's implementation before committing.
This is what makes the next story faster than the current one.
Run after /review has passed. Do not skip this step.

---

## Step 1 — Audit What Was Built

Read every file that was created or modified during this story:

```bash
git diff --name-only HEAD  # uncommitted changes
# OR if already committed:
git diff --name-only HEAD~1 HEAD
```

For each file, ask:
- What pattern was used here that wasn't in any existing solution doc?
- What mistake was made and corrected during implementation?
- What was the non-obvious decision that required referencing a reference doc?

---

## Step 2 — Extract Reusable Patterns

Check docs/solutions/ for existing patterns:

```bash
ls docs/solutions/ 2>/dev/null || echo "no solutions yet"
cat docs/solutions/index.yaml 2>/dev/null || echo "no index yet"
```

For each new pattern identified in Step 1 (only patterns worth reusing — not trivia):

**Pattern qualifying test:** "If the next developer starting P1-XXX+1 had this pattern card, would it save them 15+ minutes?" If yes: write it.

Create `docs/solutions/SOL-NNN-pattern-name.md`:

```markdown
# SOL-NNN: [Pattern Name]

## Trigger
When to apply this pattern: [one sentence describing the situation]
Story it emerged from: P1-XXX

## Pattern

### What it solves
[One sentence: the specific problem this addresses]

### Implementation
```typescript
// The actual pattern — copy-pasteable skeleton
// Layer: [routes | controllers | services | repositories | dual-write | pipeline | frontend]
// File convention: [naming pattern for files using this]
```

### Test pattern
```typescript
// How to test code using this pattern
```

### Gotchas
- [Non-obvious thing that will bite the next person]
- [Edge case worth knowing]

## Provenance
First created: P1-XXX ([story title])
Also applies to: [story IDs where this would have helped]
```

Update the index:

```bash
echo "SOL-NNN: [one-line description] | P1-XXX" >> docs/solutions/index.yaml
```

---

## Step 3 — Update CLAUDE.md Error Patterns

Did a mistake occur this session that could happen again?
Criteria: would a different Claude Code session (starting fresh) make the same mistake?

If yes, add to the `## Things Claude Gets Wrong` section in CLAUDE.md:

```bash
# Add to .claude/CLAUDE.md § Things Claude Gets Wrong
# Format: "- [PATTERN]: [one-line description of the mistake + what to do instead]"
# Examples:
# - LAYER_VIOLATION: Controllers call neo4j directly — always go through service → repository
# - CYPHER_CREATE: Using CREATE instead of MERGE for nodes — always MERGE for idempotency
# - DUAL_WRITE_ORDER: Writing Neo4j before Supabase — Supabase ALWAYS first
# - SYNC_STATUS: Forgetting to update sync_status after Neo4j write — always update
```

Max 15 error entries in active section. If you've added a 16th, archive the oldest 5 to docs/solutions/.

---

## Step 4 — Update Slim Context Files

Did this story create new entities, routes, components, or pipeline nodes?

```bash
# Check what's new
git diff --name-only HEAD | grep -E "models|repositories|routes|components|pipeline"
```

Update the relevant .context/ slim YAML:

```bash
# entities.yaml: add one-liner for each new Supabase table or Neo4j node type added
# Example: "Upload: File upload record with WORM semantics and processing status"

# routes.yaml: add one-liner for each new Express route registered
# Example: "POST /api/v1/uploads — Upload file to Supabase Storage [auth:faculty]"

# components.yaml: add one-liner for each new React component registered
# Example: "UploadZone: form, [idle/uploading/done], used_in:UploadSyllabus"

# pipeline.yaml: add one-liner for each new LangGraph node
# Example: "chunker: ContentChunk[] → ContentChunk[] (no AI, tiktoken splits)"
```

Keep every entry to one line. If a new entry would require two lines to describe, the thing being described needs better naming.

---

## Step 5 — Update SESSION_STATE.md

Rewrite the current session state (max 40 lines):

```markdown
# SESSION_STATE.md
*Updated: [date]*

## Current Story
**ID:** P1-XXX | **Status:** COMPLETE | **Phase:** COMPOUND

## Last 3 Completed
- P1-XXX — [title] — [date]
- P1-YYY — [title] — [date]
- P1-ZZZ — [title] — [date]

## Next Ready Queue
1. P1-XXX — [title] — [priority %]
2. P1-XXX — [title] — [priority %]
3. P1-XXX — [title] — [priority %]

## Solution Docs Written This Session
- SOL-NNN: [name]
- [or: none]

## Error Patterns Added to CLAUDE.md
- [pattern name]: [one-line]
- [or: none]

## Slim Context Updated
- .context/[file]: [what was added]
- [or: none]
```

---

## Step 6 — Update BACKLOG.md

Move the story from § In Progress to § Done:

```
| P1-XXX | [title] | v0.X.X | [PR link] | pending |
```

Move the next story from § Ready to Build to § In Progress (if starting immediately) or leave it at the top of Ready to Build.

---

## Step 7 — WIP Commit

Commit all context/knowledge artifacts before the official PR commit:

```bash
git add \
  .claude/CLAUDE.md \
  .context/ \
  docs/solutions/ \
  SESSION_STATE.md \
  BACKLOG.md

git commit -m "compound(P1-XXX): extract learnings, update context + solution docs

$([ -f docs/solutions/index.yaml ] && tail -3 docs/solutions/index.yaml | sed 's/^/  /')
Error patterns added: $(grep -c "^-" .claude/CLAUDE.md 2>/dev/null || echo 0)
Slim context updated: $(echo "entities.yaml routes.yaml components.yaml" | tr ' ' '\n' | grep -v "^$" | head -3 | tr '\n' ',' | sed 's/,$//')"
```

---

## Step 8 — Print Summary

```
═══════════════════════════════════════════════════════════
COMPOUND COMPLETE — P1-XXX: [Story Title]
═══════════════════════════════════════════════════════════
Solution docs written: [N]
  [list SOL-NNN: name for each]

Error patterns added to CLAUDE.md: [N]
  [list each pattern name]

Slim context updated:
  .context/[file] — [what was added]

SESSION_STATE.md updated ✅
BACKLOG.md updated ✅ (P1-XXX → Done)
Knowledge committed ✅

The next story starts smarter than this one did.

Ready for: /commit (opens PR to dev)
═══════════════════════════════════════════════════════════
```

---

## When There's Nothing to Extract

If the story was purely mechanical (small change, no novel patterns, no mistakes):

```
═══════════════════════════════════════════════════════════
COMPOUND — P1-XXX: [Story Title]
═══════════════════════════════════════════════════════════
Patterns extracted: 0 (no novel patterns found — story was mechanical)
Error patterns: 0 (no mistakes to document)
Slim context: updated (N new entries)
SESSION_STATE + BACKLOG: updated ✅

Ready for: /commit
═══════════════════════════════════════════════════════════
```

Still update slim context and SESSION_STATE even if no solution docs were written.
