# UF-28: System-Wide Health Monitoring

**Feature:** F-17 (Admin Dashboard & Data Integrity)
**Persona:** SuperAdmin (Journey OS Team)
**Goal:** Monitor platform health across all institutions, view system-wide metrics, and investigate cross-institution integrity issues

## Preconditions
- SuperAdmin is logged in at `/super/dashboard`
- Multiple institutions exist with active data
- Nightly Inngest jobs have run (lint + regression)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/super/dashboard` (SuperDashboard) | See system-wide KPI strip: Institutions (5), Total Users (210), Total Items (1,847), Platform Sync Health (96%) | Cross-institution aggregates |
| 2 | `/super/dashboard` | See institution table: name, status, users, items, sync health, last active | All institutions listed |
| 3 | `/super/dashboard` | Sort by sync health (ascending) — see unhealthiest institutions first | Identify problem institutions |
| 4 | `/super/dashboard` | Click on an institution with low sync health | Navigate to that institution's admin dashboard (admin impersonation view) |
| 5 | `/super/dashboard` | See system-wide lint summary: total lint errors across all institutions | Aggregate lint health |
| 6 | `/super/dashboard` | See golden dataset regression status: "48/50 items stable, 2 drifted" | Quality regression indicator |
| 7 | `/super/system` | Click "System Health" for detailed view | Service status: Supabase, Neo4j, Inngest, embedding service, LLM API |
| 8 | `/super/system` | See service latency metrics and error rates | Real-time operational health |

## Error Paths
- **Institution offline**: Step 2 — Status column shows "Degraded" with warning icon
- **Neo4j cluster issue**: Step 7 — "Neo4j: Degraded (read replica lag 45s)" warning
- **Embedding service down**: Step 7 — "Embedding Service: Down — uploads paused" alert
- **No institutions yet**: Step 2 — "No approved institutions. Check waitlist." link to waitlist

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/admin/system/health` | Step 1 — system-wide KPIs |
| GET | `/api/v1/institutions` | Step 2 — all institutions with health metrics |
| GET | `/api/v1/admin/system/services` | Step 7 — service health status |
| GET | `/api/v1/admin/integrity?scope=global` | Step 5 — cross-institution lint |

## Test Scenario (Playwright outline)
Login as: SuperAdmin
Steps:
1. Navigate to `/super/dashboard`
2. Verify system KPIs aggregate across institutions
3. Verify institution table shows all institutions
4. Navigate to system health page
Assertions:
- KPIs sum across all institutions (not scoped by institution_id)
- Institution table includes all approved institutions
- Service health shows status for each dependency

## Source References
- PERSONA-SUPERADMIN.md § Key Workflows (system-wide health monitoring)
- ARCHITECTURE_v10.md § 14 (system health)
- ROADMAP_v2_3.md § Sprint 9 (SuperAdmin polish)
