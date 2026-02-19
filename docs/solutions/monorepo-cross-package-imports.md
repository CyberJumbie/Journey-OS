---
name: monorepo-cross-package-imports
tags: [monorepo, typescript, vitest, project-references, path-aliases]
story: STORY-U-1, STORY-U-2
date: 2026-02-19
---
# Monorepo Cross-Package Imports

## Problem
In a pnpm workspace monorepo, `apps/server` needs to import from `packages/types`.
Relative paths (`../../../../packages/types/src/...`) break in vitest. TypeScript's
`rootDir: "src"` conflicts with path aliases that resolve outside `src/`.

## Solution

### 1. Types package uses `composite: true`

```json
// packages/types/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  }
}
```

### 2. Server references types via project references + path aliases

```json
// apps/server/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@journey-os/types": ["../../packages/types/src"],
      "@journey-os/types/*": ["../../packages/types/src/*"]
    }
  },
  "references": [{ "path": "../../packages/types" }]
}
```

### 3. Vitest resolves via aliases (not relative paths)

```typescript
// apps/server/vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      "@journey-os/types": path.resolve(__dirname, "../../packages/types/src"),
      "@test/fixtures": path.resolve(__dirname, "../../packages/types/src/frameworks/__tests__"),
    },
  },
});
```

### 4. Build types before typechecking server

```bash
pnpm --filter @journey-os/types exec tsc --build
pnpm --filter @journey-os/server exec tsc --noEmit
```

## When to use
Every time a workspace package imports from another workspace package.

## When NOT to use
Single-package repos or when importing only types (use `import type` which
doesn't need runtime resolution).
