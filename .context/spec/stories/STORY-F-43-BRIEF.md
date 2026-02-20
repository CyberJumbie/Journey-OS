# STORY-F-43 Brief: SplitPane Layout

## 0. Lane & Priority

```yaml
story_id: STORY-F-43
old_id: S-F-19-1
lane: faculty
lane_priority: 3
within_lane_order: 43
sprint: 7
size: M
depends_on:
  - STORY-F-38 (faculty) — SSE Streaming Integration (pipeline exists to stream from)
blocks: []
personas_served: [faculty]
epic: E-19 (Workbench UI)
feature: F-09 (AI Generation)
user_flow: UF-19 (Workbench)
```

## 1. Summary

Build a **resizable split-screen workbench layout** with a mode switcher that enables faculty to toggle between Generate, Bulk, and Review workflows within a single interface. The left pane (45%) is the chat/interaction pane and the right pane (55%) is the context/preview pane, resizable via a drag handle with minimum width enforcement. The layout collapses to stacked on viewports < 1024px, supports a `Cmd/Ctrl+\` keyboard shortcut for pane focus toggle, and persists split ratio and active mode in localStorage. The workbench page composes the SplitPane with header, breadcrumb, and course context.

Key constraints:
- **Atomic Design** — SplitHandle and ModeTab are atoms, ModeSwitcher is a molecule, SplitPane is an organism
- Use `react-resizable-panels` library (shadcn/ui compatible)
- Minimum pane widths: 300px chat, 400px context
- Mode switcher uses URL search params (`?mode=generate`) for deep-linkable modes
- Design tokens only (no hardcoded styles)
- Page route: `/workbench?course=<id>&mode=generate`

## 2. Task Breakdown

1. **Types** — Create `WorkbenchMode`, `PaneConfig`, `WorkbenchState`, `WorkbenchPageProps` in `packages/types/src/workbench/workbench.types.ts`
2. **Atoms** — `SplitHandle` drag handle and `ModeTab` tab component in `packages/ui`
3. **Molecule** — `ModeSwitcher` tab bar with Generate, Bulk, Review tabs
4. **Organism** — `SplitPane` resizable two-pane layout with min-width enforcement
5. **Template** — `WorkbenchPage` composing SplitPane with header, breadcrumb, course context
6. **Page** — `/workbench` page with default export, reading `course` and `mode` from search params
7. **LocalStorage persistence** — Save/restore split ratio and active mode
8. **Keyboard shortcut** — `Cmd/Ctrl+\` toggles pane focus
9. **Responsive** — Collapse to stacked layout on viewport < 1024px
10. **API tests** — 9 tests for rendering, resize, mode switching, persistence, responsive breakpoint

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/workbench/workbench.types.ts

/** Workbench mode options */
export type WorkbenchMode = "generate" | "bulk" | "review";

/** Pane configuration */
export interface PaneConfig {
  readonly id: string;
  readonly defaultSizePercent: number;
  readonly minSizePixels: number;
}

/** Persisted workbench state (localStorage) */
export interface WorkbenchPersistedState {
  readonly splitRatio: number;       // Left pane percentage (0-100)
  readonly activeMode: WorkbenchMode;
  readonly lastCourseId?: string;
}

/** Workbench page search params */
export interface WorkbenchSearchParams {
  readonly course?: string;
  readonly mode?: WorkbenchMode;
}

/** Mode tab configuration */
export interface ModeTabConfig {
  readonly mode: WorkbenchMode;
  readonly label: string;
  readonly icon: string;             // Lucide icon name
  readonly disabled?: boolean;
  readonly tooltip?: string;
}

/** Default mode tab configurations */
export const MODE_TABS: readonly ModeTabConfig[] = [
  { mode: "generate", label: "Generate", icon: "Sparkles" },
  { mode: "bulk", label: "Bulk", icon: "Layers" },
  { mode: "review", label: "Review", icon: "CheckSquare" },
] as const;

/** Split pane layout constants */
export const PANE_DEFAULTS = {
  LEFT_PANE_DEFAULT: 45,
  RIGHT_PANE_DEFAULT: 55,
  LEFT_PANE_MIN_PX: 300,
  RIGHT_PANE_MIN_PX: 400,
  RESPONSIVE_BREAKPOINT: 1024,
  STORAGE_KEY: "journey-workbench-state",
} as const;
```

