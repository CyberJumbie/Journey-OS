Generate screen requirements for a story's UI.

Usage: /screen-req STORY-ID

1. Read story brief from .context/spec/stories/STORY-$ARGUMENTS-BRIEF.md
2. Use RLM to extract from design spec (if available):
   - Layout template
   - Component inventory
   - Design tokens (colors, typography, spacing)
   - Responsive breakpoints
   - Interaction patterns
3. Produce .context/spec/screen-reqs/SCR-$ARGUMENTS.md:
   - Page layout (wireframe description)
   - Component list by hierarchy level
   - States: loading, empty, error, populated
   - Responsive behavior
   - Accessibility requirements
   - Design token references
4. This document feeds into Figma Make prototyping or direct implementation
