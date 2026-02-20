---
name: component-hex-to-token-migration-pattern
tags: [design-tokens, css-variables, hex-migration, style-refactor]
story: ui-style-audit
date: 2026-02-20
---
# Component Hex-to-Token Migration Pattern

## Problem
Components define local `const C = { navyDeep: "#002c76", ... }` objects duplicating hex values from the design system. This violates the "design tokens only" rule and creates maintenance drift when colors change.

## Solution

### Step 1: Convert shared data files first
If a `const C` object is exported and consumed by multiple files (e.g., `landing-data.ts`), convert it to `var(--color-*)` strings. All consumers auto-resolve.

```typescript
// BEFORE
export const C = { navyDeep: "#002c76", green: "#69a338" };

// AFTER
export const C = { navyDeep: "var(--color-navy-deep)", green: "var(--color-green)" };
```

### Step 2: Grep for alpha hex patterns BEFORE converting
**Critical**: Template literals like `${C.green}30` append hex opacity bytes. When `C.green` becomes `"var(--color-green)"`, the result is `"var(--color-green)30"` — broken CSS.

```bash
# Find all alpha hex patterns in consumers
grep -rn '\${C\.[a-zA-Z]*}[0-9a-fA-F]\{2\}' apps/web/src/components/
```

### Step 3: Replace alpha hex with rgba() or color-mix()

**Fixed colors** (known hex) — use `rgba()`:
```typescript
// BEFORE: ${C.navyDeep}10  (6.3% opacity)
// AFTER:
background: "rgba(0,44,118,0.063)" /* token: --navy-deep @ 6% */
```

**Dynamic colors** (variable per item) — use `color-mix()`:
```typescript
// BEFORE: ${step.color}0A  (3.9% opacity)
// AFTER:
background: `color-mix(in srgb, ${step.color} 4%, transparent)`
```

### Step 4: Fix SVG stroke/fill props
SVG presentation attributes should use hex with token comments (per architecture rules):
```tsx
// BEFORE: stroke={C.warmGray}
// AFTER:
stroke="#d7d3c8" /* token: --warm-gray */
```

### Step 5: Remove local const C, use Tailwind classes
For static colors, prefer Tailwind classes over `style={{}}`:
```tsx
// BEFORE: style={{ background: C.cream }}
// AFTER:  className="bg-cream"

// BEFORE: style={{ color: C.navyDeep }}
// AFTER:  className="text-navy-deep"
```

For conditional/dynamic colors, use `var()` in style props:
```tsx
style={{
  color: isActive ? "var(--navy-deep)" : "var(--text-muted)",
}}
```

## Alpha Hex Reference Table
| Hex suffix | Opacity | Decimal |
|------------|---------|---------|
| `08` | 3.1% | 0.031 |
| `0A` | 3.9% | 0.039 |
| `10` | 6.3% | 0.063 |
| `15` | 8.2% | 0.082 |
| `30` | 18.8% | 0.188 |
| `F0` | 94.1% | 0.941 |
| `F2` | 94.9% | 0.949 |

## When to Use
- Migrating any component from hardcoded hex to design tokens
- Converting `const C` color objects to CSS custom property references
- Replacing alpha hex patterns (`#rrggbbaa` or `${hex}aa`) with `rgba()`

## When Not to Use
- SVG stroke/fill props (keep hex with token comment)
- Third-party brand colors (Google logo, etc.)
- Recharts library props (use hex with token comment per architecture rules)
- CSS `var()` fallback values (e.g., `var(--color-green, #69a338)`) — these are intentional
