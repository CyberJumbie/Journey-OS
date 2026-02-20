# STORY-IA-20: Setup Wizard Step

**Epic:** E-17 (Framework Browser UI)
**Feature:** F-08 (Framework Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-17-4

---

## User Story
As a **newly onboarded Institutional Admin (Dr. Kenji Takahashi)**, I need a framework import step in the setup wizard so that I can confirm which educational frameworks my institution uses during initial configuration.

## Acceptance Criteria
- [ ] Framework selection step in Institutional Admin onboarding flow
- [ ] Checkbox list of all 8 available frameworks with descriptions
- [ ] Pre-selected defaults: USMLE, LCME (most common for US medical schools)
- [ ] Selected frameworks stored in institution settings
- [ ] At least one framework must be selected (validation)
- [ ] Selected frameworks determine which framework cards appear in browser (STORY-IA-6)
- [ ] Skip option with warning: "You can configure frameworks later in settings"
- [ ] Confirmation summary before completing the step

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/SetupWizard.tsx` | `apps/web/src/app/(protected)/onboarding/steps/framework-setup.tsx` | Extract the framework selection step from the full setup wizard. Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Use react-hook-form for checkbox validation. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/institution/institution-settings.types.ts` |
| Service | apps/server | `src/services/institution/institution-settings.service.ts` |
| Controller | apps/server | `src/controllers/institution/institution-settings.controller.ts` |
| Routes | apps/server | `src/routes/institution/settings.routes.ts` |
| Page | apps/web | `src/app/(protected)/onboarding/steps/framework-setup.tsx` |
| Components | apps/web | `src/components/onboarding/framework-checklist.tsx` |
| Tests | apps/server | `src/services/institution/__tests__/institution-settings.service.test.ts` |

## Database Schema

### Supabase -- `institution_settings` table (or update existing)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions(id), UNIQUE |
| `selected_frameworks` | jsonb | NOT NULL, DEFAULT '["usmle", "lcme"]' |
| `setup_completed` | boolean | NOT NULL, DEFAULT false |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

**Note:** Verify actual table name via `list_tables` before writing DDL.

### Neo4j -- Institution node property update
```cypher
MATCH (i:Institution {id: $institutionId})
SET i.selected_frameworks = $frameworks
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/institution/settings` | InstitutionalAdmin (scoped) | Get institution settings |
| PUT | `/api/v1/institution/settings/frameworks` | InstitutionalAdmin (scoped) | Update selected frameworks |

## Dependencies
- **Blocked by:** STORY-IA-6 (Framework List Page), STORY-U-9 (onboarding flow)
- **Blocks:** None
- **Cross-lane:** STORY-U-9 (this step integrates into the universal onboarding flow)

## Testing Requirements
### API Tests (5)
- Get settings: returns current framework selection
- Update frameworks: persists new selection to institution settings
- Validation: rejects empty framework array (at least one required)
- Default selection: new institutions get USMLE + LCME pre-selected
- Auth enforcement: non-admin cannot update institution settings

## Implementation Notes
- This is a view-layer component that integrates into the onboarding flow from STORY-U-9.
- Institution settings table stores `selected_frameworks` as a JSON array of framework IDs.
- The framework browser (STORY-IA-6) should filter cards based on institution's selected frameworks.
- DualWriteService: institution settings update in Supabase first, then Neo4j institution node properties.
- Use react-hook-form for checkbox list validation (at least one checked).
- Zod schema: `z.array(z.string()).min(1, "At least one framework must be selected")`.
- Do NOT use `.optional().default()` with zod -- provide defaults via RHF `defaultValues`.
