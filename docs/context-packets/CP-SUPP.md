# CP-SUPP — Supplemental Stories: Unrouted/Unwired Screens
**Stories:** PSUPP-001 → PSUPP-024
**Auto-loaded by:** `/story PSUPP-0XX`

---

## Why These Exist

The prototype has 132 routes mapping to 93 components. Of these, 72+ had no story file and no backend wiring. These supplemental stories close that gap for the screens that genuinely matter.

**Not included** (intentionally left deferred): `/generate/test|quiz|handout`, `/templates`, `/bulk-operations`, `/uploads/faculty-questions`, `/faculty/communications`, `/student/support`, `/admin/announcements`, `Collaborators.tsx` orphan.

---

## Story Groups at a Glance

### Group 1: Auth & User Management (PSUPP-001 → PSUPP-005, PSUPP-024)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-001 | Invitation Accept | `/invite/accept` | Public (invited) |
| PSUPP-002 | Role Selection | `/role-selection` | Public |
| PSUPP-003 | Admin Registration | `/register/admin` | Public + access code |
| PSUPP-004 | User Profile | `/profile` | All authenticated |
| PSUPP-005 | Settings | `/settings` | All authenticated |
| PSUPP-024 | Admin Onboarding | `/onboarding/admin` | Institution Admin |

### Group 2: Course Depth (PSUPP-006 → PSUPP-010)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-006 | Week View | `/courses/:id/week/:weekId` | Faculty + Course Dir |
| PSUPP-007 | Generate from Week | `/courses/:id/week/:weekId/generate` | Faculty + Course Dir |
| PSUPP-008 | Course Ready | `/courses/:id/ready` | Faculty + Course Dir |
| PSUPP-009 | Course Roster | `/faculty/courses/:id/roster` | Faculty + Course Dir |
| PSUPP-010 | Weekly Materials Upload | `/courses/:id/week/:weekId/upload-materials` | Faculty + Course Dir |

### Group 3: Analytics Hub (PSUPP-011 → PSUPP-013)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-011 | Analytics Home | `/analytics` | Faculty + Inst Admin |
| PSUPP-012 | Per-Course Analytics | `/analytics/course/:courseId` | Faculty + Course Dir |
| PSUPP-013 | Personal Analytics | `/analytics/personal` | Faculty |

### Group 4: Question Management (PSUPP-014)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-014 | Version History | `/questions/:questionId/history` | Faculty + Course Dir |

### Group 5: Admin Institution Management (PSUPP-015 → PSUPP-018)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-015 | Institution List | `/admin/institutions` | Admin (superadmin) |
| PSUPP-016 | Institution Detail | `/admin/institutions/:id` | Admin (superadmin) |
| PSUPP-017 | Application Review Queue + Public Apply | `/admin/applications` + `/apply` | Public + Admin |
| PSUPP-018 | Framework Management | `/admin/frameworks` | Admin (superadmin) |

### Group 6: New Institutional Screens (PSUPP-019 → PSUPP-023)

| Story | Screen | Route | Role |
|-------|--------|-------|------|
| PSUPP-019 | Institutional USMLE Coverage | `/institution/usmle-coverage` | Inst Admin |
| PSUPP-020 | Faculty vs Target Coverage | `/institution/faculty-coverage` | Inst Admin |
| PSUPP-021 | Section Sequence Modeler | `/institution/sequence` | Inst Admin |
| PSUPP-022 | Institution Students List | `/institution/students` | Inst Admin |
| PSUPP-023 | Institution Courses List | `/institution/courses` | Inst Admin |

---

## Build Order Recommendation

### Immediate priority (blocks other flows)
```
PSUPP-001  (invite/accept — blocks all admin-invite onboarding)
PSUPP-002  (role-selection — blocks self-registration entry point)
PSUPP-004  (profile — used everywhere)
PSUPP-008  (course ready — end of ingestion flow)
PSUPP-006  (week view — linked from course detail dashboard)
```

### Phase 3 supplement (wire with Phase 3 stories)
```
PSUPP-011  (analytics home — navigation hub)
PSUPP-012  (course analytics — linked from course detail)
PSUPP-019  (institution USMLE coverage — NEW screen)
PSUPP-020  (faculty coverage — NEW screen)
PSUPP-021  (sequence modeler — NEW screen; prereqs needed for Phase 5 BKT)
```

