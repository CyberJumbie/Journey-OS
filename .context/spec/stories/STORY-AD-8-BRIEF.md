# STORY-AD-8: Intervention Logging — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-8
old_id: S-AD-45-3
lane: advisor
lane_priority: 5
within_lane_order: 8
epic: E-45 (Advisor Cohort Dashboard & Interventions)
feature: F-21
sprint: 38
size: M
depends_on:
  - STORY-AD-5 (advisor) — Advisor Dashboard Page (dashboard context)
  - STORY-AD-7 (advisor) — Intervention Recommendation Engine (recommendation linkage)
blocks:
  - STORY-AD-9 — Admin Cohort Analytics (intervention data for analytics)
personas_served: [advisor, institutional_admin]
```

## 1. Summary

Build the intervention logging system that allows advisors to record interventions taken with students, track their outcomes, and maintain an auditable history. Interventions can be linked to recommendations (from STORY-AD-7) and risk flags. The system includes CRUD operations, an intervention timeline view per student, follow-up reminders, and outcome tracking (improved/no change/declined). Data is dual-written to Supabase and Neo4j for analytics.

**Parent epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Parent feature:** F-21
**User flows satisfied:** Advisor logs intervention, tracks outcome, reviews history
**Personas involved:** Advisor (primary user), Institutional Admin (analytics consumer)

**Product context:** From [ARCHITECTURE_v10 §13.4]: "Intervention tracking: Log interventions, track outcomes." This creates the audit trail for intervention effectiveness analysis.

## 2. Task Breakdown

1. Extend intervention types in `packages/types/src/advisor/intervention.types.ts`
2. Create interventions Supabase migration
3. Create intervention model in `apps/server/src/modules/advisor/models/intervention.model.ts`
4. Create intervention repository (dual-write) in `apps/server/src/modules/advisor/repositories/intervention.repository.ts`
5. Create intervention logging service in `apps/server/src/modules/advisor/services/intervention-logging.service.ts`
6. Create intervention logging controller in `apps/server/src/modules/advisor/controllers/intervention-logging.controller.ts`
7. Extend intervention routes in `apps/server/src/modules/advisor/routes/intervention.routes.ts`
8. Create intervention log form in `apps/web/src/components/advisor/intervention-log-form.tsx`
9. Create intervention timeline in `apps/web/src/components/advisor/intervention-timeline.tsx`
10. Write service tests
11. Write repository tests

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/advisor/intervention.types.ts (extend existing from STORY-AD-7)

export type InterventionType = "meeting" | "email" | "study_plan" | "tutoring_referral" | "resource_share" | "other";
export type InterventionOutcome = "pending" | "improved" | "no_change" | "declined";

export interface InterventionCreate {
  readonly student_id: string;
  readonly type: InterventionType;
  readonly action_taken: string;
  readonly date: string;  // ISO date
  readonly notes?: string;
  readonly linked_recommendation_id?: string;
  readonly linked_risk_flag_id?: string;
  readonly follow_up_date?: string;  // ISO date
}

export interface Intervention {
  readonly id: string;
  readonly advisor_id: string;
  readonly advisor_name: string;
  readonly student_id: string;
  readonly student_name: string;
  readonly institution_id: string;
  readonly type: InterventionType;
  readonly action_taken: string;
  readonly date: string;
  readonly notes: string | null;
  readonly linked_recommendation_id: string | null;
  readonly linked_risk_flag_id: string | null;
  readonly follow_up_date: string | null;
  readonly follow_up_status: InterventionOutcome;
  readonly outcome: InterventionOutcome;
  readonly outcome_notes: string | null;
  readonly graph_node_id: string | null;
  readonly sync_status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by: string;
  readonly updated_by: string | null;
}

export interface InterventionUpdate {
  readonly outcome?: InterventionOutcome;
  readonly outcome_notes?: string;
  readonly follow_up_date?: string;
  readonly follow_up_status?: InterventionOutcome;
  readonly notes?: string;
}

export interface InterventionListQuery {
  readonly student_id?: string;
  readonly type?: InterventionType;
  readonly outcome?: InterventionOutcome;
  readonly date_from?: string;
  readonly date_to?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: "date" | "created_at" | "type" | "outcome";
  readonly sort_dir?: "asc" | "desc";
}

export interface InterventionListResponse {
  readonly interventions: readonly Intervention[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

export interface InterventionTimelineEntry {
  readonly id: string;
  readonly type: InterventionType;
  readonly action_taken: string;
  readonly date: string;
  readonly outcome: InterventionOutcome;
  readonly advisor_name: string;
  readonly has_follow_up: boolean;
  readonly follow_up_date: string | null;
}
```

