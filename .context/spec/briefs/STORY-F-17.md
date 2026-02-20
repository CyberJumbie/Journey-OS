# STORY-F-17: Generation Settings

**Epic:** E-38 (Profile & Preferences)
**Feature:** F-18
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-38-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need generation settings to configure my automation level preference and interrupt behavior so that the AI generation workflow matches my preferred interaction style.

## Acceptance Criteria
- [ ] Automation level selector: user-level preference (overridden by institution setting if stricter)
- [ ] Options: "Let AI handle it" (full_auto), "Pause at checkpoints" (checkpoints), "Review everything" (manual)
- [ ] Interrupt preference: "Pause before critic scoring" toggle
- [ ] Default generation parameters: preferred difficulty distribution, Bloom focus
- [ ] Settings saved to Supabase `user_preferences` JSONB
- [ ] Workbench reads these defaults on load (pre-fills generation form)
- [ ] Clear explanation of each option with expected workflow impact
- [ ] 5-8 API tests: preference CRUD, institution override logic, workbench reads defaults
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/settings/Settings.tsx` (generation section) | `apps/web/src/app/(protected)/settings/generation/page.tsx` | Extract generation settings section into standalone page. Replace inline styles with design tokens. Use shadcn/ui RadioGroup for automation level, Switch for toggles. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/generation-prefs.types.ts` |
| Service | apps/server | `src/services/user/generation-prefs.service.ts` |
| Controller | apps/server | `src/controllers/user/preferences.controller.ts` (extend) |
| View | apps/web | `src/app/(protected)/settings/generation/page.tsx` |
| Components | apps/web | `src/components/settings/generation-prefs-form.tsx` |
| Hooks | apps/web | `src/hooks/use-generation-prefs.ts` |
| Tests | apps/server | `src/services/user/__tests__/generation-prefs.test.ts` |

## Database Schema
No new tables. Settings saved as JSONB in `user_preferences` or `notification_preferences` table, or a separate `generation_preferences` row.

JSONB structure:
```json
{
  "automation_level": "checkpoints",
  "pause_before_critic": true,
  "default_difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 },
  "default_bloom_focus": ["Apply", "Analyze"]
}
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me/generation-preferences` | Authenticated | Get generation preferences |
| PATCH | `/api/v1/users/me/generation-preferences` | Authenticated | Update generation preferences |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-5 (profile page exists as settings parent)
- **Cross-lane:** None (workbench reads these preferences when built)

## Testing Requirements
### API Tests (5-8)
1. GET preferences returns current settings
2. GET preferences for new user returns defaults
3. PATCH automation level updates correctly
4. Institution override: if institution is "manual", user cannot select "full_auto"
5. Institution override: effective level = max(institution, user)
6. PATCH difficulty distribution saves JSONB correctly
7. PATCH Bloom focus saves array correctly
8. Generation prefs form renders all options

## Implementation Notes
- Institution override: if institution is set to "manual", user cannot select "full auto" -- show disabled option with explanation.
- Override logic: `effectiveLevel = max(institutionLevel, userLevel)` where manual > checkpoints > full_auto.
- Default generation params merge with template params when both exist (template takes precedence).
- Settings URL: `/settings/generation` -- tab under settings layout.
- Radio group for automation level, toggle switches for interrupt preferences.
- See `docs/solutions/react-hook-form-zod-pattern.md` for form validation.
- Zod schema: use plain `.string()` validators, provide defaults via RHF's `defaultValues`. Do not use `.optional().default("")`.
