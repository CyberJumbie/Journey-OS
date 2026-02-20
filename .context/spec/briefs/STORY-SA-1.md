# STORY-SA-1: Waitlist Application Form

**Epic:** E-04 (Institution Lifecycle)
**Feature:** F-02
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-04-1

---

## User Story
As a **prospective institutional admin**, I need a public application form to submit my institution's details for platform access so that my school can join the Journey OS waitlist.

## Acceptance Criteria
- [ ] Public (unauthenticated) form at `/apply`
- [ ] 3-step wizard: Step 1 (Institution Info), Step 2 (Contact Info), Step 3 (Additional Details)
- [ ] Fields: institution name, type (MD/DO/combined), accreditation body, contact name, contact email, contact phone, student count, website URL, reason for interest
- [ ] Client-side validation: required fields, email format, URL format, phone format, student count > 0, reason max 1000 chars
- [ ] Server-side validation mirrors client-side + HTML sanitization
- [ ] ApplicationService creates waitlist record with `status = 'pending'`
- [ ] DualWriteService: Supabase `applications` table first, Neo4j `Application` node second
- [ ] Confirmation page shown after successful submission with institution name and contact email
- [ ] Duplicate application detection: warn if email or institution name already pending (409 response)
- [ ] Rate limiting: max 3 applications per IP per hour (429 response)
- [ ] Progress indicator showing current step (1/2/3) with step labels
- [ ] Back/Continue navigation between steps, Submit on final step
- [ ] Loading state on submit button ("Submitting...")
- [ ] Server error display in alert banner above form
- [ ] 10 API tests: valid submission, missing fields, duplicate detection, email format, URL format, rate limiting, sanitization, status default, dual-write verification, confirmation response

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/InstitutionApplication.tsx` | `apps/web/src/app/(public)/apply/page.tsx` | Convert from React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract Input/Select/ProgressIndicator into reusable atoms/molecules. Replace hardcoded colors (C object) with CSS custom properties. Remove `useNavigate`, use Next.js `useRouter`. Convert `export default` (required for page.tsx). Extract form logic into custom hook `useApplicationForm`. Use react-hook-form + zod for validation instead of manual state management. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/institution/application.types.ts` (exists) |
| Model | apps/server | `src/models/application.model.ts` |
| Repository | apps/server | `src/repositories/application.repository.ts` |
| Service | apps/server | `src/services/institution/application.service.ts` |
| Controller | apps/server | `src/controllers/institution/application.controller.ts` |
| Routes | apps/server | `src/routes/application.routes.ts` |
| Validation | apps/server | `src/middleware/application.validation.ts` (Zod schemas) |
| View | apps/web | `src/app/(public)/apply/page.tsx` |
| Components | apps/web | `src/components/application/application-wizard.tsx`, `src/components/application/application-step-indicator.tsx`, `src/components/application/application-success.tsx` |
| Hook | apps/web | `src/hooks/use-application-form.ts` |
| Tests | apps/server | `src/controllers/institution/__tests__/application.controller.test.ts` |

## Database Schema

### Supabase — `applications` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_name` | varchar(255) | NOT NULL |
| `institution_type` | varchar(20) | NOT NULL, CHECK IN ('md', 'do', 'combined') |
| `accreditation_body` | varchar(100) | NOT NULL |
| `contact_name` | varchar(255) | NOT NULL |
| `contact_email` | varchar(255) | NOT NULL |
| `contact_phone` | varchar(50) | NULL |
| `student_count` | integer | NOT NULL, CHECK > 0 |
| `website_url` | varchar(500) | NULL |
| `reason` | text | NULL |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'approved', 'rejected') |
| `submitted_at` | timestamptz | NOT NULL, DEFAULT now() |
| `reviewed_at` | timestamptz | NULL |
| `reviewed_by` | uuid | NULL, FK -> auth.users |
| `rejection_reason` | text | NULL |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Neo4j — Application node
```
(Application {
  id: uuid,
  institution_name: string,
  institution_type: string,
  contact_email: string,
  status: string,
  submitted_at: datetime
})
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/applications` | Public (no auth) | Submit waitlist application |
| GET | `/api/v1/applications/:id/status` | Public (no auth) | Check application status by ID |

## Dependencies
- **Blocked by:** S-U-01-3 (RBAC needed for admin routes; this form is public but DualWriteService config depends on infra setup)
- **Blocks:** STORY-SA-3 (Application Review Queue)
- **Cross-lane:** None

## Testing Requirements
### API Tests (10)
1. Valid submission returns 201 with application ID
2. Missing required fields returns 422 with field-level errors
3. Duplicate email for pending application returns 409
4. Duplicate institution name for pending application returns 409
5. Invalid email format returns 422
6. Invalid URL format returns 422
7. Rate limiting returns 429 after 3 requests/IP/hour
8. HTML tags in text fields are sanitized
9. Status defaults to 'pending' on creation
10. DualWriteService creates both Supabase record and Neo4j node

## Implementation Notes
- This is a PUBLIC route; no auth middleware on the submission endpoint.
- The prototype uses a 3-step wizard with client-side step validation before proceeding. Preserve this UX pattern.
- Use react-hook-form with zod resolver for client-side validation. See `docs/solutions/react-hook-form-zod-pattern.md`.
- Zod schema with `.optional().default("")` causes type divergence -- use plain `.string().max()` validators and provide defaults via RHF's `defaultValues`.
- DualWriteService pattern: Supabase first -> Neo4j second -> `sync_status = 'synced'`.
- Rate limiting: Use express-rate-limit middleware scoped to the POST endpoint.
- Consider CAPTCHA for bot prevention (Tier 2+ enhancement, not in scope for this story).
- The prototype's `InstitutionApplication.tsx` has extensive inline styles -- convert ALL to Tailwind utility classes using design tokens. No hardcoded hex values.
- The prototype submits to `/api/v1/waitlist` -- production endpoint is `/api/v1/applications`.