## 4. Database Schema (inline, complete)

### Supabase — interventions table (new migration)

```sql
-- Migration: create_interventions_table
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES auth.users(id),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    type TEXT NOT NULL CHECK (type IN ('meeting', 'email', 'study_plan', 'tutoring_referral', 'resource_share', 'other')),
    action_taken TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    linked_recommendation_id UUID,
    linked_risk_flag_id UUID REFERENCES risk_flags(id),
    follow_up_date DATE,
    follow_up_status TEXT NOT NULL DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'improved', 'no_change', 'declined')),
    outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'improved', 'no_change', 'declined')),
    outcome_notes TEXT,
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_interventions_student ON interventions (student_id, date DESC);
CREATE INDEX idx_interventions_advisor ON interventions (advisor_id, date DESC);
CREATE INDEX idx_interventions_institution ON interventions (institution_id);
CREATE INDEX idx_interventions_follow_up ON interventions (follow_up_date)
    WHERE follow_up_status = 'pending' AND follow_up_date IS NOT NULL;
CREATE INDEX idx_interventions_sync ON interventions (sync_status)
    WHERE sync_status != 'synced';

-- RLS policies
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Advisors can CRUD interventions in their institution
CREATE POLICY "interventions_advisor_all" ON interventions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = interventions.institution_id
            AND user_profiles.role IN ('advisor', 'institutional_admin', 'superadmin')
        )
    );

-- Students can read their own intervention records
CREATE POLICY "interventions_student_read" ON interventions
    FOR SELECT USING (
        interventions.student_id = auth.uid()
    );
```

### Neo4j — Intervention relationship (new)

```cypher
-- Create intervention with dual-write
CREATE (i:Intervention {
    id: $id,
    type: $type,
    action_taken: $action_taken,
    date: date($date),
    outcome: 'pending',
    created_at: datetime()
})
WITH i
MATCH (a:User {supabase_auth_id: $advisor_id})
MATCH (s:Student {supabase_auth_id: $student_id})
CREATE (a)-[:INTERVENED {intervention_id: $id, date: date($date)}]->(s)
RETURN i.id AS graph_node_id
```

### Cypher — Intervention Timeline

```cypher
-- Get intervention timeline for a student
MATCH (a:User)-[r:INTERVENED]->(s:Student {supabase_auth_id: $studentId})
RETURN r.intervention_id AS id,
       r.date AS date,
       a.display_name AS advisor_name
ORDER BY r.date DESC
```

## 5. API Contract (complete request/response)

### POST /api/v1/advisor/interventions

**Role access:** advisor (own institution), superadmin
**Auth:** Bearer token
**RBAC:** `rbac.require(AuthRole.ADVISOR, AuthRole.SUPERADMIN)`

**Request:**
```json
{
    "student_id": "student-uuid-123",
    "type": "meeting",
    "action_taken": "Met with student to discuss acid-base remediation plan. Assigned tutoring sessions.",
    "date": "2026-02-19",
    "notes": "Student seemed receptive. Will follow up next week.",
    "linked_recommendation_id": "rec-001",
    "linked_risk_flag_id": "flag-uuid-001",
    "follow_up_date": "2026-02-26"
}
```

**Response (201):**
```json
{
    "data": {
        "id": "intervention-uuid-001",
        "advisor_id": "advisor-uuid-456",
        "advisor_name": "Dr. Fatima Al-Rashid",
        "student_id": "student-uuid-123",
        "student_name": "Marcus Williams",
        "institution_id": "inst-uuid-001",
        "type": "meeting",
        "action_taken": "Met with student to discuss acid-base remediation plan. Assigned tutoring sessions.",
        "date": "2026-02-19",
        "notes": "Student seemed receptive. Will follow up next week.",
        "linked_recommendation_id": "rec-001",
        "linked_risk_flag_id": "flag-uuid-001",
        "follow_up_date": "2026-02-26",
        "follow_up_status": "pending",
        "outcome": "pending",
        "outcome_notes": null,
        "sync_status": "synced",
        "created_at": "2026-02-19T10:30:00Z",
        "updated_at": "2026-02-19T10:30:00Z",
        "created_by": "advisor-uuid-456",
        "updated_by": null
    },
    "error": null
}
```

### GET /api/v1/advisor/interventions

**Role access:** advisor (own institution), superadmin, institutional_admin

