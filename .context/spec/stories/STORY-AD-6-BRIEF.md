# STORY-AD-6: Student Alert View — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-6
old_id: S-AD-45-5
lane: advisor
lane_priority: 5
within_lane_order: 6
epic: E-45 (Advisor Cohort Dashboard & Interventions)
feature: F-21
sprint: 38
size: M
depends_on:
  - STORY-AD-4 (advisor) — Risk Flag Generation (flags data)
  - STORY-F-2 (faculty) — Notification Model (notification infrastructure)
blocks: []
personas_served: [student]
```

## 1. Summary

Build the student-facing risk alert view that displays a supportive notification banner on the student dashboard when an active risk flag exists. The alert shows "areas needing attention" with specific struggling concepts and recommended study actions. Students can dismiss the alert (acknowledging it without deleting the flag), and the alert reappears if the risk level escalates. The tone is supportive and encouraging, privacy is enforced server-side, and the banner uses ARIA role="alert" for accessibility.

**Parent epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Parent feature:** F-21
**User flows satisfied:** Student receives early warning, student takes proactive remediation
**Personas involved:** Student (primary user, at-risk)

**Product context:** From [S-AD-45-5 §Notes]: "Tone: supportive and encouraging, not alarming. 'You're close to mastering X' not 'You're failing at X'."

**Design context:** Alert severity colors — moderate: `warning` (#fa9d33), high: `warning`, critical: `danger` (#c9282d). Toast pattern: white bg, semantic color left accent (3px), shadow card-hover.

## 2. Task Breakdown

1. Define alert types in `packages/types/src/student/alert.types.ts`
2. Create student alert service in `apps/server/src/modules/student/services/student-alert.service.ts`
3. Create student alert controller in `apps/server/src/modules/student/controllers/student-alert.controller.ts`
4. Create student alert routes in `apps/server/src/modules/student/routes/student-alert.routes.ts`
5. Create risk alert banner component in `apps/web/src/components/student/risk-alert-banner.tsx`
6. Create recommended actions component in `apps/web/src/components/student/recommended-actions.tsx`
7. Create useStudentAlerts hook in `apps/web/src/hooks/use-student-alerts.ts`
8. Write service tests
9. Write controller tests

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/student/alert.types.ts

export type AlertSeverity = "moderate" | "high" | "critical";

export interface StudentAlert {
  readonly id: string;
  readonly flag_id: string;
  readonly risk_level: AlertSeverity;
  readonly areas_needing_attention: readonly AlertConcept[];
  readonly recommended_actions: readonly RecommendedAction[];
  readonly is_dismissed: boolean;
  readonly created_at: string;
}

export interface AlertConcept {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly p_mastered: number;
  readonly supportive_message: string;  // "You're close to mastering X"
}

export interface RecommendedAction {
  readonly action_type: "practice" | "review" | "tutoring" | "study_material";
  readonly title: string;
  readonly description: string;
  readonly concept_id?: string;
  readonly practice_link?: string;  // pre-configured practice session URL
}

export interface StudentAlertDismissRequest {
  readonly flag_id: string;
}

export interface StudentAlertResponse {
  readonly alerts: readonly StudentAlert[];
  readonly has_active_alerts: boolean;
}
```

## 4. Database Schema (inline, complete)

### Supabase — Reads from risk_flags (no new tables)

```sql
-- Get active alerts for a student (their own flags only)
SELECT
    rf.id AS flag_id,
    rf.risk_level,
    rf.top_3_root_causes,
    rf.status,
    rf.created_at,
    COALESCE(sd.dismissed, false) AS is_dismissed
FROM risk_flags rf
LEFT JOIN student_alert_dismissals sd
    ON sd.flag_id = rf.id AND sd.student_id = rf.student_id
WHERE rf.student_id = auth.uid()
  AND rf.status IN ('created', 'acknowledged')
  AND rf.risk_level IN ('moderate', 'high', 'critical')
  AND (sd.dismissed IS NULL OR sd.dismissed = false OR rf.risk_level > sd.dismissed_at_level)
ORDER BY
    CASE rf.risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'moderate' THEN 3 END ASC;
```

