Break a feature into shippable increments (epics).

Usage: /epic FEATURE-ID (e.g., /epic F-01)

## Steps

1. Read the feature definition from .context/spec/features/F-NN.md
2. Read all user flows for this feature from .context/spec/user-flows/
3. Use RLM to read architecture and roadmap docs for sprint structure
4. Produce 2-5 epics:

   .context/spec/epics/E-NN-$NAME.md:
   ```markdown
   # E-NN: [Epic Name]

   **Feature:** F-NN
   **Estimated Sprints:** 1-3
   **Sprint Assignment:** Sprint N-M

   ## Definition of Done
   [What's true when this epic ships — testable criteria]

   ## User Flows Enabled
   - UF-NN: [flow name] — enabled after this epic
   - UF-NN: [flow name] — partially enabled (steps 1-5 only)

   ## Story Preview
   (Refined during /decompose)
   - Story: [rough title] — [rough scope]
   - Story: [rough title] — [rough scope]
   - ...

   ## Source References
   - [DOC § Section]
   ```

5. Update .context/spec/maps/FEATURE-EPIC-MAP.md

WAIT for human review.
