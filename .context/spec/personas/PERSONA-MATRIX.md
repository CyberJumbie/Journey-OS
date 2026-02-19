# Journey OS — Persona Capability Matrix

| Capability | SuperAdmin | Institutional Admin | Faculty | Faculty (CD) | Advisor | Student |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Content** | | | | | | |
| Upload syllabus/lectures | - | Y | Y | Y | - | - |
| Generate single question | - | Y | Y | Y | - | - |
| Generate bulk questions | - | Y | - | Y | - | - |
| Review/approve questions | - | Y | Y | Y | - | - |
| Refine via AI chat | - | Y | Y | Y | - | - |
| Assemble exams | - | Y | Y | Y | - | - |
| **Curriculum** | | | | | | |
| Manage courses | - | Y | - | Y | - | - |
| Manage ILOs | - | Y | - | - | - | - |
| SLO→ILO FULFILLS approval | - | Y | - | Y | - | - |
| Map ILO to frameworks | - | Y | - | Y | - | - |
| Verify TEACHES edges | - | Y | Y | Y | - | - |
| **Administration** | | | | | | |
| Approve institutions | Y | - | - | - | - | - |
| Manage users (own institution) | - | Y | - | - | - | - |
| Manage users (all institutions) | Y | - | - | - | - | - |
| Seed frameworks | - | Y | - | - | - | - |
| Data integrity monitoring | - | Y | - | - | - | - |
| **Compliance** | | | | | | |
| LCME compliance reports | - | Y | Y | Y | - | - |
| Blueprint coverage view | - | Y | Y | Y | - | - |
| **Student Features** | | | | | | |
| Adaptive practice | - | - | - | - | - | Y |
| View own mastery | - | - | - | - | - | Y |
| View student mastery (cohort) | - | Y | - | - | Y | - |
| At-risk alerts (receive) | - | - | - | - | Y | Y |
| Log interventions | - | - | - | - | Y | - |
| **Analytics** | | | | | | |
| Course analytics | - | Y | Y | Y | - | - |
| Personal analytics | - | - | Y | Y | - | Y |
| Cohort analytics | - | Y | - | - | Y | - |
| System-wide health | Y | - | - | - | - | - |

---

## Primary Screen Per Persona

| Persona | Primary Screen | Template | Route |
|---|---|---|---|
| SuperAdmin | Super Dashboard | Admin Shell | `/super/dashboard` |
| Institutional Admin | Admin Dashboard | Template B (Admin Shell) | `/admin` |
| Faculty | Faculty Dashboard | Template A (Dashboard Shell) | `/dashboard` |
| Faculty (Course Director) | Faculty Dashboard + Review Queue | Template A | `/dashboard`, `/generate` |
| Advisor | Cohort At-Risk Dashboard | TBD (Tier 2) | TBD |
| Student | Student Dashboard | Template A (Student App) | `/dashboard` (apps/student) |

---

## Data Access Level

| Persona | Scope | RLS Boundary | App |
|---|---|---|---|
| SuperAdmin | All institutions | No RLS restriction | `apps/web` |
| Institutional Admin | Own institution | `institution_id` | `apps/web` |
| Faculty | Own institution, own courses | `institution_id` | `apps/web` |
| Advisor | Own institution, assigned cohort | `institution_id` | `apps/web` |
| Student | Own institution, own data only | `institution_id` + `user_id` | `apps/student` |

---

## Persona Lane Mapping

| Lane | Priority | Personas | Tier |
|---|---|---|---|
| universal | P0 | (infrastructure, auth, shared) | 0 |
| superadmin | P1 | SuperAdmin | 0–1 |
| institutional_admin | P2 | Dr. Kenji Takahashi | 0–1 |
| faculty | P3 | Dr. Amara Osei | 0–1 |
| student | P4 | Marcus Williams | 2 |
| advisor | P5 | Fatima Al-Rashid | 2 |
