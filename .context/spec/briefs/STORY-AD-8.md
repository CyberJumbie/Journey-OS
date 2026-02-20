# STORY-AD-8: Intervention Logging

**Epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Feature:** F-21
**Sprint:** 38
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-45-3

---

## User Story
As an **academic advisor**, I need to log interventions I take with students and track their outcomes so that I can evaluate effectiveness and maintain an auditable record of my advisory actions.

## Acceptance Criteria
- [ ] Intervention log form: action taken, date, notes, linked recommendation (if any), linked risk flag
- [ ] Intervention types: meeting, email, study_plan, tutoring_referral, resource_share, other
- [ ] Outcome tracking: follow-up status (pending, improved, no_change, declined)
- [ ] Follow-up reminder: set date for follow-up check
- [ ] Intervention timeline per student showing all logged actions chronologically
- [ ] CRUD operations for intervention records
- [ ] Link intervention to risk flag (positive outcome can resolve the flag)
- [ ] API endpoints: POST/GET/PATCH /api/interventions
- [ ] Audit trail: who logged, when, modifications tracked via updated_at
- [ ] Filter interventions by student, type, date range, outcome
- [ ] Intervention form accessible as modal from Advisor Dashboard (STORY-AD-5)

## Reference Screens
> No dedicated prototype page. Intervention logging is a modal/drawer within the Advisor Dashboard (STORY-AD-5).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/notifications/Notifications.tsx` | `apps/web/src/components/advisor/intervention-timeline.tsx` | Use notification list card pattern for intervention timeline. Each intervention is a card with icon (by type), title, notes, outcome badge, and timestamp. Replace notification actions with intervention-specific actions (edit, set follow-up). |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/advisor/intervention.types.ts` (extend from AD-7) |
| Repository | apps/server | `src/modules/advisor/repositories/intervention.repository.ts` |
| Service | apps/server | `src/modules/advisor/services/intervention-logging.service.ts` |
| Controller | apps/server | `src/modules/advisor/controllers/intervention-logging.controller.ts` |
| Route | apps/server | `src/modules/advisor/routes/intervention.routes.ts` (extend from AD-7) |
| Organism | apps/web | `src/components/advisor/intervention-log-form.tsx` |
| Organism | apps/web | `src/components/advisor/intervention-timeline.tsx` |
| Hook | apps/web | `src/hooks/use-interventions.ts` |
| API Tests | apps/server | `src/modules/advisor/__tests__/intervention-logging.service.test.ts` |
| API Tests | apps/server | `src/modules/advisor/__tests__/intervention.repository.test.ts` |

## Database Schema

**Supabase:**
```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  advisor_id UUID NOT NULL REFERENCES profiles(id),
  risk_flag_id UUID REFERENCES risk_flags(id),
  recommendation_id UUID REFERENCES recommendation_log(id),
  intervention_type VARCHAR(30) NOT NULL CHECK (intervention_type IN (
    'meeting', 'email', 'study_plan', 'tutoring_referral', 'resource_share', 'other'
  )),
  action_description TEXT NOT NULL,
  notes TEXT,
  outcome_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (outcome_status IN (
    'pending', 'improved', 'no_change', 'declined'
  )),
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  graph_node_id VARCHAR(255),
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interventions_student ON interventions(student_id, created_at DESC);
CREATE INDEX idx_interventions_advisor ON interventions(advisor_id, created_at DESC);
CREATE INDEX idx_interventions_followup ON interventions(follow_up_date) WHERE NOT follow_up_completed AND outcome_status = 'pending';
CREATE INDEX idx_interventions_institution ON interventions(institution_id);

-- RPC for atomic intervention creation + optional flag resolution
CREATE OR REPLACE FUNCTION create_intervention_with_flag_update(
  p_student_id UUID,
  p_advisor_id UUID,
  p_risk_flag_id UUID,
  p_intervention_type VARCHAR,
  p_action_description TEXT,
  p_notes TEXT,
  p_follow_up_date DATE,
  p_resolve_flag BOOLEAN DEFAULT false,
  p_outcome VARCHAR DEFAULT NULL,
  p_institution_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_intervention_id UUID;
  v_result JSON;
BEGIN
  -- Insert intervention
  INSERT INTO interventions (student_id, advisor_id, risk_flag_id, intervention_type, action_description, notes, follow_up_date, institution_id)
  VALUES (p_student_id, p_advisor_id, p_risk_flag_id, p_intervention_type, p_action_description, p_notes, p_follow_up_date, p_institution_id)
  RETURNING id INTO v_intervention_id;

  -- Optionally resolve the linked risk flag
  IF p_resolve_flag AND p_risk_flag_id IS NOT NULL THEN
    UPDATE risk_flags
    SET status = 'resolved', outcome = p_outcome, resolved_at = now(), updated_at = now()
    WHERE id = p_risk_flag_id;
  END IF;

  SELECT json_build_object('intervention_id', v_intervention_id) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisors_manage_own_interventions" ON interventions
  FOR ALL USING (
    advisor_id = auth.uid()
    OR institution_id IN (
      SELECT institution_id FROM profiles WHERE id = auth.uid() AND role = 'institutional_admin'
    )
  );
```

**Neo4j:**
```cypher
(:Advisor {id: $advisor_id})-[:INTERVENED {
  intervention_type: "meeting",
  date: datetime(),
  outcome: "improved"
}]->(:Student {id: $student_id})

// Link intervention to risk flag resolution
(:Intervention {id: $intervention_id})-[:RESOLVES]->(:RiskFlag {id: $flag_id})
```

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/interventions` | Create new intervention | advisor |
| GET | `/api/interventions` | List interventions (with filters) | advisor, institutional_admin |
| GET | `/api/interventions/:studentId/timeline` | Get intervention timeline for student | advisor |
| PATCH | `/api/interventions/:id` | Update intervention (notes, outcome, follow-up) | advisor |
| GET | `/api/interventions/follow-ups` | Get pending follow-ups for advisor | advisor |

## Dependencies
- **Blocked by:** STORY-AD-5 (dashboard context for UI), STORY-AD-7 (recommendation linkage -- accepted recommendations become interventions)
- **Blocks:** None
- **Cross-epic:** Follow-up reminders connect to E-34 (notification system)

## Testing Requirements
- 7 API tests: create intervention with flag linkage, update outcome status, follow-up date handling, intervention timeline query, filter by type/date/outcome, atomic flag resolution via RPC, dual-write to Neo4j
- 0 E2E tests

## Implementation Notes
- DualWriteService: Supabase `interventions` table first, then Neo4j `(Advisor)-[:INTERVENED]->(Student)` relationship with properties, then update `sync_status = 'synced'`.
- Use `supabase.rpc('create_intervention_with_flag_update', ...)` for atomic multi-table writes when intervention creation should also resolve a risk flag. Never sequential client-side queries per architecture rules.
- Intervention-to-flag linkage: resolving an intervention with positive outcome can close the associated risk flag. Atomic via RPC.
- Follow-up reminders are stored as `follow_up_date` on the intervention. A scheduled Inngest job checks for pending follow-ups and emits notification events. Actual delivery via notification system (E-34).
- Intervention form uses React Hook Form + Zod validation. Provide defaults via RHF's `defaultValues`, not Zod `.optional().default()` to avoid type mismatch with zodResolver.
- Timeline component renders interventions chronologically with type-specific icons (meeting = calendar, email = envelope, etc.) using the notification card pattern from `Notifications.tsx`.
- Repository uses `.select().single()` on all Supabase write operations (insert, update) to verify exactly 1 row affected.
- Every controller handler must extract `user.id` from `req` and pass to service layer for ownership checks.
