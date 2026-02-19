# Universal Lane Backlog (P0)

**Stories:** 14 | **Sizes:** S:7 M:5 L:2
**Status:** All pending

Infrastructure, auth, shared services — no single persona owns these.

---

## Ordered Backlog

| # | New ID | Old ID | Epic | Size | Title | Blocked By | Unblocks |
|---|--------|--------|------|------|-------|------------|----------|
| 1 | STORY-U-1 | S-U-01-1 | E-01 | S | Supabase Auth Setup | — | U-3, U-5, U-8, U-9, U-10, U-14 |
| 2 | STORY-U-2 | S-U-16-1 | E-16 | S | Framework Data Models | — | U-4, U-7 |
| 3 | STORY-U-3 | S-U-01-2 | E-01 | M | Express Auth Middleware | U-1 | U-6, U-8, U-9, U-10, U-14 |
| 4 | STORY-U-4 | S-U-16-2 | E-16 | S | Seed Script Infrastructure | U-2 | U-7, U-12 |
| 5 | STORY-U-5 | S-U-03-1 | E-03 | S | Forgot Password Flow | U-1 | U-11 |
| 6 | STORY-U-6 | S-U-01-3 | E-01 | M | RBAC Middleware | U-3 | SA-1..3, IA-1/5/6, F-1/2/5..7/12/21/33, ST-1/2 |
| 7 | STORY-U-7 | S-U-16-3 | E-16 | M | USMLE Seed Data | U-2, U-4 | U-12 |
| 8 | STORY-U-8 | S-U-02-1 | E-02 | L | Registration Wizard | U-1, U-3 | U-13, U-14, F-5, ST-2 |
| 9 | STORY-U-9 | S-U-02-2 | E-02 | M | Invitation Acceptance Flow | U-1, U-3, **[X]SA-5** | U-13 |
| 10 | STORY-U-10 | S-U-01-4 | E-01 | S | Role-Based Dashboard Routing | U-1, U-3 | — |
| 11 | STORY-U-11 | S-U-03-2 | E-03 | S | Password Reset Page | U-5 | — |
| 12 | STORY-U-12 | S-U-16-4 | E-16 | M | Remaining Framework Seeds | U-2, U-4, U-7 | IA-3/6/9/10 |
| 13 | STORY-U-13 | S-U-02-3 | E-02 | M | Persona Onboarding Screens | U-8, U-9 | IA-20 |
| 14 | STORY-U-14 | S-U-02-4 | E-02 | S | Email Verification Gate | U-1, U-3, U-8 | — |

**[X]** = cross-lane dependency

---

## Critical Path Notes

- **STORY-U-6 (RBAC Middleware)** is the single most-blocked story in the system — 12+ stories across SA, IA, F, and ST lanes depend on it directly.
- **STORY-U-12 (Framework Seeds)** gates the IA coverage analytics subsystem.
- **STORY-U-9** has a cross-lane dependency on SA-5 (Approval Workflow) — invitation acceptance requires approved institutions.
