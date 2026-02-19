Extract learnings from completed work. This is NOT optional.

Usage: /compound

## Step 1: Review (2 minutes)
Quick scan: what was just implemented? (git diff --stat)

## Step 2: Five-Question Codify Checklist (5 minutes — mandatory)

Answer each question. If answer is "nothing," skip artifact creation.

Q1: What confused Claude during implementation?
    → If something: add to CLAUDE.md "Things Claude Gets Wrong"

Q2: What instruction would have prevented Claude's first mistake?
    → If something: add to relevant CLAUDE.md (root or subdirectory)

Q3: What automated check would have caught this earlier?
    → If something: add PostToolUse hook, vitest case, or lint rule

Q4: What pattern should become default for future stories?
    → If something: create docs/solutions/SOLUTION-NAME.md:
      ---
      name: pattern-name
      tags: [tag1, tag2]
      story: STORY-ID
      date: YYYY-MM-DD
      ---
      [Pattern with code examples]

Q5: Where should this learning live so it gets reused?
    → Decide: CLAUDE.md rule, solution doc, skill update, or hook

## Step 3: Error-to-Rule Pipeline
For EVERY mistake from /validate:
- Document the mistake (one sentence)
- Write the prevention rule (one sentence)
- Add to appropriate location
- Log in docs/error-log.yaml:
  ```yaml
  - date: YYYY-MM-DD
    story: STORY-ID
    error: "description"
    rule: "prevention rule"
    location: "where the rule was added"
    recurrence: 0
  ```

## Step 4: Artifact Updates (Cross-Session Persistence)
- Update docs/coverage.yaml:
  - Move story to completed list with date, time, test counts
  - Update lane counts (done/ready/blocked)
  - Recalculate metrics
- Update docs/ARCHITECTURE_DECISIONS.md:
  - Append any architectural decisions made during this story
- Update SESSION_STATE.md:
  - Set phase to "Complete"
  - Write handoff: "STORY-ID completed. [1-2 sentence summary]. Next: /pull"
  - Clear "Context Files to Read on Resume" (next session picks new story)
- Git: git add -A && git commit -m "feat(STORY-ID): description"

## Step 5: Recurrence Check (monthly — skip if not end of month)
If end of month: review docs/error-log.yaml
- Any error with recurrence > 0? Rewrite or move the rule.
- Target: < 5% recurrence rate.
