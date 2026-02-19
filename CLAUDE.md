# Journey OS — Claude Code System Prompt

## Project
AI-powered educational OS for medical schools.
Monorepo: apps/web (Next.js 15), apps/server (Express + LangGraph.js),
packages/types, packages/ui (shadcn/ui), packages/python-api (Tier 2+).

## Context Protocol
1. Read story brief as PRIMARY input. It's self-contained.
2. Check docs/solutions/ for reusable patterns before writing new code.
3. Never load .context/source/ docs directly — use RLM or /design-query.
4. Read .context/doc-manifest.yaml for document locations and priority.
5. The brief contains lane, priority, dependencies, and blockers.

## Persona Lanes (development priority order)
1. universal (P0) — Infrastructure, auth, RBAC, shared services, seeding
2. superadmin (P1) — Platform management, multi-institution
3. institutional_admin (P2) — Institution config, programs, faculty, analytics
4. faculty (P3) — Content creation, generation workbench, curriculum mapping
5. student (P4) — Learning path, assessments, adaptive practice, progress
6. advisor (P5) — Student monitoring, interventions, alerts

## Architecture Rules
- OOP: Private fields, public getters, constructor DI.
- MVC: View → Controller → Service → Repository → Database. No skipping.
- Atomic Design: Atoms → Molecules → Organisms → Templates → Pages.
- Named exports only. No default exports.
- Custom error classes only. No raw throw new Error().
- Design tokens only. No hardcoded hex/font/spacing values.
- TypeScript strict. No `any` without JSDoc justification.
- SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix (USMLE_System).
- PascalCase for all other Neo4j labels (SubConcept, ProficiencyVariable).
- Typed relationships with direction (Course)-[:OFFERS]->(SLO).
- ILO and SLO are separate node types. Never combine them.
- All embeddings are 1024-dim (Voyage AI voyage-3-large).
- SSE for streaming generation pipeline events. Socket.io for presence only.

## Database Rules
- All Supabase operations through Supabase MCP. Never raw psql.
- All Neo4j operations through Neo4j MCP. Never raw cypher-shell.
- DualWriteService: Supabase first → Neo4j second → sync_status = 'synced'.

## Testing Rules
- API tests (70%): vitest for CRUD, auth, validation, data integrity, dual-write.
- E2E tests (30%): Playwright for 5 critical journeys only.
- Demo accounts for E2E: see .context/spec/personas/ for credentials.

## Implementation Order
Types → Model → Repository → Service → Controller → View → API Tests → E2E

## Spec Pipeline Rules
- Parallel subagents must ONLY write artifact files (stories, specs, briefs). Shared tracking files (coverage.yaml, FEATURE-EPIC-MAP.md, MEMORY.md) must ONLY be updated by the main orchestrator after all subagents complete.

## Things Claude Gets Wrong
(Updated by /compound — the error-to-rule pipeline)
- Parallel subagents each updated coverage.yaml with partial totals, causing data loss. See spec pipeline rule above.
