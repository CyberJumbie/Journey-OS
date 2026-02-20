# STORY-F-49: Template Picker in Workbench

**Epic:** E-39 (Templates & Help)
**Feature:** F-18 (Settings & Profile)
**Sprint:** 16
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-39-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to select a template from the generation workbench so that I can quickly apply saved configurations without manual setup.

## Acceptance Criteria
- [ ] Template picker dropdown/dialog in workbench generation form
- [ ] Shows available templates: own + shared templates for current course
- [ ] Selecting a template populates all generation form fields
- [ ] "Clear template" button to reset to defaults
- [ ] Template name displayed as active preset indicator
- [ ] Modified indicator: shows if form values differ from applied template
- [ ] 5-8 API tests: template list for picker, apply template, clear template
- [ ] TypeScript strict, named exports only, design tokens only

## Reference Screens
> Part of QuestWorkbench.tsx (template selection panel).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/faculty/QuestWorkbench.tsx` (template selection panel) | `apps/web/src/components/generation/template-picker.tsx` | Extract TemplatePicker molecule using shadcn/ui Combobox; replace inline styles with Tailwind design tokens; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/template-picker.types.ts` |
| Service | apps/server | `src/services/template/template-picker.service.ts` |
| Controller | apps/server | `src/controllers/template/template.controller.ts` (extend with picker endpoint) |
| View | apps/web | `src/components/generation/template-picker.tsx` |
| Hooks | apps/web | `src/hooks/use-template-picker.ts` |
| Tests | apps/server | `src/services/template/__tests__/template-picker.test.ts` |

## Database Schema
No new tables. Reads from existing `templates` table (created by template management stories).

## API Endpoints

### GET /api/v1/templates/picker
**Auth:** JWT required (faculty role)
**Query Params:** `courseId` (required)
**Success Response (200):**
```json
{
  "data": {
    "myTemplates": [{ "id": "uuid", "name": "USMLE Step 1 - Cardio", "config": {...} }],
    "sharedTemplates": [{ "id": "uuid", "name": "Department Standard", "config": {...}, "sharedBy": "Dr. Smith" }]
  },
  "error": null
}
```

## Dependencies
- **Blocked by:** STORY-F-43 (workbench exists), Template management stories (templates exist — S-F-39-1)
- **Blocks:** none
- **Cross-lane:** STORY-F-43 (Sprint 7 workbench)

## Testing Requirements
- 5-8 API tests: list templates for picker (own + shared), filter by course, apply template returns config, empty template list, auth guard, template not found
- 0 E2E tests
- Mock `@journey-os/ui` with stub components in jsdom tests.

## Implementation Notes
- Picker queries templates visible to current user for current course context.
- Form population uses React Hook Form `reset()` with template values.
- Modified indicator compares current form state to applied template snapshot using deep equality.
- Template picker is a shadcn/ui Combobox with search and grouping (My Templates / Shared).
- Do not test Radix UI Combobox interactions in jsdom — test callback behavior with `fireEvent` on plain inputs.
- In client `fetch().json()`, cast response with `as` for strict TypeScript.