### Supabase — student_alert_dismissals (new migration)

```sql
-- Migration: create_student_alert_dismissals_table
CREATE TABLE IF NOT EXISTS student_alert_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    flag_id UUID NOT NULL REFERENCES risk_flags(id),
    dismissed BOOLEAN NOT NULL DEFAULT true,
    dismissed_at_level TEXT NOT NULL,  -- risk level when dismissed
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, flag_id)
);

ALTER TABLE student_alert_dismissals ENABLE ROW LEVEL SECURITY;

-- Students can only dismiss their own alerts
CREATE POLICY "student_dismissals_own" ON student_alert_dismissals
    FOR ALL USING (student_id = auth.uid());
```

## 5. API Contract (complete request/response)

### GET /api/v1/student/alerts

**Role access:** student (own alerts only)
**Auth:** Bearer token
**Privacy:** Server-side filter to `auth.uid()` — student sees only their own flags

**Response (200):**
```json
{
    "data": {
        "alerts": [
            {
                "id": "alert-001",
                "flag_id": "flag-uuid-001",
                "risk_level": "high",
                "areas_needing_attention": [
                    {
                        "concept_id": "acid-base",
                        "concept_name": "Acid-Base Physiology",
                        "p_mastered": 0.35,
                        "supportive_message": "You're making progress on Acid-Base Physiology — a few more practice sessions will help solidify this concept."
                    },
                    {
                        "concept_id": "renal-tubular",
                        "concept_name": "Renal Tubular Function",
                        "p_mastered": 0.22,
                        "supportive_message": "Renal Tubular Function builds on concepts you're working on — targeted practice will help."
                    }
                ],
                "recommended_actions": [
                    {
                        "action_type": "practice",
                        "title": "Practice Acid-Base Questions",
                        "description": "Complete a focused practice session on acid-base physiology concepts.",
                        "concept_id": "acid-base",
                        "practice_link": "/practice?concepts=acid-base"
                    },
                    {
                        "action_type": "review",
                        "title": "Review Renal Physiology",
                        "description": "Review the prerequisite concepts before attempting more complex renal topics.",
                        "concept_id": "renal-tubular"
                    }
                ],
                "is_dismissed": false,
                "created_at": "2026-02-19T02:00:00Z"
            }
        ],
        "has_active_alerts": true
    },
    "error": null
}
```

### POST /api/v1/student/alerts/dismiss

**Role access:** student (own alerts only)
**Auth:** Bearer token

**Request:**
```json
{
    "flag_id": "flag-uuid-001"
}
```

**Response (200):**
```json
{
    "data": {
        "flag_id": "flag-uuid-001",
        "dismissed": true,
        "dismissed_at": "2026-02-19T10:30:00Z"
    },
    "error": null
}
```

**Error responses:**
- 404: Flag not found or not owned by student
- 400: Flag already dismissed

## 6. Frontend Spec

### Component Hierarchy

```
Hook: useStudentAlerts (fetches alerts, manages dismiss)
  └── Organism: RiskAlertBanner
        ├── Atom: AlertSeverityIcon (warning triangle with severity color)
        ├── Molecule: AlertHeader ("Areas Needing Attention")
        ├── Molecule: ConceptPills (list of struggling concepts with supportive messages)
        ├── Organism: RecommendedActions
        │     └── Molecule: ActionCard (repeating)
        │           ├── Atom: ActionTypeIcon
        │           ├── Atom: ActionTitle
        │           └── Atom: ActionLink (optional practice link)
        └── Atom: DismissButton (ghost X button)
```

### Props Interfaces

```typescript
// RiskAlertBanner
interface RiskAlertBannerProps {
  readonly alert: StudentAlert;
  readonly onDismiss: (flagId: string) => void;
}

// RecommendedActions
interface RecommendedActionsProps {
  readonly actions: readonly RecommendedAction[];
}
```

### States

- **No alerts:** Banner not rendered (no empty state needed)
- **Active alert:** Banner visible with severity color accent
- **Dismissed:** Banner hidden, reappears on escalation
- **Multiple alerts:** Stack vertically, most severe first

### Design Tokens

