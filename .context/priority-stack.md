# Journey OS — Document Priority Stack

**Purpose:** When two documents conflict, the higher-priority document wins.
**Rule:** Edit this file to override defaults. The manifest respects this order.

---

## Priority Order (highest → lowest)

| Priority | Role | Documents | Rationale |
|----------|------|-----------|-----------|
| 1 | **schema** | NODE_REGISTRY_v1, SUPABASE_DDL_v1, API_CONTRACT_v1 | Ground truth for data shapes. Code must match exactly. |
| 2 | **architecture** | ARCHITECTURE_v10, WORKBENCH_SPEC_v2 | System design decisions. Overrides older reference docs. |
| 3 | **process** | CODE_STANDARDS, CLAUDE_MD_TEMPLATE, SEED_VALIDATION_SPEC_v1, DEPLOYMENT_GUIDE | How to build. Governs implementation patterns. |
| 4 | **reference** | DESIGN_SPEC, Seeding Blueprint, E2E Colab Plan, Traceability, Screen JSX | Deep detail. Authoritative for their domain but defers to schema/arch on conflicts. |
| 5 | **product** | PRODUCT_BRIEF, ROADMAP_v2_3, COST_MODEL | What to build and when. Informs priorities, not implementation details. |
| 6 | **orientation** | 00-START-HERE | Onboarding summary. Defers to all other docs on specifics. |

---

## Conflict Resolutions

| ID | Conflict | Winner | Loser |
|----|----------|--------|-------|
| C-001 | QWEST vs Journey OS branding | ARCHITECTURE_v10 (Journey OS) | QWEST_Traceability (historical) |
| C-002 | Dual embedding vs single | E2E Colab Plan (dual embedding in production) | ARCHITECTURE_v10 (Voyage-only is superseded) |
| C-003 | Extra node types in Traceability | NODE_REGISTRY_v1 (canonical) | QWEST_Traceability (informational) |
