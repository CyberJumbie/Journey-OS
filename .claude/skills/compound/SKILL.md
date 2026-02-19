---
name: compound
description: "Invoke when running /compound after completing a story. Covers the 5-question codify checklist, error-to-rule pipeline, solution doc creation with YAML frontmatter, and recurrence tracking. This is NOT optional — it runs after every story."
---

# Skill: Compound Engineering

## Why This Matters
Each completed story should make subsequent stories easier to build.
Without compounding, you're doing linear work. With compounding,
you're building exponential leverage.

## The 5-Question Codify Checklist

After every completed story, answer all five:

### Q1: What confused Claude during implementation?
Look at: false starts, wrong approaches, re-implementations.
If something confused Claude, add it to the "Things Claude Gets Wrong"
section of the appropriate CLAUDE.md file.

Example rule: "Neo4j relationship types use SCREAMING_SNAKE_CASE,
not camelCase. Always: TEACHES_VERIFIED, never: teachesVerified."

### Q2: What instruction would have prevented the first mistake?
Not the fix — the prevention. What should CLAUDE.md have said
so the mistake never happened?

Example: "When creating dual-stored entities, always set sync_status
in the same transaction as the Supabase insert."

### Q3: What automated check would have caught this earlier?
Could a hook, lint rule, or test have caught it before /validate?

Options:
- PostToolUse hook (runs after every file write)
- New vitest test case (runs during /validate Pass 1)
- ESLint custom rule (runs automatically)
- Pre-commit check

### Q4: What pattern should become the default?
Is there a reusable pattern worth capturing?

Create: `docs/solutions/SOLUTION-NAME.md` with YAML frontmatter:
```yaml
---
name: dual-write-pattern
tags: [dual-write, supabase, neo4j, sync-status]
story: STORY-6.3
date: 2026-03-15
---
# Dual-Write Pattern
[The pattern, with code examples]
```

### Q5: Where should this learning live?
Decide the best location for discoverability:
- Root CLAUDE.md — repo-wide rules (< 300 lines total)
- Subdirectory CLAUDE.md — package-specific rules
- Skill file — domain-specific knowledge
- Solution doc — reusable pattern with examples
- Hook script — automated enforcement
- Error log — tracking only

## Error-to-Rule Pipeline

For EVERY mistake found during /validate:

```yaml
# docs/error-log.yaml
errors:
  - date: 2026-03-15
    story: STORY-6.3
    error: "Used default export in new component"
    rule: "Named exports only"
    location: "Root CLAUDE.md → Architecture Rules"
    recurrence: 0
```

Steps:
1. Document the mistake (one sentence)
2. Write the prevention rule (one sentence)
3. Add rule to the appropriate location
4. Log in docs/error-log.yaml
5. Set recurrence to 0

## Monthly Recurrence Review
Review error-log.yaml monthly. For any error with recurrence > 0:
- The rule isn't working → rewrite more clearly
- The rule is in the wrong location → move it
- The rule needs enforcement → convert to a hook

Target: < 5% recurrence rate across all rules.

## Solution Doc Standards
All solution docs must have:
- YAML frontmatter (name, tags, story, date)
- Problem statement (1-2 sentences)
- Solution (with code examples)
- When to use / when not to use
- Source reference [DOC § Section] if applicable
