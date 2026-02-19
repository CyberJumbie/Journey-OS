# F-18: Settings & Profile

## Description
Users manage their profile information, notification preferences, generation settings (automation level, interrupt preferences), and question templates. Help documentation provides in-app guidance. All personas have access to profile and settings; generation-specific settings are restricted to faculty roles.

## Personas
- **All Personas**: Profile editing (name, email, avatar), notification preferences.
- **Faculty**: Generation settings (automation level: Full Auto / Checkpoints / Manual), interrupt preferences, question templates.
- **Faculty (Course Director)**: Same + template management (create/share templates).

## Screens
- `Profile.tsx` — Template A, personal info, avatar upload, role display
- `Settings.tsx` — Template A, notification prefs, generation prefs, theme (future)
- `Help.tsx` — Template A, in-app documentation, FAQ, support contact
- `QuestionTemplates.tsx` — Template A, reusable TaskShell configurations for generation

## Data Domains
- **Supabase**: `user_profiles` (avatar_url, preferences JSONB), `question_templates` (user_id, name, config JSONB)
- **Supabase Storage**: Avatar images
- **API**: `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, `GET /api/v1/templates`, `POST /api/v1/templates`

## Dependencies
- **F-01**: Authentication (user context)

## Source References
- ROADMAP_v2_3.md § Sprint 16 (generation history, templates, settings)
- ROADMAP_v2_3.md § Sprint 19 (notifications + profile)
- DESIGN_SPEC.md § 5.1 Group M (6 settings & support screens)
