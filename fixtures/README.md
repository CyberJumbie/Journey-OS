# Test Fixtures

Place test PDF files here for smoke testing the ingestion pipeline.

## Files needed
- `test-syllabus.pdf` — anonymized MSM MEDI-531 syllabus (ask team for this)
- `test-syllabus-simple.pdf` — single-column baseline PDF (no tables)

These files are gitignored (may contain institutional information).
The ingestion smoke test in scripts/smoke-test-ingestion.ts references these files.
