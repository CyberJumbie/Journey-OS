# F-02: Institution Management

## Description
SuperAdmin manages the institution lifecycle: reviewing waitlist applications, approving or rejecting institutions, and sending invitation emails to designated institutional admins. This is the gateway for multi-tenancy — no institution can use the platform without SuperAdmin approval.

## Personas
- **SuperAdmin**: Reviews waitlist applications, approves/rejects, monitors all institutions, sends invitations.

## Screens
- `SuperDashboard.tsx` — Template B (Admin Shell), system-wide KPIs, institution list, waitlist count
- `SetupWizard.tsx` — Template B, institution initial configuration (used by Inst Admin post-approval)

## Data Domains
- **Supabase**: `institutions` (name, domain, status, tier, created_at), `waitlist_applications` (name, email, institution_name, status, reviewed_by)
- **Neo4j**: `(:Institution)` node — skinny node for graph traversal
- **API**: `GET /api/v1/institutions`, `POST /api/v1/institutions`, `GET /api/v1/waitlist`, `PATCH /api/v1/waitlist/:id` (approve/reject)
- **RLS**: SuperAdmin bypasses institution_id scoping; all other roles restricted

## Dependencies
- **F-01**: Authentication must exist for SuperAdmin login

## Source References
- PRODUCT_BRIEF.md § Go-to-Market (MSM first, then multi-institution)
- ARCHITECTURE_v10.md § 2 (Four-Layer Hybrid — Institution as Layer 1 root)
- ROADMAP_v2_3.md § Sprint 3 (SuperAdmin waitlist flow)
- ROADMAP_v2_3.md § Sprint 9 (SuperAdmin polish)
- API_CONTRACT_v1.md § Institutions/Waitlist endpoints
- SUPABASE_DDL_v1.md § institutions table
- NODE_REGISTRY_v1.md § Institution node type
- PERSONA-MATRIX.md § SuperAdmin capabilities
