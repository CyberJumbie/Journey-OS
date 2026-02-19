# Sprint 17 — Stories

**Stories:** 4
**Epics:** E-24

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-F-24-1 | Import Parser | faculty | M |
| 2 | S-F-24-2 | Field Mapping UI | faculty | M |
| 3 | S-F-24-3 | Import Pipeline | faculty | L |
| 4 | S-F-24-4 | Import Report | faculty | S |

## Sprint Goals
- Build a legacy import parser supporting common question bank formats (QTI, CSV, DOCX)
- Deliver a field mapping UI so faculty can align imported fields to Journey OS schema
- Process imports through a validation pipeline and produce summary reports with error details

## Entry Criteria
- Sprint 16 exit criteria complete (templates, help pages operational)
- Item bank schema stable for receiving imported items

## Exit Criteria
- Parser correctly extracts items from QTI, CSV, and DOCX formats
- Faculty can map source fields to target schema via drag-and-drop UI
- Import pipeline validates, transforms, and inserts items with a downloadable report
