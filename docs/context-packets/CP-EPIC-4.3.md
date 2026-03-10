# CP-EPIC-4.3 — LOD Enrichment + Admin (Weeks 29–32)
**Stories:** P4-009 · P4-010 · P4-011 · P4-012 · P4-013 · P4-014
**Auto-loaded by:** `/story P4-00N` where N = 9–14

---

## What This Epic Builds

Extends UMLS enrichment to cover LCME_Element → StandardTerm alignment, adds automated GROUNDED_IN backfill on every new ingest, delivers full SuperAdmin + InstitutionalAdmin screens, upgrades the notification system with Supabase Realtime, guides new faculty through an onboarding wizard, and adds a data integrity dashboard for system health monitoring.

**Exit gate:** All Phase 4 stories complete. ≥ 200 approved items. One real exam administered. LOD enrichment running automatically. Admin can manage users without DB access.

---

## Prerequisites

- P3-018: StandardTerm nodes + GROUNDED_IN edges (UMLS Phase 3 enrichment done)
- P2-019: KaizenML lint function exists (6th rule added here)
- P2-012: Socket.io notification infrastructure
- P4-008: exam sessions + student_responses tables
- P1-006: LCME_Element nodes seeded

---

## Phase 4 SQL Migration (Epic 4.3)

```sql
-- backend/supabase/migrations/20260203000000_phase4_admin.sql

-- ── Notifications table (Supabase Realtime enabled) ───────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- 'exam:assigned' | 'exam:submitted' | 'batch:completed' | 'import:completed' | 'umls:enrichment_complete'
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}'::jsonb,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own notifications" ON notifications FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- Enable Supabase Realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── Onboarding state on users ─────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Note: 'public.users' is a profile table mirroring auth.users
-- If using auth.users metadata: store in user_metadata JSONB instead

-- ── UMLS enrichment jobs extended ────────────────────────────────────────
ALTER TABLE umls_enrichment_jobs
  ADD COLUMN IF NOT EXISTS trigger TEXT DEFAULT 'manual',  -- 'manual' | 'auto_backfill' | 'post_ingest'
  ADD COLUMN IF NOT EXISTS course_id UUID;                 -- if triggered by specific ingest
```

---

## LCME_Element → StandardTerm Alignment Script

```typescript
// scripts/align-lcme-terms.ts

import { neo4jDriver } from '../backend/src/database/neo4j';
import { umlsSearchService } from '../backend/src/services/UmlsSearchService';
import { supabase } from '../backend/src/database/supabase';

const LCME_ELEMENT_KEYWORDS: Record<string, string[]> = {
  // Map element IDs to search terms for UMLS lookup
  // Elements often don't have single-concept names — use most specific term
  'IS-2A': ['clinical medicine', 'clinical sciences'],
  'IS-11': ['basic sciences', 'biomedical sciences'],
  'IM-1':  ['medical education assessment', 'student evaluation'],
  'OB-1':  ['graduation outcomes', 'medical graduate outcomes'],
  // ... etc — see LCME Standards reference
};

async function alignLcmeTerms() {
  const session = neo4jDriver.session();

  // Get all LCME_Element nodes
  const result = await session.run(`MATCH (el:LCME_Element) RETURN el.elementId, el.name`);

  for (const record of result.records) {
    const elementId = record.get('el.elementId');
    const elementName = record.get('el.name');

    // Try to find relevant StandardTerm via CUI-based search
    const searchTerm = LCME_ELEMENT_KEYWORDS[elementId]?.[0] || elementName;
    const umlsResult = await umlsSearchService.searchConcept(searchTerm);

    if (umlsResult && umlsResult.confidence >= 0.80) {
      // Ensure StandardTerm node exists (may already exist from P3-018)
      await session.run(`
        MERGE (st:StandardTerm {cui: $cui})
        ON CREATE SET st.uuid = $uuid, st.name = $name, st.source = 'UMLS', st.createdAt = datetime()
        WITH st
        MATCH (el:LCME_Element {elementId: $elementId})
        MERGE (el)-[:USES_TERM {confidence: $confidence}]->(st)
      `, { cui: umlsResult.cui, uuid: crypto.randomUUID(), name: umlsResult.name, elementId, confidence: umlsResult.confidence });
    }
  }

  session.close();
  console.log('LCME term alignment complete');
}

alignLcmeTerms();
```

---

## Notification Service (Phase 4 Extension)

```typescript
// backend/src/services/NotificationService.ts (extends Phase 2 version)

class NotificationService {
  // Phase 2: sends via Socket.io
  // Phase 4: ALSO writes to Supabase notifications table for persistence + Realtime

  async notify(userId: string, type: NotificationType, title: string, body: string, data?: object) {
    // 1. Socket.io (real-time delivery, in-memory)
    const room = `user:${userId}`;
    this.io.to(room).emit('notification', { type, title, body, data });

    // 2. Supabase (persistent, Realtime broadcast, survives disconnects)
    await supabase.from('notifications').insert({
      user_id: userId, type, title, body, data: data || {},
    });
  }

  // New notification types (Phase 4)
  async examAssigned(studentId: string, examName: string, startTime: string) {
    await this.notify(studentId, 'exam:assigned', `New exam: ${examName}`,
      `Scheduled for ${new Date(startTime).toLocaleDateString()}`,
      { examName, startTime });
  }

  async examSubmitted(facultyId: string, studentName: string, examName: string) {
    await this.notify(facultyId, 'exam:submitted', `${studentName} submitted ${examName}`,
      'View results in exam dashboard');
  }

  async importCompleted(adminId: string, filename: string, count: number) {
    await this.notify(adminId, 'import:completed', `Import complete: ${filename}`,
      `${count} questions imported successfully`);
  }
}
```