**Query params:**
- `student_id` (string, optional)
- `type` (string, optional)
- `outcome` (string, optional)
- `date_from`, `date_to` (string, optional)
- `page` (int, default=1), `limit` (int, default=20)
- `sort_by` (string, default="date"), `sort_dir` (string, default="desc")

**Response (200):**
```json
{
    "data": {
        "interventions": [
            {
                "id": "intervention-uuid-001",
                "advisor_name": "Dr. Fatima Al-Rashid",
                "student_name": "Marcus Williams",
                "type": "meeting",
                "action_taken": "Met with student to discuss acid-base remediation plan.",
                "date": "2026-02-19",
                "outcome": "pending",
                "follow_up_date": "2026-02-26",
                "created_at": "2026-02-19T10:30:00Z"
            }
        ]
    },
    "error": null,
    "meta": {"page": 1, "limit": 20, "total": 5, "total_pages": 1}
}
```

### PATCH /api/v1/advisor/interventions/:id

**Role access:** advisor (own institution)

**Request (update outcome):**
```json
{
    "outcome": "improved",
    "outcome_notes": "Student's acid-base mastery improved from 15% to 45% after 2 tutoring sessions."
}
```

**Response (200):**
```json
{
    "data": {
        "id": "intervention-uuid-001",
        "outcome": "improved",
        "outcome_notes": "Student's acid-base mastery improved from 15% to 45% after 2 tutoring sessions.",
        "updated_at": "2026-02-26T14:00:00Z",
        "updated_by": "advisor-uuid-456"
    },
    "error": null
}
```

### GET /api/v1/advisor/students/:studentId/interventions/timeline

**Role access:** advisor (own institution), superadmin

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "student_name": "Marcus Williams",
        "timeline": [
            {
                "id": "intervention-uuid-001",
                "type": "meeting",
                "action_taken": "Discussed acid-base remediation plan",
                "date": "2026-02-19",
                "outcome": "improved",
                "advisor_name": "Dr. Fatima Al-Rashid",
                "has_follow_up": true,
                "follow_up_date": "2026-02-26"
            },
            {
                "id": "intervention-uuid-002",
                "type": "tutoring_referral",
                "action_taken": "Referred to renal physiology tutoring",
                "date": "2026-02-12",
                "outcome": "pending",
                "advisor_name": "Dr. Fatima Al-Rashid",
                "has_follow_up": false,
                "follow_up_date": null
            }
        ]
    },
    "error": null
}
```

**Error responses:**
- 404: Intervention or student not found
- 403: Not authorized for this institution
- 400: Invalid intervention type, invalid outcome value
- 422: Missing required fields (student_id, type, action_taken, date)

## 6. Frontend Spec

### Component Hierarchy

```
Organism: InterventionLogForm (modal or inline form)
  ├── Molecule: FormHeader ("Log Intervention for {student_name}")
  ├── Molecule: TypeSelect (dropdown: meeting, email, study_plan, etc.)
  ├── Atom: DatePicker (intervention date)
  ├── Atom: ActionTextarea (what was done)
  ├── Atom: NotesTextarea (optional notes)
  ├── Molecule: LinkedRecommendation (optional, shows linked rec)
  ├── Atom: FollowUpDatePicker (optional)
  └── Molecule: FormActions (Cancel, Save)

Organism: InterventionTimeline
  ├── Molecule: TimelineHeader (student name, total count)
  └── Molecule: TimelineEntry (repeating, vertical timeline)
        ├── Atom: TimelineDot (color by type)
        ├── Atom: TimelineDate (mono label)
        ├── Molecule: TimelineContent
        │     ├── Atom: InterventionTypeBadge
        │     ├── Atom: ActionText
        │     ├── Atom: OutcomeBadge
        │     └── Atom: AdvisorName
        └── Atom: FollowUpIndicator (if has_follow_up)
```

### Props Interfaces

```typescript
interface InterventionLogFormProps {
  readonly studentId: string;
  readonly studentName: string;
  readonly linkedRecommendation?: InterventionRecommendation;
  readonly linkedRiskFlagId?: string;
  readonly onSubmit: (data: InterventionCreate) => void;
  readonly onCancel: () => void;
  readonly isSubmitting: boolean;
}

