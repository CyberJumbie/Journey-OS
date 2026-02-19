Decompose a specific sprint's epics into user stories.

Usage: /decompose N (e.g., /decompose 3)

NOTE: For full upfront spec, use /decompose-all instead. This command
is for re-decomposing a single sprint after changes, or for adding
stories discovered during development.

## Steps

1. Use RLM to read:
   - Epics assigned to Sprint N
   - Architecture sections relevant to those epics
   - Schema docs for data models involved
   - Code standards for file structure and patterns
   - Design spec for affected screens (if applicable)
   - Roadmap for sprint goals and exit criteria
   - User flows that stories must satisfy

2. Produce .context/spec/stories/SPRINT-N-STORIES.md:
   - 3-8 stories, each a vertical slice
   - Each references: parent epic, user flow(s), persona(s)
   - Dependency graph
   - Acceptance criteria (testable)
   - Estimated size (S/M/L)
   - Files to create/modify
   - Testing strategy: which are API tests, which need E2E

3. Generate .context/spec/maps/SPRINT-N-DEPENDENCY-MAP.md

4. Flag XL stories for splitting

5. If /prioritize has already run:
   - Assign new stories to lanes based on persona
   - Insert into lane backlogs at correct priority position
   - Update CROSS-LANE-DEPENDENCIES.md

WAIT for human review.
