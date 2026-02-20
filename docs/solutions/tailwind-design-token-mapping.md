---
name: tailwind-design-token-mapping
tags: [tailwind, design-tokens, css, theming, style-audit]
story: ui-style-audit
date: 2026-02-20
---
# Tailwind Design Token Mapping

## Problem
The codebase accumulated hardcoded Tailwind gray-scale classes (`bg-gray-200`, `text-gray-700`) and hex values (`#2b71b9`, `#002c76`) that don't match the MSM brand palette. The design system uses warm-toned tokens defined in `apps/web/src/app/globals.css` via Tailwind v4's `@theme inline {}`.

## Solution

### Gray-Scale Replacement Map

| Tailwind Gray Class | Design Token Replacement | Usage |
|---|---|---|
| `bg-gray-50` | `bg-parchment` | Nested surfaces, table headers |
| `bg-gray-100` | `bg-parchment` | Skeleton loading, badges |
| `bg-gray-200` | `bg-warm-gray` | Skeleton placeholders, progress tracks |
| `bg-gray-300` | `bg-border` | Inactive dots, dividers |
| `border-gray-200` | `border-border-light` | Table/card borders |
| `border-gray-300` | `border-border` | Input borders, button borders |
| `text-gray-900` | `text-text-primary` | Primary text, headings |
| `text-gray-700` | `text-text-secondary` | Body text, descriptions |
| `text-gray-600` | `text-text-secondary` | Secondary descriptions |
| `text-gray-500` | `text-text-muted` | Labels, timestamps, hints |
| `text-gray-400` | `text-text-muted` | Placeholder text, icons |
| `text-gray-300` | `text-border-light` | Subtle separators |
| `hover:bg-gray-50` | `hover:bg-parchment` | Row/button hover states |
| `hover:bg-gray-100` | `hover:bg-parchment` | Button hover states |
| `hover:text-gray-700` | `hover:text-text-secondary` | Link hover states |

### Hex Color Replacement Map

| Hex / Arbitrary Value | Design Token | Usage |
|---|---|---|
| `bg-[#f5f3ef]` | `bg-cream` | Page backgrounds |
| `bg-[#faf9f6]`, `bg-[#faf8f5]` | `bg-parchment` | Card surfaces |
| `text-[#002c76]`, `bg-[#002c76]` | `text-navy-deep`, `bg-navy-deep` | Headings, primary CTAs |
| `text-[#2b71b9]`, `bg-[#2b71b9]` | `text-blue-mid`, `bg-blue-mid` | Links, accents, buttons |
| `bg-[#69a338]` | `bg-green` | Success states |
| `focus:border-[#2b71b9]` | `focus:border-blue-mid` | Input focus rings |
| `focus:ring-[#2b71b9]` | `focus:ring-blue-mid` | Input focus rings |

### Semantic Color Replacements

| Tailwind Default | Design Token | Usage |
|---|---|---|
| `text-red-500/600` | `text-error` | Error text |
| `bg-red-600` | `bg-error` | Destructive buttons |
| `bg-red-50`, `bg-red-100` | `bg-error/5`, `bg-error/10` | Error backgrounds |
| `border-red-200` | `border-error/20` | Error borders |
| `bg-green-100 text-green-800` | `bg-green/10 text-green` | Success badges |
| `bg-blue-100 text-blue-800` | `bg-blue-mid/10 text-blue-mid` | Info badges |
| `bg-blue-600` | `bg-blue-mid` | Primary buttons |

### Font Stack

| Element | Class | Notes |
|---|---|---|
| Headings (h1-h3) | `font-serif` | Lora — always on heading elements |
| Body text | `font-sans` | Source Sans 3 — default body font |
| Labels, timestamps, badges | `font-mono text-[10px] uppercase tracking-wider` | DM Mono — ALWAYS with `uppercase tracking-wider` |

### Three-Sheet Surface Hierarchy

```
cream (desk/background) → white (cards) → parchment (nested elements/inputs)
```

- Page backgrounds: `bg-cream`
- Card surfaces: `bg-white` with `border border-border-light`
- Nested elements inside cards: `bg-parchment`

## Exceptions

### Recharts SVG Props
Recharts `stroke` and `fill` attributes cannot use CSS custom properties. Keep hex values with a token comment:
```tsx
<Line stroke="#69a338" /* token: --color-green */ />
<Bar fill="#002c76" /* token: --color-navy-deep */ />
```

### Inline Style Color Constants
Dashboard components that use `style={{ background: C.green }}` for non-SVG dynamic rendering should use CSS custom properties:
```tsx
style={{ background: "var(--color-green)" }}
```

### CSS var() Fallbacks in Inline Styles
Components using inline `style` props (where Tailwind classes can't be used) should use CSS custom properties with hex fallbacks:
```tsx
style={{ color: "var(--color-error, #dc2626)" }}
```

## When to Use
- Any new UI component in `apps/web`
- Any style modification or audit
- When reviewing PRs that touch component styling

## When Not to Use
- Files in `.context/source/05-reference/` (read-only prototypes)
- Recharts SVG primitives (use hex + token comment)
- `packages/ui` atoms that need to be theme-agnostic
