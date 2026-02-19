---
name: adapt
description: "Invoke when running /adapt to refactor a Figma Make prototype into production-grade code. Covers the full refactoring pipeline: component restructuring, framework conversion, design system compliance, data wiring, and production requirements."
---

# Skill: Figma Make → Production Adaptation

## When to Use Figma Make
- New page layouts with unfamiliar composition
- Brand-heavy screens where visual exploration saves time
- Complex responsive behavior to validate before coding
- Screens where stakeholder visual approval is needed

## When to Skip (Code Directly from Brief)
- CRUD screens following established patterns
- Backend-heavy stories with minimal UI
- Iteration on existing screens
- Data tables, forms, and list views
- Screens closely matching existing templates

## The /adapt Pipeline

### Step 1: Read Inputs
- `.figma-make/STORY-ID/` — raw React prototype
- Story brief — data model, API contracts, component specs
- Figma MCP (if available) — design tokens, component hierarchy

### Step 2: Restructure Components
Map prototype elements to the project's component architecture.
If using Atomic Design:
- Identify atoms (buttons, inputs, badges, icons)
- Identify molecules (search bars, card headers, nav items)
- Identify organisms (data tables, editors, panels, forms)
- CHECK existing component library FIRST — reuse, don't duplicate
- Create new components only when no existing match

### Step 3: Convert to Framework Patterns
Adapt to whatever the project uses (detect from code standards):
- **Next.js**: Server Components (default), Client Components (interactivity only),
  next/image, next/link, App Router conventions
- **React SPA**: Router patterns, state management, code splitting
- **Other**: Follow the project's code standards doc

### Step 4: Replace Styling
- Inline styles → design system utilities (Tailwind, CSS modules, etc.)
- Hardcoded colors → design tokens
- Hardcoded spacing → spacing scale
- Hardcoded fonts → typography config
- Raw HTML → component library primitives (shadcn, MUI, etc.)

### Step 5: Wire Data Layer
- Props interfaces from brief's TypeScript section
- API calls from brief's API contract section
- Loading states (skeleton, spinner, or Suspense)
- Error states (error boundary, inline error)
- Empty states (when data is absent)

### Step 6: Add Production Requirements
- TypeScript strict (no `any`)
- Accessibility (ARIA labels, keyboard nav, focus management)
- Responsive (mobile-first breakpoints)
- Performance (lazy loading, code splitting)
- Named exports only
- Design tokens only (no hardcoded values)

### Step 7: Cleanup
- Delete `.figma-make/STORY-ID/`
- Claude Code now owns all frontend files for this story
- All subsequent UI changes are direct edits, no Figma round-trip

## Figma Design Conventions for Optimal Output
Advise designers to follow:
- Auto Layout on every frame (translates to Flexbox/Grid)
- Semantic naming with hierarchy: `Atoms/Button/Primary/Default`
- Figma Variables for all theme values
- All component states defined (default, hover, active, disabled, loading, error)