## 4. Database Schema (inline, complete)

No database needed. Layout state is persisted in localStorage only.

```sql
-- No migration required for this story.
-- Workbench layout state stored in browser localStorage.
```

## 5. API Contract (complete request/response)

No API endpoints in this story. The workbench is a client-side layout component. It will consume the SSE streaming endpoint from STORY-F-38 when in "generate" mode, but that integration is wired in downstream stories.

## 6. Frontend Spec

### Page: `/workbench` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/faculty/workbench/page.tsx`

**Component hierarchy:**
```
WorkbenchPage (page.tsx — default export)
  └── WorkbenchTemplate (template)
        ├── WorkbenchHeader
        │     ├── Breadcrumb (Dashboard > Workbench)
        │     ├── CourseSelector (dropdown for active course)
        │     └── ModeSwitcher (molecule)
        │           └── ModeTab (atom) x3 (Generate, Bulk, Review)
        └── SplitPane (organism)
              ├── SplitHandle (atom — drag handle)
              ├── LeftPane (chat/interaction)
              │     └── [Mode-specific content — shell only in this story]
              └── RightPane (context/preview)
                    └── [Mode-specific content — shell only in this story]
```

**States:**
1. **Loading** — Skeleton panes while content hydrates
2. **Generate Mode** — Left: chat input shell, Right: context preview shell
3. **Bulk Mode** — Left: batch config shell, Right: progress shell ("Coming soon" in this story)
4. **Review Mode** — Left: review queue shell, Right: item detail shell ("Coming soon" in this story)
5. **Responsive** — Stacked layout (chat above context) on viewport < 1024px

