# STORY-F-43: SplitPane Layout

**Epic:** E-19 (Workbench UI)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 7
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-19-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a resizable split-screen workbench layout with a mode switcher so that I can efficiently toggle between generation, bulk, and review workflows within a single interface.

## Acceptance Criteria
- [ ] SplitPane component: 45% left (chat) / 55% right (context), resizable via drag handle
- [ ] Minimum pane widths enforced (300px chat, 400px context) to prevent unusable layouts
- [ ] Mode switcher tabs: Generate, Bulk, Review — each loads different panel configurations
- [ ] Responsive: collapses to stacked layout on viewport < 1024px
- [ ] Keyboard shortcut: `Cmd/Ctrl+\` toggles between chat-focused and context-focused
- [ ] Layout state persisted in localStorage (split ratio, active mode)
- [ ] WorkbenchPage template composes SplitPane with header, breadcrumb, and course context
- [ ] Loading skeleton shown while panel content hydrates
- [ ] 8-10 component tests: rendering, resize behavior, mode switching, persistence, responsive breakpoint
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/faculty/QuestWorkbench.tsx` (main layout) | `apps/web/src/app/(protected)/workbench/page.tsx` | Extract SplitPane organism and ModeSwitcher molecule; replace inline styles with Tailwind design tokens; use `react-resizable-panels` (shadcn/ui compatible); convert to named exports; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/workbench/workbench.types.ts` |
| Atoms | packages/ui | `src/atoms/split-handle.tsx`, `src/atoms/mode-tab.tsx` |
| Molecules | packages/ui | `src/molecules/mode-switcher.tsx` |
| Organisms | apps/web | `src/components/workbench/split-pane.tsx` |
| Templates | apps/web | `src/components/workbench/workbench-page.tsx` |
| Pages | apps/web | `src/app/(protected)/workbench/page.tsx` |
| Tests | apps/web | `src/components/workbench/__tests__/split-pane.test.tsx`, `src/components/workbench/__tests__/mode-switcher.test.tsx` |

## Database Schema
No database changes. Layout state persisted in localStorage.

## API Endpoints
No API endpoints. Client-side layout component only.

## Dependencies
- **Blocked by:** STORY-F-38 (SSE streaming — pipeline exists to stream from)
- **Blocks:** STORY-F-49, STORY-F-50
- **Cross-lane:** STORY-F-38 (Sprint 6 streaming)

## Testing Requirements
- 8-10 component tests: SplitPane renders with default 45/55 ratio, minimum width enforcement, mode switcher tab rendering (Generate/Bulk/Review), mode switch changes active tab and URL param, localStorage persistence of split ratio, localStorage persistence of active mode, loading skeleton display, keyboard shortcut toggle, responsive collapse below 1024px
- 0 E2E tests
- Use `afterEach(() => cleanup())` in component tests since `globals: false`.
- Mock `@journey-os/ui` with stub components to avoid transitive Radix deps in jsdom.

## Implementation Notes
- Use `react-resizable-panels` library (shadcn/ui compatible) for the split pane — NOT custom drag implementation.
- Atomic Design: `SplitHandle` and `ModeTab` are atoms, `ModeSwitcher` is a molecule, `SplitPane` is an organism.
- Mode switcher uses URL search params (`?mode=generate`) for deep-linkable modes.
- Generate mode is default; Bulk mode UI shell only (backend in STORY-F-39); Review mode connects to review features.
- Design tokens from `packages/ui` for all spacing, colors, border-radius.
- Page route: `/workbench?course=<id>&mode=generate`.
- Use `useSyncExternalStore` for mounted state instead of `useState` + `useEffect` (React 19 pattern).
- Never use inline `style={{}}` for static values — use Tailwind arbitrary values.
- Next.js App Router page requires `export default` (exception to named exports rule).
