Map a persona's journey through a feature.

Usage: /user-flow FLOW-NAME

Prerequisite: The parent feature must exist in .context/spec/features/.

## Steps

1. Read the parent feature definition
2. Read relevant persona file(s) from .context/spec/personas/
3. Use RLM to read design spec and API contract (if available)
4. Produce .context/spec/user-flows/UF-NN-$ARGUMENTS.md:

   ```markdown
   # UF-NN: [Flow Name]

   **Feature:** F-NN
   **Persona:** [Role] ([Name if known])
   **Goal:** [One sentence — what the persona is trying to accomplish]

   ## Preconditions
   - [What must be true before flow starts]
   - [Logged in as X, data exists, etc.]

   ## Happy Path
   | Step | Screen/Page | Action | Expected Result |
   |------|-------------|--------|-----------------|
   | 1 | /login | Enter credentials, click Sign In | Redirected to dashboard |
   | 2 | /dashboard | Click [feature entry point] | Navigate to feature screen |
   | ... | ... | ... | ... |

   ## Error Paths
   - [What happens when: validation fails]
   - [What happens when: data is empty]
   - [What happens when: network timeout]
   - [What happens when: unauthorized]

   ## APIs Called
   | Method | Endpoint | When |
   |--------|----------|------|
   | GET | /api/v1/... | Step 2 |
   | POST | /api/v1/... | Step 4 |

   ## Test Scenario (Playwright outline)
   Login as: [persona email]
   Steps: [abbreviated happy path]
   Assertions: [key verifications]

   ## Source References
   - [DOC § Section] for each step
   ```

5. Report: flow summary, step count, APIs involved

WAIT for human review.
