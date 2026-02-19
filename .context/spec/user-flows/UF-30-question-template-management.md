# UF-30: Question Template Management

**Feature:** F-18 (Settings & Profile)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Create, manage, and share reusable question templates (TaskShell configurations) that standardize generation parameters for consistent assessment quality

## Preconditions
- Faculty (CD) is logged in
- Has generated questions before and wants to standardize parameters
- Frameworks seeded (Bloom, USMLE for template targeting)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/settings/templates` (QuestionTemplates) | Click "Templates" in settings sidebar | See template list (may be empty) |
| 2 | `/settings/templates` | See existing templates: name, target Bloom, USMLE system, item type, created date | Template table |
| 3 | `/settings/templates` | Click "Create Template" | Template creation form opens |
| 4 | `/settings/templates` (form) | Enter template name: "Cardio Step 1 Vignette" | Name field |
| 5 | `/settings/templates` (form) | Configure: Item Type = Clinical Vignette, Bloom Level = Apply, USMLE System = Cardiovascular | Dropdown selections |
| 6 | `/settings/templates` (form) | Configure: Difficulty = Medium, Option Count = 5, Distractor Quality = High | Advanced settings |
| 7 | `/settings/templates` (form) | Add prompt template: "Generate a clinical vignette about {concept} presenting with {symptoms}" | Template text with variables |
| 8 | `/settings/templates` (form) | Click "Save Template" | Template saved to `question_templates` table |
| 9 | `/settings/templates` | New template appears in list | Success toast |
| 10 | `/settings/templates` | Click "Share" on a template | Share modal: select faculty members to share with |
| 11 | `/settings/templates` (share modal) | Select 2 faculty members, click "Share" | Template shared, recipients can use in their generation |

### Using a Template
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| U1 | `/generate` (WorkbenchPage) | Click "Use Template" button | Template picker dropdown/modal |
| U2 | `/generate` (template picker) | Select "Cardio Step 1 Vignette" | Generation parameters pre-filled: Bloom=Apply, System=Cardiovascular, etc. |
| U3 | `/generate` | Type additional context: "Focus on heart failure management" | Template + custom context merged |
| U4 | `/generate` | Generate question | Pipeline uses template parameters as constraints |

## Error Paths
- **Duplicate template name**: Step 8 — "A template with this name already exists. Use a different name."
- **Share to self**: Step 11 — Creator is excluded from share list (already owns it)
- **Template deleted while in use**: Step U2 — "This template is no longer available." fallback to manual params
- **No templates**: Step 1 — "No templates yet. Create one to standardize your question generation."
- **Not a Course Director**: Step 10 — "Share" button hidden (base faculty can use shared templates but not create/share)

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/templates` | Step 1 — fetch user's templates + shared templates |
| POST | `/api/v1/templates` | Step 8 — create template |
| PATCH | `/api/v1/templates/:id` | Edit existing template |
| POST | `/api/v1/templates/:id/share` | Step 11 — share with faculty |
| DELETE | `/api/v1/templates/:id` | Delete a template |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to `/settings/templates`
2. Create a template with Bloom=Analyze, System=Respiratory
3. Verify template appears in list
4. Navigate to `/generate`, click "Use Template"
5. Verify parameters pre-filled
Assertions:
- Template record exists in `question_templates` table
- Template config JSONB contains all specified parameters
- Workbench picks up template parameters correctly
- Shared templates visible to recipients

## Source References
- ROADMAP_v2_3.md § Sprint 16 (generation history, templates, settings)
- DESIGN_SPEC.md § 5.1 Group M (QuestionTemplates)
- WORKBENCH_SPEC_v2.md (TaskShell configurations)
- SUPABASE_DDL_v1.md § question_templates table
