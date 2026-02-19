Create implementation plan for story $ARGUMENTS.

Usage: /plan STORY-ID

## Steps

1. Read .context/spec/stories/STORY-$ARGUMENTS-BRIEF.md (the context packet)
2. Check docs/solutions/ for reusable patterns
3. Check existing codebase for files that already exist
4. Produce docs/plans/STORY-$ARGUMENTS-plan.md:

   ```markdown
   # Plan: STORY-$ARGUMENTS

   ## Tasks (from brief, with refinements)
   1. [task] → [file path]
   2. ...

   ## Implementation Order
   Types → Model → Repository → Service → Controller → View → API Tests → E2E

   ## Patterns to Follow
   - [Solution doc reference if applicable]
   - [Code standards reference]

   ## Testing Strategy
   - API tests: [list what to test]
   - E2E: [yes/no and which journey]

   ## Figma Make
   - [ ] Prototype first
   - [ ] Code directly

   ## Risks / Edge Cases
   - [identified risks]

   ## Acceptance Criteria (verbatim from brief)
   - AC1: ...
   ```

5. WAIT for human approval before implementing