- **Alert banner container:**
  - `white` bg, `borderLight` border, `radius-lg` (8px), `shadow-card`
  - Left accent: 3px border in severity color
  - `moderate`: `warning` (#fa9d33) accent
  - `high`: `warning` (#fa9d33) accent, bolder styling
  - `critical`: `danger` (#c9282d) accent, pulsing glow
- **Dismiss button:** ghost style, top-right, auto-dismiss: none (user must actively dismiss)
- **Concept pills:** `bluePale/10%` bg, `blueMid` text, `radius-md` (6px)
- **Action cards:** `parchment` bg, `borderLight` border, `radius-md`
- **ARIA:** `role="alert"` on banner container for screen readers
- **Tone words:** "making progress", "a few more", "builds on", "will help" — never "failing", "behind", "at risk"

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/types/src/student/alert.types.ts` | Types | Alert type interfaces |
| 2 | `packages/types/src/student/index.ts` | Types | Barrel export |
| 3 | `apps/server/src/modules/student/services/student-alert.service.ts` | Service | Alert retrieval + supportive messaging |
| 4 | `apps/server/src/modules/student/controllers/student-alert.controller.ts` | Controller | HTTP handlers |
| 5 | `apps/server/src/modules/student/routes/student-alert.routes.ts` | Route | Express routes + student RBAC |
| 6 | `apps/web/src/hooks/use-student-alerts.ts` | Hook | React Query hook for alerts |
| 7 | `apps/web/src/components/student/risk-alert-banner.tsx` | Component | Alert banner organism |
| 8 | `apps/web/src/components/student/recommended-actions.tsx` | Component | Action cards |
| 9 | `apps/server/src/modules/student/__tests__/student-alert.service.test.ts` | Test | Service tests |
| 10 | `apps/server/src/modules/student/__tests__/student-alert.controller.test.ts` | Test | Controller tests |

**Existing file to modify:**
- `packages/types/src/index.ts` — add student exports
- `apps/web/src/app/(dashboard)/student/page.tsx` — integrate alert banner

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-4 (Risk Flags) | advisor | NOT STARTED | risk_flags table + data |
| STORY-F-2 (Notification Model) | faculty | NOT STARTED | Notification infrastructure |
| STORY-U-6 (RBAC) | universal | DONE | Role-based access |
| STORY-U-10 (Dashboard Routing) | universal | DONE | Student dashboard page |

### NPM Packages
- No new packages needed (uses existing React, Tailwind)

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts`
- `apps/web/src/app/(dashboard)/student/page.tsx`
- `packages/types/src/auth/roles.types.ts` — AuthRole.STUDENT

## 9. Test Fixtures (inline)

```typescript
export const MOCK_STUDENT_ALERT: StudentAlert = {
  id: "alert-001",
  flag_id: "flag-001",
  risk_level: "high",
  areas_needing_attention: [
    {
      concept_id: "acid-base",
      concept_name: "Acid-Base Physiology",
      p_mastered: 0.35,
      supportive_message: "You're making progress on Acid-Base Physiology — a few more practice sessions will help solidify this concept.",
    },
  ],
  recommended_actions: [
    {
      action_type: "practice",
      title: "Practice Acid-Base Questions",
      description: "Complete a focused practice session on acid-base physiology concepts.",
      concept_id: "acid-base",
      practice_link: "/practice?concepts=acid-base",
    },
  ],
  is_dismissed: false,
  created_at: "2026-02-19T02:00:00Z",
};

export const MOCK_CRITICAL_ALERT: StudentAlert = {
  id: "alert-002",
  flag_id: "flag-002",
  risk_level: "critical",
  areas_needing_attention: [
    {
      concept_id: "renal-tubular",
      concept_name: "Renal Tubular Function",
      p_mastered: 0.12,
      supportive_message: "Renal Tubular Function is a challenging topic — let's focus on the building blocks to strengthen your foundation.",
    },
  ],
  recommended_actions: [
    {
      action_type: "tutoring",
      title: "Schedule a Tutoring Session",
      description: "A focused tutoring session on renal physiology can help you build confidence.",
    },
  ],
  is_dismissed: false,
  created_at: "2026-02-19T02:00:00Z",
};

export const MOCK_DISMISSED_ALERT: StudentAlert = {
  ...MOCK_STUDENT_ALERT,
  id: "alert-003",
  is_dismissed: true,
};

export const MOCK_NO_ALERTS: StudentAlertResponse = {
  alerts: [],
  has_active_alerts: false,
};

// Student trying to access another student's alerts
export const MOCK_UNAUTHORIZED_STUDENT = {
  requesting_student_id: "student-other",
  flag_student_id: "student-001",
  expected: "404_not_found",
};
```

## 10. API Test Spec (vitest — PRIMARY)

```typescript
// apps/server/src/modules/student/__tests__/student-alert.service.test.ts
describe("StudentAlertService", () => {
  it("returns active alerts for the authenticated student");
  it("returns empty alerts when no risk flags exist");
  it("filters out low-risk flags (only moderate/high/critical shown)");
  it("generates supportive messages for struggling concepts");
  it("generates recommended actions based on root causes");
  it("excludes dismissed alerts");
  it("re-shows dismissed alert if risk level escalated");
  it("orders alerts by severity (critical first)");
  it("enforces privacy: student sees only their own flags");
});

// apps/server/src/modules/student/__tests__/student-alert.controller.test.ts
describe("StudentAlertController", () => {
  it("GET /api/v1/student/alerts returns 200 with alerts");
  it("GET /api/v1/student/alerts returns 401 without auth");
  it("GET /api/v1/student/alerts returns 403 for advisor role");
  it("POST /api/v1/student/alerts/dismiss returns 200");
  it("POST /api/v1/student/alerts/dismiss returns 404 for wrong student");
  it("POST /api/v1/student/alerts/dismiss returns 400 for already dismissed");
});
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not a standalone critical journey. The student alert flow is part of the student dashboard journey which would be tested in the student lane E2E tests.

## 12. Acceptance Criteria

1. Alert banner appears on student dashboard when active risk flag exists
2. Alert severity matches risk level: moderate (yellow/warning), high (orange/warning), critical (red/danger)
3. Alert content shows "Areas needing attention" with top struggling concepts
4. Each concept has a supportive message ("You're close to mastering X")
5. Recommended actions include specific study recommendations (practice, review, tutoring)
6. Link to practice session pre-configured with recommended concepts (when available)
7. Dismiss button marks alert as acknowledged (does not delete the flag)
8. Dismissed alert reappears if risk level escalates after dismissal
9. Privacy enforced: student sees only their own flags (server-side filter)
10. Notification hook: in-app notification when new flag generated (stub for E-34)
11. ARIA `role="alert"` on banner for screen reader accessibility
12. Tone is supportive and encouraging throughout
13. All tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Student sees risk areas + actions | [S-AD-45-5 §AC] |
| Supportive tone, not alarming | [S-AD-45-5 §Notes] |
| ARIA role="alert" | [S-AD-45-5 §AC] |
| Privacy: own flags only | [S-AD-45-5 §AC] |
| Dismiss + re-escalation | [S-AD-45-5 §AC] |
| at_risk_alert notification type | [SUPABASE_DDL §notifications table] |
| Alert severity colors | [DESIGN_SPEC §Badge variants, semantic colors] |
| Toast/alert design pattern | [DESIGN_SPEC §Toast Pattern] |
| Notification delivery via E-34 | [S-AD-45-5 §Dependencies] |
| Student persona (Marcus Williams) | [PRODUCT_BRIEF §Marcus Williams] |

## 14. Environment Prerequisites

- Express server with auth middleware
- Supabase with risk_flags table + student_alert_dismissals migration
- Risk flags populated (from STORY-AD-4)
- Student dashboard page exists (from STORY-U-10)
- Notification infrastructure available (from STORY-F-2) or stubbed

## 15. Figma Make Prototype (Optional)

**Recommended:** Prototype the alert banner with all three severity levels to validate tone and visual hierarchy. Focus on:
1. High-severity alert with 3 concepts + 2 recommended actions
2. Critical-severity alert with pulsing accent
3. Dismiss interaction
