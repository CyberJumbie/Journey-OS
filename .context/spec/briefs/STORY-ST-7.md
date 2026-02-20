# STORY-ST-7: Readiness Tracker

**Epic:** E-42 (Student Dashboard)
**Feature:** F-20
**Sprint:** 27
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-42-3

---

## User Story
As a **Student (Marcus Williams)**, I need to see my Step 1 readiness compared to historical passing benchmarks so that I can gauge whether I am on track for the exam.

## Acceptance Criteria
- [ ] Readiness score (0-100) displayed as a circular gauge (progress ring variant)
- [ ] Benchmark line showing historical passing threshold (e.g., score 196 mapped to readiness 65)
- [ ] Confidence interval visualization (e.g., "75% chance of passing")
- [ ] Comparison with cohort average (anonymized, opt-in) — placeholder until STORY-ST-9
- [ ] Trend mini-chart showing readiness score over last 4 weeks
- [ ] Tooltip explaining how readiness score is calculated
- [ ] Historical benchmark data seeded from USMLE pass-rate statistics
- [ ] Service layer computes readiness from aggregate mastery data with USMLE blueprint weights
- [ ] Loading state with skeleton
- [ ] Renders within the student dashboard page

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentProgress.tsx` (stats section) | `apps/web/src/components/student/readiness-tracker.tsx` | Extract the stats cards area showing average score. Replace with dedicated readiness gauge. Add benchmark line and trend mini-chart. |
| `components/shared/progress-ring.tsx` | `packages/ui/src/atoms/progress-ring.tsx` | Adapt for gauge variant: larger size, benchmark indicator line, percentage label inside. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/readiness.types.ts` |
| Service | apps/server | `src/modules/student/services/readiness-tracker.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/student-dashboard.controller.ts` (extend) |
| Organism | apps/web | `src/components/student/readiness-tracker.tsx` |
| Molecule | apps/web | `src/components/student/readiness-gauge.tsx` |
| Molecule | apps/web | `src/components/student/readiness-trend-chart.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/readiness-tracker.service.test.ts` |

## Database Schema
No additional tables. Readiness is computed from `student_mastery` aggregate data.

**Seed data:** USMLE blueprint weights per organ system (stored as configuration):
```json
{
  "Cardiovascular": 0.12,
  "Respiratory": 0.09,
  "Renal": 0.08,
  "GI": 0.10,
  "Endocrine": 0.08,
  "Reproductive": 0.07,
  "Musculoskeletal": 0.08,
  "Neurology": 0.10,
  "Psychiatry": 0.06,
  "Hematology": 0.08,
  "Immunology": 0.07,
  "Multisystem": 0.07
}
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/readiness` | Student | Current readiness score with benchmark and trend |

**Response shape:**
```typescript
{
  score: number;           // 0-100
  passProbability: number; // 0-1
  benchmark: number;       // historical passing threshold score
  trend: Array<{ date: string; score: number }>;  // last 4 weeks
  cohortAverage?: number;  // null if not opted in
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-2 (dashboard page exists)
- **Cross-epic:** Benchmark data is static seed; real IRT-calibrated readiness comes with STORY-ST-4

## Testing Requirements
- **API Tests (70%):** Readiness score computation returns value between 0-100. Weighted average correctly applies USMLE blueprint weights. Pass probability correlates with readiness score. Trend returns up to 4 data points. Service handles student with no mastery data (returns 0 readiness).
- **E2E (0%):** Covered by dashboard E2E in STORY-ST-2.

## Implementation Notes
- Readiness calculation formula: `sum(system_mastery[i] * blueprint_weight[i])` across all 12 USMLE systems, scaled to 0-100.
- Pass probability is a logistic function mapping readiness to probability: `1 / (1 + exp(-k * (readiness - threshold)))` where threshold=65 and k=0.15.
- Historical benchmarks are hardcoded initially; later driven by IRT calibration data (STORY-ST-4).
- Gauge component should be reusable for other contexts (e.g., course readiness, concept readiness).
- Trend mini-chart uses Recharts `<LineChart>` with design token colors. SVG `stroke` uses hex with `/* token: --color-name */` comment.
- Weekly readiness snapshots computed by a scheduled job (or computed on-the-fly from mastery history).
