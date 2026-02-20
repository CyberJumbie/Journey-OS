# STORY-IA-43: PDF Export

**Epic:** E-31 (LCME Report Export)
**Feature:** F-14
**Sprint:** 39
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-31-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to export a formatted compliance report as PDF so that I can share it with LCME reviewers during site visits and accreditation reviews.

## Acceptance Criteria
- [ ] PDF generation from snapshot data
- [ ] Report structure: cover page, executive summary, standard-by-standard breakdown, evidence appendix
- [ ] Cover page: institution name, report date, overall compliance score
- [ ] Executive summary: compliance overview, key strengths, areas for improvement
- [ ] Per-standard section: standard description, element table with compliance status
- [ ] Evidence appendix: condensed evidence chains per element
- [ ] Color-coded compliance badges in PDF (met=green, partial=yellow, unmet=red)
- [ ] API endpoint: GET /api/compliance/snapshots/:id/export/pdf
- [ ] PDF rendered server-side (@react-pdf/renderer)
- [ ] File size: < 10MB for typical institution
- [ ] Download as file with name: "LCME_Compliance_Report_{institution}_{date}.pdf"
- [ ] Loading state while PDF generates (may take 10-30 seconds)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/institution/AccreditationReports.tsx` | `apps/web/src/components/molecules/export-pdf-button.tsx` | Prototype shows report list with download actions. Extract download button with loading state. Remove `C` color constants and font refs. Remove `useBreakpoint`, `useNavigate`, `useLocation`. Use design tokens for status badges. Add progress indicator during generation. Create server-side PDF template. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/compliance/export.types.ts` |
| Service | apps/server | `src/modules/compliance/services/pdf-export.service.ts` |
| Template | apps/server | `src/modules/compliance/services/pdf-templates/report-template.ts` |
| Template | apps/server | `src/modules/compliance/services/pdf-templates/cover-page.ts` |
| Template | apps/server | `src/modules/compliance/services/pdf-templates/standard-section.ts` |
| Template | apps/server | `src/modules/compliance/services/pdf-templates/evidence-appendix.ts` |
| Controller | apps/server | `src/modules/compliance/controllers/snapshot.controller.ts` (extend) |
| Route | apps/server | `src/modules/compliance/routes/snapshot.routes.ts` (extend) |
| View - Button | apps/web | `src/components/molecules/export-pdf-button.tsx` |
| Hook | apps/web | `src/hooks/use-pdf-export.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/pdf-export.service.test.ts` |
| Tests | apps/server | `src/modules/compliance/__tests__/report-template.test.ts` |

## Database Schema
No new tables. Reads from `compliance_snapshots` table (IA-39).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/snapshots/:id/export/pdf` | institutional_admin | Generate and download PDF report |

Response: `Content-Type: application/pdf` with `Content-Disposition: attachment; filename="LCME_Compliance_Report_..."` header.

## Dependencies
- **Blocked by:** S-IA-31-1 (snapshot data for PDF content)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (8)
1. GET /compliance/snapshots/:id/export/pdf returns PDF content-type
2. PDF contains cover page with institution name and score
3. PDF contains standard-by-standard breakdown
4. PDF contains evidence appendix
5. Compliance badges are color-coded
6. Filename format matches specification
7. Non-existent snapshot returns 404
8. Unauthorized user gets 403

## Implementation Notes
- Recommend `@react-pdf/renderer` for server-side PDF generation (React-based templates)
- Alternative: Puppeteer rendering of HTML template to PDF (heavier but more flexible)
- PDF template follows institutional branding; design tokens for colors and fonts
- Large reports may take 10-30 seconds to generate; use async job with progress notification
- Consider caching generated PDFs in Supabase Storage for repeated downloads
- Prototype shows AccreditationReports page with multiple report types (LCME, ACGME, NBME) and download buttons
- Production focuses on LCME compliance PDF from snapshot data
- Private fields with `#` syntax, constructor DI per architecture rules