Frontend Supabase Realtime hook:
```typescript
// frontend/src/hooks/useRealtimeNotifications.ts

export function useRealtimeNotifications(userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Invalidate notifications query → badge count updates
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        // Also show toast
        toast(payload.new.title, { description: payload.new.body });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);
}
```

---

## Onboarding Wizard: Step Contract

```typescript
// frontend/src/hooks/useOnboarding.ts

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingState {
  currentStep: OnboardingStep;
  completed: boolean;
  data: {
    displayName?: string;
    title?: string;
    department?: string;
    selectedCourseId?: string;
    uploadJobId?: string;
    firstItemId?: string;
  };
}

// Step completion → PATCH /api/v1/users/me/onboarding
// { step: N, data: { ...step-specific data } }
// Response: { nextStep: N+1, completed: false }

// Final step → PATCH /api/v1/users/me/onboarding
// { step: 6, completed: true }
// Response: { completed: true } → redirect to /dashboard
```

---

## Admin Role Middleware

```typescript
// backend/src/middleware/requireRole.ts

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions', required: roles, actual: userRole });
    }
    next();
  };

// Usage in routes:
router.get('/admin/dashboard', requireRole('admin'), adminController.getDashboard);
router.get('/institution/dashboard', requireRole('admin', 'institution_admin'), institutionController.getDashboard);
router.get('/courses', requireRole('admin', 'institution_admin', 'course_director', 'faculty'), courseController.list);
```

---

## Data Integrity Endpoint

```typescript
// GET /api/v1/admin/data-integrity
interface DataIntegrityReport {
  sync_status: {
    assessment_items_failed: number;
    sub_concepts_failed: number;
    exams_failed: number;
  };
  lint: {
    last_run: string;
    rules: { rule_id: string; name: string; passed: boolean; value: number; threshold: number }[];
  };
  lod_enrichment: {
    subconcepts_total: number;
    subconcepts_grounded: number;
    subconcepts_grounded_pct: number;
    lcme_elements_total: number;
    lcme_elements_aligned: number;
    last_umls_run: string | null;
  };
  graph_health: {
    neo4j_subconcept_count: number;
    neo4j_assessment_item_count: number;
    neo4j_orphan_subconcepts: number;    // SubConcepts with no TEACHES or TARGETS edges
    pagerank_last_computed: string | null;
  };
  generation_health: {
    items_without_tags: number;
    items_without_critic: number;
    stale_running_logs: number;          -- generation_logs running > 2 hours
  };
}
```

---

## New Files (Epic 4.3)

```
scripts/align-lcme-terms.ts
backend/src/inngest/umls-backfill.function.ts
frontend/src/app/(admin)/page.tsx
frontend/src/app/(admin)/users/page.tsx
frontend/src/app/(admin)/data-integrity/page.tsx
frontend/src/app/(institution)/page.tsx
frontend/src/app/onboarding/page.tsx
frontend/src/app/(faculty)/notifications/page.tsx
frontend/src/hooks/useAdminDashboard.ts
frontend/src/hooks/useUserManagement.ts
frontend/src/hooks/useOnboarding.ts
frontend/src/hooks/useRealtimeNotifications.ts
frontend/src/hooks/useDataIntegrity.ts
frontend/src/components/organisms/OnboardingWizard/OnboardingWizard.tsx
backend/src/controllers/user-management.controller.ts
backend/src/controllers/data-integrity.controller.ts
backend/src/services/UserManagementService.ts
backend/src/routes/user-management.routes.ts
backend/supabase/migrations/20260203000000_phase4_admin.sql
```

---

## Smoke Tests

```bash
# 1. LCME term alignment
pnpm tsx scripts/align-lcme-terms.ts
# MATCH (el:LCME_Element)-[:USES_TERM]->(st:StandardTerm) RETURN count(*)  → > 0

# 2. UMLS auto-backfill on ingest
# Ingest new course → wait 3 min
# MATCH (sc:SubConcept)-[:GROUNDED_IN]->(st:StandardTerm) WHERE sc.createdAt > datetime()-{hours:1} RETURN count(sc)
# Expected: > 0 (new concepts auto-enriched)

# 3. Admin dashboard
curl "localhost:3001/api/v1/admin/dashboard" -H "Authorization: Bearer $ADMIN_JWT"
# Expected: { totalFaculty, totalCourses, totalApprovedItems, totalExams, ... }

# 4. User invite
curl -X POST "localhost:3001/api/v1/admin/users/invite" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"email":"new-faculty@msm.edu","role":"faculty","institutionId":"msm-uuid"}'
# Expected: 200, email sent

# 5. Onboarding flow
# Create new user with onboarding_completed=false
# Login → /onboarding (auto-redirect)
# Complete step 1 → PUT /users/me/onboarding { step: 1, data: { displayName: "Dr. Smith" } }
# Complete all 6 steps → /dashboard

# 6. Realtime notifications
# Assign exam to student → student's /notifications page updates without refresh
# Supabase notifications table: SELECT * FROM notifications WHERE user_id='{studentId}' AND type='exam:assigned'

# 7. Data integrity
curl "localhost:3001/api/v1/admin/data-integrity" -H "Authorization: Bearer $ADMIN_JWT"
# Expected: sync_status.assessment_items_failed = 0 (healthy system)
# lint.rules: all 6 rules present
```