interface InterventionTimelineProps {
  readonly studentId: string;
  readonly timeline: readonly InterventionTimelineEntry[];
  readonly isLoading: boolean;
  readonly onUpdateOutcome: (interventionId: string, outcome: InterventionOutcome) => void;
}
```

### Design Tokens

- **Form modal:** white bg, `radius-2xl` (12px), `shadow-panel`, navyDeep/12% backdrop
- **Timeline line:** 2px `borderLight` vertical line, left-aligned
- **Timeline dot colors by type:**
  - `meeting`: `navyDeep`
  - `email`: `blueMid`
  - `study_plan`: `green`
  - `tutoring_referral`: `blueLight` (#00a8e1)
  - `resource_share`: `greenDark`
  - `other`: `warmGray`
- **Outcome badges:**
  - `pending`: `secondary` variant (parchment bg, textMuted)
  - `improved`: `success` variant (green/10% bg, greenDark)
  - `no_change`: `warning` variant (warning/10% bg, warning)
  - `declined`: `destructive` variant (danger/10% bg, danger)
- **Follow-up indicator:** `blueLight` dot with date in `mono/label-md`
- **Timeline date:** `mono/label-md/textMuted`
- **Action text:** `sans/body-sm/ink`

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/types/src/advisor/intervention.types.ts` | Types | Extended intervention types (append to AD-7 file) |
| 2 | `apps/server/src/modules/advisor/models/intervention.model.ts` | Model | Intervention domain model |
| 3 | `apps/server/src/modules/advisor/repositories/intervention.repository.ts` | Repository | Dual-write Supabase + Neo4j |
| 4 | `apps/server/src/modules/advisor/services/intervention-logging.service.ts` | Service | CRUD + outcome tracking |
| 5 | `apps/server/src/modules/advisor/controllers/intervention-logging.controller.ts` | Controller | HTTP handlers |
| 6 | `apps/server/src/modules/advisor/routes/intervention.routes.ts` | Route | Extend with logging endpoints |
| 7 | `apps/web/src/components/advisor/intervention-log-form.tsx` | Component | Log form modal/inline |
| 8 | `apps/web/src/components/advisor/intervention-timeline.tsx` | Component | Timeline visualization |
| 9 | `apps/server/src/modules/advisor/__tests__/intervention-logging.service.test.ts` | Test | Service tests |
| 10 | `apps/server/src/modules/advisor/__tests__/intervention.repository.test.ts` | Test | Repository tests |

**Supabase migration (via MCP):**
- `create_interventions_table` — creates interventions table with RLS

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-5 (Advisor Dashboard) | advisor | NOT STARTED | Dashboard context, UI integration |
| STORY-AD-7 (Recommendations) | advisor | NOT STARTED | Recommendation linkage |
| STORY-AD-4 (Risk Flags) | advisor | NOT STARTED | risk_flags table for FK |
| STORY-U-6 (RBAC) | universal | DONE | Role-based access |

### NPM Packages
- No new packages needed (uses existing form libraries, date handling)

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts`
- `apps/server/src/middleware/rbac.middleware.ts`
- Risk flags table (from STORY-AD-4)
- Recommendation engine (from STORY-AD-7) — for linked recommendations
- DualWriteService pattern reference

## 9. Test Fixtures (inline)

```typescript
export const MOCK_INTERVENTION_CREATE: InterventionCreate = {
  student_id: "student-001",
  type: "meeting",
  action_taken: "Met with student to discuss acid-base remediation plan.",
  date: "2026-02-19",
  notes: "Student seemed receptive.",
  linked_recommendation_id: "rec-001",
  linked_risk_flag_id: "flag-001",
  follow_up_date: "2026-02-26",
};

export const MOCK_INTERVENTION: Intervention = {
  id: "intervention-001",
  advisor_id: "advisor-001",
  advisor_name: "Dr. Fatima Al-Rashid",
  student_id: "student-001",
  student_name: "Marcus Williams",
  institution_id: "inst-001",
  type: "meeting",
  action_taken: "Met with student to discuss acid-base remediation plan.",
  date: "2026-02-19",
  notes: "Student seemed receptive.",
  linked_recommendation_id: "rec-001",
  linked_risk_flag_id: "flag-001",
  follow_up_date: "2026-02-26",
  follow_up_status: "pending",
  outcome: "pending",
  outcome_notes: null,
  graph_node_id: "neo4j-int-001",
  sync_status: "synced",
  created_at: "2026-02-19T10:30:00Z",
  updated_at: "2026-02-19T10:30:00Z",
  created_by: "advisor-001",
  updated_by: null,
};

export const MOCK_INTERVENTION_UPDATE: InterventionUpdate = {
  outcome: "improved",
  outcome_notes: "Mastery improved from 15% to 45% after 2 tutoring sessions.",
};

