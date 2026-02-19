Decompose ALL epics across the entire product into stories.

Usage: /decompose-all

Prerequisite: ALL epics must exist (run /epic for every feature first).

This replaces per-sprint /decompose for the full upfront spec.
The old /decompose N still works for re-decomposing a specific sprint.

## Steps

1. Read ALL epics from .context/spec/epics/
2. Group epics by feature
3. Use RLM to read:
   - Architecture docs for all data domains
   - Schema docs for all data models
   - Code standards for patterns
   - Design spec for all screens
   - Roadmap for sprint goals and tier gates

4. For each epic, decompose into stories:
   - Each story is a vertical slice (all MVC layers)
   - Each story references: parent epic, user flow(s), persona(s)
   - Size: S/M/L (flag XL for splitting)
   - Files to create/modify
   - Dependencies on other stories (within and across epics)

5. Generate sprint groupings:
   Stories are initially grouped into logical sprints based on
   the roadmap, but the ACTUAL build order will be determined
   by /prioritize (persona lanes), not sprint numbers.

   Sprint numbers serve as rough milestones, not strict sequences.

6. Save outputs:
   - .context/spec/stories/ALL-STORIES.md (master list)
   - .context/spec/stories/SPRINT-N-STORIES.md (per sprint, for reference)
   - .context/spec/maps/FULL-DEPENDENCY-GRAPH.md

7. Report:
   - Total story count
   - Stories per epic
   - Size distribution (S/M/L)
   - Dependency graph summary
   - Any XL stories that need splitting

WAIT for human review. After approval, run /prioritize to assign
stories to persona lanes and establish build order.
