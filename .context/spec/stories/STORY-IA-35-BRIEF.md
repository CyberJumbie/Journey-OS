# STORY-IA-35 Brief: Lint Alert Integration

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-35
old_id: S-IA-37-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 35
sprint: 15
size: S
depends_on:
  - STORY-IA-12 (institutional_admin) — Lint Engine (produces findings to alert on)
blocks: []
personas_served: [institutional_admin]
epic: E-37 (KaizenML Linting & Golden Dataset)
feature: F-17 (Platform Quality & Admin)
user_flow: UF-27 (Data Quality Alerting)
```

---

## 1. Summary

Build a **Lint Alert Integration** service that sends push notifications when new lint issues or golden dataset drift are detected. Alerts are triggered on lint run completion (when critical findings > 0) and on drift detection. The implementation uses an interim approach: direct Supabase `notifications` table insert + SSE push to the admin dashboard. Alert suppression prevents re-alerting for previously seen findings (based on fingerprint hashing).

Key constraints:
- **Interim notification** via direct Supabase insert (until E-34 notification system is built)
- **Alert suppression** using finding fingerprint: hash of `(ruleId + affectedNodeId)`
- **Configurable threshold:** minimum severity to trigger notification
- **SSE push** for real-time alert display on admin dashboard
- **Small story (S)** -- focused on alert service logic, not UI

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Tests**

### Task 1: Create alert types
- **File:** `packages/types/src/kaizen/alert.types.ts`
- **Action:** Export `LintAlert`, `AlertSeverity`, `AlertConfig`, `AlertFingerprint`

### Task 2: Export types from kaizen barrel
- **File:** `packages/types/src/kaizen/index.ts`
- **Action:** Create barrel or edit to re-export from `alert.types.ts`

### Task 3: Build LintAlertService
- **File:** `apps/server/src/services/kaizen/lint-alert.service.ts`
- **Action:** Class with `#supabase` private field. Methods:
  - `processLintResults(institutionId, findings)` -- evaluates findings against threshold, generates alerts
  - `processDriftDetection(institutionId, driftResult)` -- generates drift alert
  - `shouldAlert(fingerprint)` -- checks suppression (returns false if already alerted)
  - `generateFingerprint(ruleId, affectedNodeId)` -- SHA256 hash
  - `createNotification(institutionId, alert)` -- inserts into notifications table
  - `getAlertConfig(institutionId)` -- retrieves minimum severity threshold
  - `updateAlertConfig(institutionId, config)` -- updates threshold

### Task 4: Write service tests
- **File:** `apps/server/src/tests/kaizen/lint-alert.test.ts`
- **Action:** 5-8 tests covering trigger conditions, suppression logic, threshold config.

---

## 3. Data Model

```typescript
// packages/types/src/kaizen/alert.types.ts

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'lint_findings' | 'drift_detected';

/** A lint or drift alert */
export interface LintAlert {
  readonly id: string;
  readonly institution_id: string;
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly summary: string;              // e.g., "3 critical, 5 warning findings detected"
  readonly findings_count: number;
  readonly report_link: string;          // URL to lint report
  readonly created_at: string;           // ISO timestamp
}

/** Alert configuration per institution */
export interface AlertConfig {
  readonly institution_id: string;
  readonly min_severity: AlertSeverity;  // minimum severity to trigger alert
  readonly drift_alerts_enabled: boolean;
  readonly lint_alerts_enabled: boolean;
}

/** Fingerprint for alert suppression */
export interface AlertFingerprint {
  readonly hash: string;                 // SHA256 of ruleId + affectedNodeId
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly alerted: boolean;
}
```

---

## 4. Database Schema

