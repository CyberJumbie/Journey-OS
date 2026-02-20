---
name: shadcn-brand-token-mapping
tags: [shadcn, tailwind-v4, design-tokens, css-variables, brand]
story: STORY-F-14
date: 2026-02-20
---
# shadcn/ui Brand Token Mapping

## Problem
`shadcn init` overwrites `:root` CSS variables (`--background`, `--foreground`, `--primary`, `--border`, `--card`, etc.) with a generic neutral oklch palette. Existing brand design tokens are lost.

## Solution
After running `shadcn init`, immediately remap shadcn's CSS variables to reference existing brand tokens using `var()`.

### Before (shadcn defaults)
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --card: oklch(1 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
}
```

### After (brand-mapped)
```css
:root {
  /* Brand tokens (keep these) */
  --navy-deep: #002c76;
  --ink: #1b232a;
  --parchment: #faf9f6;
  --cream: #f5f3ef;
  --error: #c9282d;
  --blue: #004ebc;

  /* shadcn tokens → brand mapping */
  --background: #ffffff;
  --foreground: var(--ink);
  --primary: var(--navy-deep);
  --primary-foreground: #ffffff;
  --secondary: var(--cream);
  --secondary-foreground: var(--ink);
  --card: var(--parchment);
  --card-foreground: var(--ink);
  --destructive: var(--error);
  --muted: var(--cream);
  --muted-foreground: var(--text-muted);
  --accent: var(--blue-pale);
  --accent-foreground: var(--navy-deep);
  --border: #e2dfd8;  /* --border token, not oklch */
  --input: var(--border);
  --ring: var(--blue);
}
```

### components.json Alias Config
shadcn auto-detected the `@web/*` path alias from tsconfig:
```json
{
  "aliases": {
    "components": "@web/components",
    "utils": "@web/lib/utils",
    "ui": "@web/components/ui",
    "lib": "@web/lib",
    "hooks": "@web/hooks"
  }
}
```

### Tailwind v4 `@theme inline` Block
shadcn adds its tokens to the `@theme inline` block automatically. Verify brand tokens are preserved alongside shadcn tokens:
```css
@theme inline {
  /* Brand tokens */
  --color-navy-deep: var(--navy-deep);
  --color-parchment: var(--parchment);

  /* shadcn tokens (auto-added by init) */
  --color-primary: var(--primary);
  --color-card: var(--card);
  --radius-lg: var(--radius);
}
```

## When to Use
- First-time shadcn init in a project with existing design tokens
- After running `shadcn init --defaults` or `shadcn init -y -d`

## When NOT to Use
- Projects without existing brand tokens (use shadcn defaults)
- Projects already using shadcn (tokens already mapped)

## Source Reference
[STORY-F-14 § shadcn installation], [MSM Brand Design Tokens § globals.css]