### Phase 4 supplement (wire with Phase 4 stories)
```
PSUPP-003  (admin registration)
PSUPP-005  (settings)
PSUPP-007  (generate from week)
PSUPP-009  (course roster)
PSUPP-010  (weekly materials upload)
PSUPP-013  (personal analytics)
PSUPP-014  (version history — needs P4-002 editor)
PSUPP-015  (institution list)
PSUPP-016  (institution detail)
PSUPP-017  (application review queue)
PSUPP-018  (framework management)
PSUPP-022  (institution students)
PSUPP-023  (institution courses)
PSUPP-024  (admin onboarding wizard)
```

---

## New Supabase Tables Required

```sql
-- PSUPP-003
CREATE TABLE admin_access_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  used_at    TIMESTAMPTZ,
  used_by    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PSUPP-015/016
CREATE TABLE institutions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'medical_school',  -- 'medical_school' | 'residency_program' | 'hospital'
  status      TEXT DEFAULT 'active',           -- 'active' | 'trial' | 'suspended' | 'pending'
  settings    JSONB DEFAULT '{}'::jsonb,       -- coverage targets, feature flags
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- PSUPP-017
CREATE TABLE institution_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  type             TEXT,
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  contact_title    TEXT,
  student_count    INTEGER,
  reason           TEXT,
  status           TEXT DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected' | 'info_requested'
  internal_notes   TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

---

## New Neo4j Relationships

```cypher
-- PSUPP-021: Section Sequence Modeler
(SubConcept)-[:PREREQUISITE_OF]->(SubConcept)
-- Properties: { createdBy, createdAt, institutionId }
-- Constraint: no cycles allowed (BFS check before creation)
```

---

## New Backend Routes

```
# Auth
POST /api/v1/auth/register/admin              → PSUPP-003
GET  /api/v1/users/me                         → PSUPP-004
PATCH /api/v1/users/me                        → PSUPP-004
POST  /api/v1/users/me/avatar                 → PSUPP-004
GET  /api/v1/users/me/settings               → PSUPP-005
PATCH /api/v1/users/me/settings              → PSUPP-005

# Courses
GET  /api/v1/courses/:id/weeks/:weekId        → PSUPP-006
GET  /api/v1/courses/:id/ingestion-summary    → PSUPP-008
GET  /api/v1/courses/:id/roster               → PSUPP-009
POST /api/v1/courses/:id/weeks/:weekId/materials → PSUPP-010

# Analytics
GET  /api/v1/analytics/summary                → PSUPP-011
GET  /api/v1/analytics/courses/:id            → PSUPP-012
GET  /api/v1/analytics/personal               → PSUPP-013

# Items
GET  /api/v1/items/:id/versions               → PSUPP-014
POST /api/v1/items/:id/versions/:n/restore    → PSUPP-014

# Admin
GET  /api/v1/admin/institutions               → PSUPP-015
POST /api/v1/admin/institutions               → PSUPP-015
PATCH /api/v1/admin/institutions/:id          → PSUPP-015
GET  /api/v1/admin/institutions/:id           → PSUPP-016
POST /api/v1/admin/institutions/:id/impersonate → PSUPP-016
GET  /api/v1/admin/applications               → PSUPP-017
POST /api/v1/institution-applications         → PSUPP-017 (public)
PATCH /api/v1/admin/applications/:id         → PSUPP-017
GET  /api/v1/admin/frameworks                 → PSUPP-018
POST /api/v1/admin/frameworks                 → PSUPP-018
PATCH /api/v1/admin/frameworks/:id           → PSUPP-018

# Institution
GET  /api/v1/institution/usmle-coverage       → PSUPP-019
GET  /api/v1/institution/faculty-coverage     → PSUPP-020
GET  /api/v1/institution/sequence             → PSUPP-021
POST /api/v1/institution/sequence/prerequisites → PSUPP-021
DELETE /api/v1/institution/sequence/prerequisites/:id → PSUPP-021
GET  /api/v1/institution/students             → PSUPP-022
GET  /api/v1/institution/courses              → PSUPP-023
POST /api/v1/institution/courses              → PSUPP-023
```

---

## Screens Still Intentionally Deferred (Do NOT build)

| Route | Reason |
|-------|--------|
| `/generate/test`, `/generate/quiz`, `/generate/handout` | Generation unified in workbench |
| `/templates` | No spec; deferred |
| `/bulk-operations` | Handled via workbench + Inngest batch |
| `/uploads/faculty-questions` | Superseded by P4-004 legacy import |
| `/faculty/communications` | No roadmap mention |
| `/student/support` | No roadmap mention |
| `/admin/announcements` | No roadmap mention |
| `Collaborators.tsx` | Not even routed; no spec |
| `/institution/students` | Builds in PSUPP-022 but data empty until Phase 5 |
| `/institution/blueprints` | No spec; deferred to Phase 5 or beyond |