### New table: `notifications` (interim, until E-34)

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  type TEXT NOT NULL,                      -- 'lint_findings', 'drift_detected'
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  report_link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_institution ON notifications(institution_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(institution_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view own institution notifications"
  ON notifications FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

### New table: `alert_fingerprints` (suppression)

```sql
CREATE TABLE alert_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  fingerprint_hash TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alerted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(institution_id, fingerprint_hash)
);

CREATE INDEX idx_alert_fingerprints_lookup
  ON alert_fingerprints(institution_id, fingerprint_hash);
```

### Alert config stored in `institution_settings` table

```sql
-- Key: 'alert_config', Value: JSON
INSERT INTO institution_settings (institution_id, key, value)
VALUES ($institutionId, 'alert_config', '{"min_severity": "warning", "drift_alerts_enabled": true, "lint_alerts_enabled": true}');
```

---

## 5. API Contract

No new API endpoints in this story. The LintAlertService is invoked internally by the lint engine (STORY-IA-12) after lint runs complete. The notifications table is read by the admin dashboard UI (future story).

**Internal service interface:**
```typescript
// Called by lint engine after run completes
await lintAlertService.processLintResults(institutionId, findings);

// Called by drift detection service
await lintAlertService.processDriftDetection(institutionId, driftResult);
```

**SSE push:** The service emits an SSE event `kaizen.alert.created` after inserting a notification, which the admin dashboard listens for via existing SSE infrastructure.

---

## 6. Frontend Spec

No frontend components in this story. The LintAlertService is backend-only. Alert display will be handled by the admin dashboard notification bell (future story on E-34).

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/kaizen/alert.types.ts` | Types | Create |
| 2 | `packages/types/src/kaizen/index.ts` | Types | Create |
| 3 | `apps/server/src/services/kaizen/lint-alert.service.ts` | Service | Create |
| 4 | `apps/server/src/tests/kaizen/lint-alert.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-12 | institutional_admin | **PENDING** | Lint Engine produces findings that trigger alerts |

### NPM Packages
- No new packages. Uses Node.js built-in `crypto` for SHA256 hashing.

### Existing Files Needed
- `apps/server/src/config/supabase-client.config.ts` -- Supabase client for notifications insert
- SSE infrastructure (if already built) for pushing real-time alerts

---

## 9. Test Fixtures

```typescript
export const MOCK_LINT_FINDINGS = [
  { ruleId: "quality-001", severity: "critical" as const, affectedNodeId: "concept-uuid-1", message: "Quality score below threshold" },
  { ruleId: "coverage-002", severity: "warning" as const, affectedNodeId: "concept-uuid-2", message: "Coverage gap detected" },
  { ruleId: "consistency-003", severity: "info" as const, affectedNodeId: "concept-uuid-3", message: "Minor naming inconsistency" },
];

export const MOCK_DRIFT_RESULT = {
  drifted: true,
  average_score_delta: -0.8,
  metrics_drifted: ["quality_composite", "bloom_accuracy"],
  baseline_score: 4.2,
  current_score: 3.4,
};

export const MOCK_ALERT_CONFIG: AlertConfig = {
  institution_id: "inst-uuid-1",
  min_severity: "warning",
  drift_alerts_enabled: true,
  lint_alerts_enabled: true,
};

export const MOCK_FINGERPRINT_HASH = "sha256:abc123def456";

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/kaizen/lint-alert.test.ts`

```
describe("LintAlertService")
  describe("processLintResults")
    it("creates notification when critical findings > 0")
    it("does not create notification when findings below min severity threshold")
    it("respects alert suppression for previously seen fingerprints")
  describe("processDriftDetection")
    it("creates drift alert when drift is detected")
    it("does not alert when drift_alerts_enabled is false")
  describe("shouldAlert")
    it("returns true for new fingerprints")
    it("returns false for previously alerted fingerprints")
  describe("generateFingerprint")
    it("returns consistent SHA256 hash for same ruleId + affectedNodeId")
    it("returns different hash for different inputs")
```

**Total: ~8 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. Backend service only with no UI.

---

## 12. Acceptance Criteria

1. Alert triggered on lint run completion when critical findings > 0
2. Alert triggered on golden dataset drift detection
3. Alert payload includes: summary of findings by severity, link to report
4. Interim implementation: Supabase `notifications` table insert + SSE push
5. Configurable alert threshold: minimum severity to trigger notification
6. Alert suppression: no re-alert for previously seen findings (fingerprint-based)
7. All ~8 API tests pass
8. TypeScript strict, named exports only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Lint alert integration concept | S-IA-37-4 User Story |
| Interim notification via Supabase insert | S-IA-37-4 Notes |
| Alert suppression via fingerprint hash | S-IA-37-4 Notes |
| SSE push for real-time alerts | S-IA-37-4 Notes |
| Configurable severity threshold | S-IA-37-4 Acceptance Criteria |
| Drift alerts higher priority | S-IA-37-4 Notes |
| Blocked by lint engine | S-IA-37-4 Dependencies |

---

## 14. Environment Prerequisites

- **Express:** Server running with kaizen services
- **Supabase:** notifications and alert_fingerprints tables created
- **Lint Engine:** STORY-IA-12 must produce findings for alert processing
- **No Neo4j** required for this story

---

## 15. Figma Make Prototype

No Figma prototype for this story. Backend service only.
