# Sprint 3 — Stories

**Stories:** 21
**Epics:** E-01, E-02, E-04, E-06, E-07, E-17

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-U-01-1 | Supabase Auth Setup | universal | S |
| 2 | S-U-01-2 | Express Auth Middleware | universal | M |
| 3 | S-U-01-3 | RBAC Middleware | universal | M |
| 4 | S-U-01-4 | Role-Based Dashboard Routing | universal | S |
| 5 | S-U-02-1 | Registration Wizard | universal | L |
| 6 | S-U-02-2 | Invitation Acceptance Flow | universal | M |
| 7 | S-U-02-3 | Persona Onboarding Screens | universal | M |
| 8 | S-U-02-4 | Email Verification Gate | universal | S |
| 9 | S-SA-04-1 | Waitlist Application Form | superadmin | M |
| 10 | S-SA-04-2 | Application Review Queue | superadmin | M |
| 11 | S-SA-04-3 | Approval Workflow | superadmin | M |
| 12 | S-SA-04-4 | Rejection Workflow | superadmin | S |
| 13 | S-SA-07-1 | Global User Directory | superadmin | M |
| 14 | S-SA-07-2 | User Reassignment | superadmin | M |
| 15 | S-IA-06-1 | User List & Invitation | institutional_admin | L |
| 16 | S-IA-06-2 | Role Assignment & CD Flag | institutional_admin | M |
| 17 | S-IA-06-3 | User Deactivation | institutional_admin | S |
| 18 | S-IA-17-1 | Framework List Page | institutional_admin | M |
| 19 | S-IA-17-2 | Hierarchy Tree View | institutional_admin | M |
| 20 | S-IA-17-3 | Framework Search | institutional_admin | S |
| 21 | S-IA-17-4 | Setup Wizard Step | institutional_admin | S |

## Sprint Goals
- Deliver end-to-end authentication infrastructure (Supabase Auth, Express middleware, RBAC, role routing)
- Enable institution onboarding via waitlist application, approval/rejection, and user registration workflows
- Provide per-institution user management and framework browsing UI for institutional admins

## Entry Criteria
- Sprint 1 exit criteria complete (framework seeds loaded, data models operational)
- Supabase Auth project configured with email provider

## Exit Criteria
- Users can register, verify email, and land on role-appropriate dashboards
- Superadmins can review, approve, and reject institution applications
- Institutional admins can invite users, assign roles, deactivate accounts, and browse frameworks
- All auth and RBAC middleware pass API test suites
