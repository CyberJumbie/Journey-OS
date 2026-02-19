# Sprint 1 — Stories

**Stories:** 4
**Epics:** E-16

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-U-16-1 | Framework Data Models | universal | S |
| 2 | S-U-16-2 | Seed Script Infrastructure | universal | S |
| 3 | S-U-16-3 | USMLE Seed Data | universal | M |
| 4 | S-U-16-4 | Remaining Framework Seeds | universal | M |

## Sprint Goals
- Establish taxonomy framework data models in Neo4j and Supabase with dual-write support
- Build reusable seed script infrastructure for deterministic data loading
- Seed all framework data (USMLE systems, Bloom's taxonomy, competency frameworks) as foundational reference data

## Entry Criteria
- Development environment provisioned (Supabase, Neo4j, monorepo tooling)
- Database schemas initialized and migration tooling operational

## Exit Criteria
- All framework data models pass schema validation tests
- Seed scripts run idempotently and populate all required taxonomy nodes
- USMLE systems and remaining frameworks queryable via repository layer
