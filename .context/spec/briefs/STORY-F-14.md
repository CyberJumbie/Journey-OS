# STORY-F-14: Template Management Page

**Epic:** E-39 (Templates & Help)
**Feature:** F-18
**Sprint:** 16
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-39-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a template management page to list, create, edit, and preview templates so that I can organize my generation presets visually.

## Acceptance Criteria
- [ ] Template list: card grid showing template name, description, question type, sharing level, last modified
- [ ] Create template: modal/page form with all configurable fields
- [ ] Edit template: pre-populated form, saves as new version
- [ ] Preview panel: shows a sample of what the template configuration would produce
- [ ] Delete with confirmation dialog
- [ ] Filter by: sharing level, question type, course
- [ ] Search by template name
- [ ] Sharing toggle: change visibility level from template card
- [ ] Empty state with "Create your first template" CTA
- [ ] 8-12 API tests: list with filters, create, edit, delete, search
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/templates/QuestionTemplates.tsx` | `apps/web/src/app/(protected)/faculty/templates/page.tsx` | Convert from React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract TemplateCard, TemplateForm, TemplatePreview into separate components. Use shadcn/ui Card, Dialog, Form. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| View | apps/web | `src/app/(protected)/faculty/templates/page.tsx` |
| Components | apps/web | `src/components/template/template-card.tsx`, `src/components/template/template-form.tsx`, `src/components/template/template-preview.tsx`, `src/components/template/template-filters.tsx`, `src/components/template/template-list.tsx` |
| Hooks | apps/web | `src/hooks/use-templates.ts` |
| Tests | apps/web | `src/components/template/__tests__/template-management.test.tsx` |
| Controller | apps/server | `src/controllers/template/template.controller.ts` (extend with list) |
| Tests | apps/server | `src/controllers/template/__tests__/template.controller.test.ts` (extend) |

## Database Schema
No new tables. Uses existing `templates` table from STORY-F-4.

## API Endpoints
Uses existing endpoints from STORY-F-4:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/templates` | Faculty+ | List templates (filtered) |
| POST | `/api/v1/templates` | Faculty+ | Create template |
| PATCH | `/api/v1/templates/:id` | Owner | Update template |
| DELETE | `/api/v1/templates/:id` | Owner | Delete template |
| POST | `/api/v1/templates/:id/duplicate` | Faculty+ | Duplicate template |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-4 (template model and CRUD exist)
- **Cross-lane:** None

## Testing Requirements
### Component/API Tests (8-12)
1. Template list renders cards for each template
2. Create template form validates required fields
3. Edit template pre-populates form
4. Delete shows confirmation dialog
5. Filter by sharing level works
6. Filter by question type works
7. Search by name filters list
8. Empty state shown when no templates
9. Sharing toggle updates visibility
10. Template preview renders mock outline

## Implementation Notes
- Card grid layout with responsive columns: 3 on desktop, 2 on tablet, 1 on mobile.
- Template form reuses the difficulty distribution component from batch config.
- Preview generates a mock question outline (not a real LLM call) based on template params.
- Sharing level badge: lock icon (private), group icon (course), building icon (institution), globe icon (public).
- shadcn/ui Card, Dialog, and Form components.
- Design tokens for card shadows, borders, spacing.
- See `docs/solutions/react-hook-form-zod-pattern.md` for form validation.
- When testing components that import from `@journey-os/ui`, mock the entire package with `vi.mock("@journey-os/ui", ...)`.
- Use `afterEach(() => cleanup())` in component test files for jsdom cleanup.