**Design tokens:**
- Surface: White (#ffffff) panes on Cream (#f5f3ef) background
- Drag handle: Navy Deep (#002c76) with 2px width, hover state with 4px width
- Mode tabs: Active = Navy Deep (#002c76) background with white text, Inactive = transparent with Navy text
- Typography: Source Sans 3
- Spacing: 24px pane padding, 8px between panes (handle area)
- Border-radius: 8px on pane containers
- Shadows: `shadow-sm` on panes

**Interactions:**
- **Resize:** Drag handle between panes; horizontal on desktop, disabled on mobile
- **Mode switch:** Click tab or use URL `?mode=generate|bulk|review`
- **Keyboard:** `Cmd/Ctrl+\` toggles between maximizing left and right pane
- **Persist:** Split ratio and mode saved to localStorage on change, restored on mount

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/workbench/workbench.types.ts` | Types | Create |
| 2 | `packages/types/src/workbench/index.ts` | Types | Create (barrel export) |
| 3 | `packages/ui/src/atoms/split-handle.tsx` | Atom | Create |
| 4 | `packages/ui/src/atoms/mode-tab.tsx` | Atom | Create |
| 5 | `packages/ui/src/molecules/mode-switcher.tsx` | Molecule | Create |
| 6 | `apps/web/src/components/workbench/split-pane.tsx` | Organism | Create |
| 7 | `apps/web/src/components/workbench/workbench-page.tsx` | Template | Create |
| 8 | `apps/web/src/app/(dashboard)/faculty/workbench/page.tsx` | Page | Create |
| 9 | `apps/web/src/__tests__/workbench/split-pane.test.tsx` | Tests | Create |
| 10 | `apps/web/src/__tests__/workbench/mode-switcher.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-38 | faculty | NOT STARTED | SSE streaming endpoint must exist (pipeline to stream from in generate mode) |
| STORY-U-10 | universal | **DONE** | Dashboard routing and layout for faculty role |

### NPM Packages (to install)
- `react-resizable-panels` — shadcn/ui-compatible resizable panel library
- Already installed: `lucide-react`, `@radix-ui/react-*` (via shadcn/ui)

### Existing Files Needed
- `apps/web/src/app/(dashboard)/faculty/layout.tsx` — Faculty dashboard layout
- `packages/ui/src/` — Existing shadcn/ui components and design tokens
- `apps/web/src/lib/` — Utility functions

## 9. Test Fixtures (inline)

```typescript
// Mock search params
export const MOCK_SEARCH_PARAMS_GENERATE = {
  course: "course-uuid-1",
  mode: "generate" as const,
};

export const MOCK_SEARCH_PARAMS_BULK = {
  course: "course-uuid-1",
  mode: "bulk" as const,
};

// Mock persisted state
export const MOCK_PERSISTED_STATE = {
  splitRatio: 45,
  activeMode: "generate" as const,
  lastCourseId: "course-uuid-1",
};

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(JSON.stringify(MOCK_PERSISTED_STATE)),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// Mock course data for selector
export const MOCK_COURSES = [
  { id: "course-uuid-1", name: "Cardiovascular Pathology" },
  { id: "course-uuid-2", name: "Neuroanatomy" },
];

// Mock resize event
export const createResizeEvent = (ratio: number) => ({
  sizes: [ratio, 100 - ratio],
});
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/web/src/__tests__/workbench/split-pane.test.tsx`

```
describe("SplitPane")
  ✓ renders left and right panes with default 45/55 split
  ✓ enforces minimum pane widths (300px left, 400px right)
  ✓ persists split ratio to localStorage on resize
  ✓ restores split ratio from localStorage on mount
  ✓ collapses to stacked layout on viewport < 1024px
```

**File:** `apps/web/src/__tests__/workbench/mode-switcher.test.tsx`

```
describe("ModeSwitcher")
  ✓ renders Generate, Bulk, and Review tabs
  ✓ highlights active mode tab based on URL search param
  ✓ updates URL search param on tab click
  ✓ persists active mode to localStorage
```

**Total: ~9 tests** (5 split-pane + 4 mode-switcher)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Generation Workbench flow is complete (generate mode + SSE streaming + review).

## 12. Acceptance Criteria

1. SplitPane: 45% left (chat) / 55% right (context), resizable via drag handle
2. Minimum pane widths enforced: 300px chat, 400px context
3. Mode switcher tabs: Generate, Bulk, Review — each loads different panel configurations
4. Responsive: collapses to stacked layout on viewport < 1024px
5. Keyboard shortcut: `Cmd/Ctrl+\` toggles between chat-focused and context-focused
6. Layout state persisted in localStorage (split ratio, active mode)
7. WorkbenchPage template composes SplitPane with header, breadcrumb, and course context
8. Loading skeleton shown while panel content hydrates
9. URL search params `?mode=generate` for deep-linkable modes
10. All ~9 tests pass
11. Named exports only (except page.tsx default export), TypeScript strict, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| 45/55 split ratio | S-F-19-1 § Acceptance Criteria: "45% left (chat) / 55% right (context)" |
| react-resizable-panels | S-F-19-1 § Notes: "Use react-resizable-panels library" |
| Atomic design levels | S-F-19-1 § Notes: "SplitHandle and ModeTab are atoms, ModeSwitcher is molecule, SplitPane is organism" |
| URL search params for modes | S-F-19-1 § Notes: "Mode switcher uses URL search params" |
| Page route | S-F-19-1 § Notes: "/workbench?course=<id>&mode=generate" |
| Min pane widths | S-F-19-1 § Acceptance Criteria: "300px chat, 400px context" |
| Responsive breakpoint | S-F-19-1 § Acceptance Criteria: "viewport < 1024px" |

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000 with faculty dashboard layout
- **No Supabase needed** for this story (layout-only)
- **No Neo4j needed** for this story
- **No Express needed** for this story (client-side only)

## 15. Figma / Make Prototype

**Desktop Layout (>= 1024px):**
```
┌────────────────────────────────────────────────────┐
│ Header: Breadcrumb | CourseSelector | ModeSwitcher  │
├────────────────────┬───┬───────────────────────────┤
│                    │ ▐ │                            │
│   Left Pane (45%)  │ ▐ │    Right Pane (55%)        │
│   Chat/Interaction │ ▐ │    Context/Preview         │
│                    │ ▐ │                            │
│                    │ ▐ │                            │
├────────────────────┴───┴───────────────────────────┤
│ [Generate] [Bulk] [Review]  ← Mode tabs (Navy/#002c76) │
└────────────────────────────────────────────────────┘
```

**Mobile Layout (< 1024px):**
```
┌──────────────────────────┐
│ Header + ModeSwitcher     │
├──────────────────────────┤
│ Top: Chat/Interaction     │
│ (50% viewport height)    │
├──────────────────────────┤
│ Bottom: Context/Preview   │
│ (50% viewport height)    │
└──────────────────────────┘
```

**Colors:** Cream (#f5f3ef) background, White (#ffffff) panes, Navy Deep (#002c76) drag handle and active tab, Green (#69a338) for status indicators.
