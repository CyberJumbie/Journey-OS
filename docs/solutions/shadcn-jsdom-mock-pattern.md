---
name: shadcn-jsdom-mock-pattern
tags: [testing, jsdom, shadcn, radix, vitest, pnpm]
story: STORY-F-14
date: 2026-02-20
---
# shadcn/ui jsdom Mock Pattern

## Problem
In pnpm monorepos, Radix UI primitives (which power shadcn/ui components)
bundle their own React reference via pnpm's strict `node_modules` resolution.
This causes "Invalid hook call" errors in jsdom tests because the component's
React instance differs from `@testing-library/react`'s instance.

Radix also requires browser APIs jsdom doesn't implement (`hasPointerCapture`,
`scrollIntoView`, `ResizeObserver`), making interaction tests impossible.

## Solution
Mock all shadcn/ui components used by the component under test with simple
HTML element stubs. Mock lucide-react icons the same way.

```typescript
// Place ALL vi.mock() calls before component imports (vitest hoists them)

vi.mock("@web/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@web/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@web/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock("@web/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@web/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock("@web/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@web/components/ui/skeleton", () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

vi.mock("lucide-react", () => ({
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  // ... add all icons used by your components
}));

// Import components AFTER mocks are set up
import { MyComponent } from "@web/components/MyComponent";
```

### Key rules

1. **Always add `afterEach(() => cleanup())`** — vitest with `globals: false`
   does not auto-cleanup. DOM leaks cause "Found multiple elements" errors.

2. **Components with hooks can't be rendered even with mocks** — if the
   component itself calls `useState`/`useRef`, the dual-React issue hits the
   component, not just its children. Test the underlying logic instead:
   ```typescript
   // Instead of rendering TemplateFilters, test the debounce logic directly
   it("debounce fires after delay", () => {
     vi.useFakeTimers();
     const cb = vi.fn();
     let timer: ReturnType<typeof setTimeout> | null = null;
     function simulateSearch(v: string) {
       if (timer) clearTimeout(timer);
       timer = setTimeout(() => cb({ search: v }), 300);
     }
     simulateSearch("car");
     simulateSearch("cardio");
     vi.advanceTimersByTime(300);
     expect(cb).toHaveBeenCalledWith({ search: "cardio" });
     vi.useRealTimers();
   });
   ```

3. **Don't write userEvent interaction tests for Radix Select/Popover** —
   they require `hasPointerCapture` and `scrollIntoView` which jsdom lacks.

## When to use
- Any `apps/web` component test that imports shadcn/ui components
- Tests for organisms/templates that compose multiple shadcn primitives

## When NOT to use
- Server-side tests (no UI)
- Tests that only exercise Zod schemas or pure logic (no rendering)
- E2E tests with Playwright (real browser, no jsdom issues)