export const MOCK_TIMELINE: InterventionTimelineEntry[] = [
  {
    id: "intervention-001",
    type: "meeting",
    action_taken: "Discussed acid-base remediation plan",
    date: "2026-02-19",
    outcome: "improved",
    advisor_name: "Dr. Fatima Al-Rashid",
    has_follow_up: true,
    follow_up_date: "2026-02-26",
  },
  {
    id: "intervention-002",
    type: "tutoring_referral",
    action_taken: "Referred to renal physiology tutoring",
    date: "2026-02-12",
    outcome: "pending",
    advisor_name: "Dr. Fatima Al-Rashid",
    has_follow_up: false,
    follow_up_date: null,
  },
];

// Invalid: missing required fields
export const MOCK_INVALID_CREATE = {
  student_id: "student-001",
  // missing type, action_taken, date
};

// Invalid: bad outcome value
export const MOCK_INVALID_OUTCOME = {
  outcome: "invalid_outcome",
};
```

## 10. API Test Spec (vitest — PRIMARY)

```typescript
// apps/server/src/modules/advisor/__tests__/intervention-logging.service.test.ts
describe("InterventionLoggingService", () => {
  it("creates intervention with all required fields");
  it("creates intervention with linked recommendation");
  it("creates intervention with linked risk flag");
  it("dual-writes to Supabase then Neo4j");
  it("sets sync_status to synced after successful dual-write");
  it("keeps sync_status pending on Neo4j failure");
  it("records created_by as the authenticated advisor");
  it("updates intervention outcome (pending -> improved)");
  it("updates intervention outcome (pending -> no_change)");
  it("records updated_by and updated_at on update");
  it("resolves linked risk flag when outcome is improved");
  it("lists interventions with pagination");
  it("filters interventions by student_id");
  it("filters interventions by type");
  it("filters interventions by date range");
  it("filters interventions by outcome");
  it("returns intervention timeline for a student");
  it("timeline ordered by date descending");
  it("rejects invalid intervention type");
  it("rejects missing required fields");
  it("advisor only sees interventions in their institution");
});

// apps/server/src/modules/advisor/__tests__/intervention.repository.test.ts
describe("InterventionRepository", () => {
  it("inserts intervention record in Supabase");
  it("creates INTERVENED relationship in Neo4j");
  it("updates sync_status after Neo4j write");
  it("queries interventions with filters and pagination");
  it("queries timeline ordered by date");
});
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not a standalone critical journey. Intervention logging is covered as part of the advisor dashboard E2E in STORY-AD-5:
- Advisor expands student → views recommendations → accepts → logs intervention → updates outcome

## 12. Acceptance Criteria

1. Intervention log form captures: action taken, date, notes, linked recommendation (if any)
2. Intervention types: meeting, email, study_plan, tutoring_referral, resource_share, other
3. Outcome tracking: follow-up status (pending, improved, no_change, declined)
4. Follow-up reminder: set date for follow-up check
5. Intervention timeline per student showing all logged actions
6. Full CRUD operations for intervention records
7. Link intervention to risk flag (resolves flag on positive outcome)
8. POST/GET/PATCH /api/v1/advisor/interventions endpoints work correctly
9. Audit trail: created_by, updated_by, timestamps preserved
10. Filter interventions by student, type, date range, outcome
11. Dual-write: Supabase first → Neo4j (Advisor)-[:INTERVENED]->(Student) second
12. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| Intervention logging + outcome tracking | [ARCHITECTURE_v10 §13.4] |
| Intervention types | [S-AD-45-3 §AC] |
| DualWrite pattern | [ARCHITECTURE_v10 §15.1] |
| INTERVENED relationship | [S-AD-45-3 §Notes] |
| Follow-up reminders via E-34 | [S-AD-45-3 §Dependencies] |
| Data valuable for analytics (AD-9) | [S-AD-45-3 §Notes] |
| Flag lifecycle resolution | [S-AD-44-4 §Notes] |
| Audit trail requirements | [S-AD-45-3 §AC] |

## 14. Environment Prerequisites

- Express server with auth + RBAC middleware
- Supabase with interventions migration applied
- Neo4j Aura connection
- risk_flags table exists (from STORY-AD-4)
- Advisor dashboard running (from STORY-AD-5)
- Recommendation engine available (from STORY-AD-7)

## 15. Figma Make Prototype (Optional)

**Optional:** Prototype the intervention log form and timeline view. Key screens:
1. Log form modal with type selector, date picker, action textarea
2. Intervention timeline with vertical timeline visualization
3. Outcome update interaction
