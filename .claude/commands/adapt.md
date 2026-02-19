Refactor Figma Make prototype into production-grade code for story $ARGUMENTS.

Usage: /adapt STORY-ID

Prerequisite: Prototype copied to .figma-make/STORY-ID/

## Steps

1. Read .figma-make/STORY-ID/ (raw React from Figma Make)
2. Read .context/spec/stories/STORY-$ARGUMENTS-BRIEF.md (data model, API, components)
3. If Figma MCP available: extract design tokens and component hierarchy
4. Read project's code standards for component architecture and patterns

5. Refactor in order:

   a. RESTRUCTURE to project's component architecture
      - Map prototype elements to existing component library — REUSE first
      - Create new components only if no existing match
      - Follow project's naming and directory conventions

   b. CONVERT to project's framework patterns
      - Apply Server Components / Client Components (if Next.js)
      - Apply routing conventions
      - Apply data fetching patterns from code standards

   c. REPLACE styling with design system
      - Inline styles → utility classes or design system
      - Hardcoded values → design tokens
      - Raw HTML → component library primitives

   d. WIRE data layer
      - Props interfaces from brief
      - API calls from brief's contract
      - Loading / error / empty states

   e. ADD production requirements
      - TypeScript strict
      - Accessibility (ARIA, keyboard, focus)
      - Responsive (mobile-first)
      - Named exports only

6. Delete .figma-make/STORY-ID/ — prototype served its purpose
7. All subsequent UI work is direct edits, no Figma round-trip

OUTPUT: Production code in project's source directories
