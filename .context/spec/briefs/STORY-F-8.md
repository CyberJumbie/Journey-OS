# STORY-F-8: Help & FAQ Pages

**Epic:** E-39 (Templates & Help)
**Feature:** F-18
**Sprint:** 16
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-39-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need help and FAQ pages with searchable documentation so that I can find answers to common questions about the platform without external support.

## Acceptance Criteria
- [ ] Help page with categorized documentation sections
- [ ] FAQ accordion with expandable question/answer pairs
- [ ] Categories: Getting Started, Generation, Review, Templates, Item Bank, Analytics
- [ ] Search functionality: client-side text search across all FAQ entries
- [ ] Contextual help links: pages link to relevant FAQ section
- [ ] Content managed as static JSON (no CMS needed)
- [ ] Responsive layout with sidebar navigation on desktop
- [ ] 3-5 API tests: FAQ list endpoint, search, category filter
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/help/Help.tsx` | `apps/web/src/app/(protected)/help/page.tsx` | Convert from React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract FAQ accordion, search, and sidebar into separate components. Use shadcn/ui Accordion component. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| View | apps/web | `src/app/(protected)/help/page.tsx`, `src/app/(protected)/help/faq/page.tsx` |
| Components | apps/web | `src/components/help/faq-accordion.tsx`, `src/components/help/help-search.tsx`, `src/components/help/help-sidebar.tsx` |
| Content | apps/web | `src/content/help/faq.json` |
| Tests | apps/web | `src/components/help/__tests__/faq-accordion.test.tsx` |

## Database Schema
No database schema changes. FAQ content is static JSON.

## API Endpoints
No server-side endpoints. FAQ data is loaded from static JSON at build time or client-side.

## Dependencies
- **Blocks:** None
- **Blocked by:** None
- **Cross-lane:** None

## Testing Requirements
### Component Tests (3-5)
1. FAQ accordion renders all categories
2. Search filters FAQ entries by keyword match
3. Category filter shows only matching category
4. Empty search shows all entries
5. Contextual help link scrolls to correct FAQ section

## Implementation Notes
- FAQ content can be seeded from common support questions during beta.
- Search uses simple client-side text matching -- no need for full-text search engine.
- Consider adding a "Was this helpful?" feedback mechanism on each FAQ entry (future enhancement).
- Contextual help: `?` icon on pages opens relevant FAQ section in a drawer.
- shadcn/ui Accordion component for FAQ items.
- Design tokens for sidebar navigation, accordion styling, search input.
- Help page URL: `/help` and `/help/faq`.
