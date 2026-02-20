---
name: landing-page-component-architecture
tags: [landing-page, marketing, sections, responsive, atomic-design]
story: reference-screen-integration
date: 2026-02-20
---
# Landing Page Component Architecture

Pattern for building multi-section marketing/landing pages with shared state and responsive design.

## Problem
Reference JSX screens use inline styles and monolithic components. Need to decompose into production Next.js components following atomic design while preserving shared state (e.g., persona tabs affecting multiple sections).

## Solution

### Structure
```
components/landing/
  landing-page.tsx        # Orchestrator (owns shared state)
  landing-nav.tsx         # Fixed nav with scroll blur
  landing-footer.tsx      # Footer
  landing-data.ts         # All static data + color constants
  reveal.tsx              # Scroll-triggered fade-in atom
  counter.tsx             # Animated number counter atom
  sections/
    hero-section.tsx      # Each section is self-contained
    problem-section.tsx
    features-section.tsx
    stats-section.tsx
    how-it-works-section.tsx
    benefits-section.tsx
    coverage-chain-section.tsx
    research-section.tsx
    waitlist-section.tsx
```

### Shared state pattern
When multiple sections need the same state (e.g., persona tabs in "How It Works" + "Benefits"):

```tsx
// Orchestrator owns state
export function LandingPage() {
  const [activePersona, setActivePersona] = useState<PersonaKey>("faculty");
  return (
    <>
      <HowItWorksSection
        key={activePersona}  // Reset internal state on change
        activePersona={activePersona}
        onPersonaChange={setActivePersona}
      />
      <BenefitsSection activePersona={activePersona} />
    </>
  );
}
```

### Data layer
All static content in a single `landing-data.ts`:
- Color constants (`C`) shared across all sections
- Persona data, features, stats, research items
- Typed exports (`PersonaKey`, `PersonaData`)

### Responsive pattern
Each section calls `useBreakpoint()` independently and computes its own padding/grid:
```tsx
const bp = useBreakpoint();
const isMobile = bp === "mobile";
const isTablet = bp === "tablet";
const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";
```

## When to use
- Marketing/landing pages with 5+ sections
- Pages where visual reference screens need to be decomposed

## When NOT to use
- Simple pages with 1-2 sections (just inline them)
- Dashboard content pages (use the dashboard shell pattern instead)
