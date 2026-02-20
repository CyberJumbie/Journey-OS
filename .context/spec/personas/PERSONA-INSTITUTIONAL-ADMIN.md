---
name: "Dr. Kenji Takahashi"
role: institutional_admin
lane: institutional_admin
priority: P2
tier: "1"
sources:
  - "PRODUCT_BRIEF §Personas (Dr. Kenji Takahashi)"
  - "ARCHITECTURE_v10 §4.1 (Role Hierarchy)"
  - "DESIGN_SPEC §Admin Template B, §Admin Dashboard, §LCME Compliance"
  - "API_CONTRACT_v1 §Users, §Institutions"
  - "SUPABASE_DDL_v1 §user_profiles"
---

## Pain Points
- Cannot answer "are we covering LCME Standard 7?" without weeks of manual aggregation — PRODUCT_BRIEF §Personas
- Student at-risk data arrives too late and too coarse (quarterly spreadsheets) — PRODUCT_BRIEF §Personas
- No programmatic way to prove curriculum quality to accreditors — PRODUCT_BRIEF §Personas
- Faculty assessment quality varies with no institutional standard — PRODUCT_BRIEF §Personas

## Key Workflows
1. System onboarding: setup wizard (institution structure, Layer 1 seeding) — DESIGN_SPEC §AdminOnboarding
2. Framework management: seed and manage USMLE, LCME, ACGME, EPA, Bloom, Miller — DESIGN_SPEC §FrameworkManagement
3. Faculty management: create users, assign roles, manage permissions — DESIGN_SPEC §FacultyManagement, API_CONTRACT_v1 §Users
4. Knowledge graph browsing: explore SubConcepts, relationships — DESIGN_SPEC §KnowledgeBrowser
5. ILO management: create, edit, map to frameworks — DESIGN_SPEC §ILOManagement
6. Data integrity monitoring: orphan detection, sync status — DESIGN_SPEC §DataIntegrityDash
7. FULFILLS review queue: approve/reject SLO→ILO mappings — DESIGN_SPEC §FULFILLSReviewQueue
8. LCME compliance reporting: heatmap, drill-down, evidence links — DESIGN_SPEC §LCMEComplianceHeatmap

## Data Needs
- Admin dashboard KPI strip: System Health, Active Users, Coverage %, Data Integrity Score
- Faculty table with activity metrics
- Recent operations log
- LCME compliance summary (element status by standard)
- Framework node counts and import status
- Knowledge graph structure visualization

## Permissions
- Manages all users within institution (create, role-change, disable)
- Full read access to all institutional data
- Can configure institution-level settings
- Generate questions (single and bulk)
- Review queue management, SLO→ILO approval
- RLS scoped by `institution_id`
- Cannot access SuperAdmin areas (waitlist, cross-institution)
- JWT: `{ role: "institutional_admin", institution_id }`
- Routes: `/admin`, `/admin/users`, `/admin/data-integrity`, `/admin/frameworks` + all faculty routes
- Sidebar style: Template B (Admin Shell), `greenDark` left-border active item
- Color identifier: `blueMid` #2b71b9

## Test Account
Not explicitly defined. API_CONTRACT_v1 uses placeholder examples only.
