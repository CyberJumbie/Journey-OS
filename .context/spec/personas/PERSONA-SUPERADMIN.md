---
name: "(Journey OS Team)"
role: superadmin
lane: universal
sources:
  - "ARCHITECTURE_v10 §4.1 (Role Hierarchy)"
  - "API_CONTRACT_v1 §Institutions & Waitlist"
  - "SUPABASE_DDL_v1 §user_profiles CHECK constraint"
  - "DESIGN_SPEC §SuperAdmin routes"
---

## Pain Points
- Must vet institution applications manually before granting platform access
- Needs cross-institution visibility for system health monitoring

## Key Workflows
1. Review institution waitlist (`GET /api/v1/waitlist?status=pending`) — ARCHITECTURE_v10 §4.1
2. Approve/reject institutions (`POST /api/v1/waitlist/:id/approve`) — creates institution + sends invitation email — API_CONTRACT_v1 §Institutions
3. Manage all institutions (`GET /api/v1/institutions`) — API_CONTRACT_v1 §Institutions
4. System-wide health monitoring — ARCHITECTURE_v10 §14

## Data Needs
- Waitlist queue with pending institution applications
- Institution list with status (waitlisted, approved, suspended)
- System-wide health metrics
- Cross-institution user management

## Permissions
- Full platform access, bypasses institution scoping
- Approve/reject institutions from waitlist
- Manage all users across all institutions (`GET /api/v1/users`, `PATCH /api/v1/users/:id`)
- RLS bypass: `"SuperAdmin sees all"` policy on all tenant tables
- JWT: `{ role: "superadmin" }`
- Routes: `/super/dashboard`, `/super/waitlist`, `/super/institutions`, `/super/system`

## Test Account
Not defined in source docs. SuperAdmin is the Journey OS product team — provisioned outside normal registration flow.
