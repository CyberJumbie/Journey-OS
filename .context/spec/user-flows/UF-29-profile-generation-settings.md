# UF-29: Profile & Generation Settings

**Feature:** F-18 (Settings & Profile)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** Edit personal profile, configure notification preferences, and set generation automation level (Full Auto / Checkpoints / Manual)

## Preconditions
- Faculty is logged in
- User profile exists in `user_profiles`

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | (any page) | Click avatar/name in header | Dropdown: "Profile", "Settings", "Help", "Sign Out" |
| 2 | `/profile` (Profile) | See personal info: name, email, role badge, institution, avatar | Profile page loads |
| 3 | `/profile` | Click "Edit" | Fields become editable: first name, last name |
| 4 | `/profile` | Change avatar: click avatar circle, upload new image | Image uploaded to Supabase Storage, avatar_url updated |
| 5 | `/profile` | Click "Save" | Profile updated, success toast |
| 6 | `/settings` (Settings) | Click "Settings" in sidebar or header dropdown | Settings page with sections |
| 7 | `/settings` | **Notification Preferences** section: toggle notifications per type | Checkboxes: Generation Complete, Review Needed, Gap Alerts, Batch Done |
| 8 | `/settings` | Toggle off "Gap Alerts" | Preference saved to `user_profiles.preferences` JSONB |
| 9 | `/settings` | **Generation Settings** section: select automation level | Radio buttons: Full Auto (critic decides), Checkpoints (pause at key points), Manual (review everything) |
| 10 | `/settings` | Select "Checkpoints" | Generation pipeline will pause at critic score step for human review |
| 11 | `/settings` | **Interrupt Preferences**: configure when AI pauses for input | Toggle: "Pause before generating options", "Pause for blueprint review" |
| 12 | `/settings` | Click "Save Settings" | All preferences persisted |

### Help
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| H1 | `/help` (Help) | Click "Help" in sidebar | In-app documentation |
| H2 | `/help` | Browse FAQ sections: Getting Started, Generation, Review, Coverage | Expandable FAQ items |
| H3 | `/help` | Click "Contact Support" | Support form or email link |

## Error Paths
- **Avatar too large**: Step 4 — "Image must be under 5MB. Please resize and try again."
- **Invalid image format**: Step 4 — "Please upload JPG, PNG, or WebP format."
- **Save fails**: Step 5 — "Failed to save profile. Please try again." with retry
- **Email change not allowed**: Step 3 — Email field is read-only (change requires auth flow)

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/users/me` | Step 2 — fetch profile |
| PATCH | `/api/v1/users/me` | Step 5 — update profile fields |
| PATCH | `/api/v1/users/me` | Step 12 — update preferences JSONB |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Navigate to `/profile`
2. Edit first name, save
3. Navigate to `/settings`
4. Toggle a notification preference
5. Change automation level to "Manual"
6. Save and verify persistence
Assertions:
- Profile update persisted in user_profiles
- Preferences JSONB updated with notification toggles
- Automation level saved (affects generation pipeline behavior)
- Avatar upload creates file in Supabase Storage

## Source References
- ROADMAP_v2_3.md § Sprint 16 (settings, templates)
- ROADMAP_v2_3.md § Sprint 19 (notifications + profile)
- DESIGN_SPEC.md § 5.1 Group M (Profile, Settings, Help)
- SUPABASE_DDL_v1.md § user_profiles (preferences JSONB)
