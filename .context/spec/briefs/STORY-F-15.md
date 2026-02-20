# STORY-F-15: Field Mapping UI

**Epic:** E-24 (Legacy Import Pipeline)
**Feature:** F-11
**Sprint:** 17
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-24-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a field mapping interface to assign columns from my legacy file to Journey OS fields so that the import correctly interprets my data format.

## Acceptance Criteria
- [ ] Upload step: drag-and-drop file upload with format auto-detection
- [ ] Preview step: show first 5 rows of parsed data in a table
- [ ] Mapping step: dropdown selectors to map source columns to target fields
- [ ] Target fields: stem, vignette, answer_choices (A-E), correct_answer, rationale, difficulty, tags, course
- [ ] Auto-mapping: suggest mappings based on column header similarity (Levenshtein distance)
- [ ] Validation: required fields marked, error shown if unmapped
- [ ] Mapping presets: save column mapping for reuse with similar files
- [ ] Confirmation step: summary of mapping with row count before import
- [ ] 8-12 API tests: file upload, preview generation, mapping validation, preset save/load
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/uploads/FacultyQuestionUpload.tsx` (field mapping section) | `apps/web/src/app/(protected)/faculty/import/page.tsx` | Convert from React Router to Next.js App Router. Extract wizard steps into separate components. Use shadcn/ui Stepper for wizard navigation. Replace inline styles with design tokens. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/import/mapping.types.ts` |
| View | apps/web | `src/app/(protected)/faculty/import/page.tsx` |
| Components | apps/web | `src/components/import/file-upload-zone.tsx`, `src/components/import/data-preview.tsx`, `src/components/import/field-mapper.tsx`, `src/components/import/import-summary.tsx`, `src/components/import/import-wizard.tsx` |
| Hooks | apps/web | `src/hooks/use-import-wizard.ts` |
| Controller | apps/server | `src/controllers/import/import-upload.controller.ts` |
| Service | apps/server | `src/services/import/mapping.service.ts` |
| Tests | apps/server | `src/controllers/import/__tests__/import-upload.controller.test.ts` |

## Database Schema

### Supabase -- `import_presets` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK -> auth.users |
| `name` | varchar(255) | NOT NULL |
| `mapping` | jsonb | NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/import/upload` | Faculty+ | Upload file for preview |
| POST | `/api/v1/import/preview` | Faculty+ | Generate preview from uploaded file |
| POST | `/api/v1/import/validate-mapping` | Faculty+ | Validate field mapping |
| POST | `/api/v1/import/execute` | Faculty+ | Execute import with mapping |
| GET | `/api/v1/import/presets` | Faculty+ | List user's mapping presets |
| POST | `/api/v1/import/presets` | Faculty+ | Save mapping preset |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-3 (parsers exist to generate preview data)
- **Cross-lane:** None

## Testing Requirements
### API Tests (8-12)
1. Upload file returns preview data (first 5 rows)
2. Auto-mapping suggests correct mappings for obvious headers
3. Validate mapping returns errors for unmapped required fields
4. Validate mapping succeeds with all required fields mapped
5. Execute import with valid mapping creates parsed questions
6. Execute import with invalid mapping returns validation error
7. Save mapping preset persists to database
8. Load mapping preset returns saved mapping
9. File upload with unsupported format returns error
10. Preview step handles malformed data gracefully

## Implementation Notes
- Multi-step wizard pattern: Upload -> Preview -> Map -> Confirm -> Import. See `docs/solutions/multi-step-wizard-pattern.md`.
- Auto-mapping heuristic: Levenshtein distance between column headers and target field names.
- Mapping presets stored per user in Supabase `import_presets` table.
- File upload to Supabase Storage temp bucket; cleaned up after import completes or 24h TTL.
- shadcn/ui Stepper component for wizard navigation.
- Support drag-and-drop reordering in mapper for answer choices (A-E ordering).
- When constructing PostgREST `.or()` filter strings with user input, escape `%`, `_`, `,`, and `.` characters.
- See existing `apps/server/src/controllers/import/import-upload.controller.ts` for current controller.
