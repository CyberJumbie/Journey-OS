# STORY-IA-36: Golden Dataset Service

**Epic:** E-37 (KaizenML Linting & Golden Dataset)
**Feature:** F-17
**Sprint:** 15
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-37-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a golden dataset regression suite of 50 curated items so that generation quality drift is detected automatically against a known-good baseline.

## Acceptance Criteria
- [ ] Golden dataset: 50 curated question-answer pairs with expected scores
- [ ] Regression test: run generation pipeline on golden prompts and compare output quality
- [ ] Drift detection: flag if average composite score drops > 0.5 from baseline
- [ ] Per-metric drift: flag individual metrics that degrade > 1.0 from baseline
- [ ] Regression results stored with timestamp for trend analysis
- [ ] Golden dataset CRUD: add, remove, update items (superadmin/institutional_admin only)
- [ ] Inngest scheduled run: weekly regression (configurable)
- [ ] Drift alert triggers `kaizen.drift.detected` event
- [ ] Custom error class: `GoldenDatasetError`
- [ ] 10-14 API tests: regression run, drift detection, per-metric drift, CRUD operations, trend query

## Reference Screens
> No direct screen -- backend service.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | Backend-only story. Results feed into IA-37 (Lint Results UI) and admin dashboard KPIs. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/kaizen/golden-dataset.types.ts` |
| Model | apps/server | `src/models/golden-dataset-item.model.ts` |
| Repository | apps/server | `src/repositories/golden-dataset.repository.ts` |
| Service | apps/server | `src/services/kaizen/golden-dataset.service.ts` |
| Service | apps/server | `src/services/kaizen/drift-detection.service.ts` |
| Controller | apps/server | `src/controllers/kaizen/golden-dataset.controller.ts` |
| Route | apps/server | `src/routes/kaizen/golden-dataset.routes.ts` |
| Inngest | apps/server | `src/inngest/functions/kaizen-regression.fn.ts` |
| Tests | apps/server | `src/services/kaizen/__tests__/golden-dataset.test.ts` |
| Tests | apps/server | `src/services/kaizen/__tests__/drift-detection.test.ts` |

## Database Schema

### Supabase -- `golden_dataset_items` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `prompt` | text | NOT NULL |
| `expected_output` | jsonb | NOT NULL |
| `baseline_scores` | jsonb | NOT NULL |
| `question_type` | varchar(50) | NOT NULL |
| `bloom_level` | varchar(20) | NOT NULL |
| `clinical_domain` | varchar(100) | NOT NULL |
| `difficulty` | varchar(20) | NOT NULL |
| `version` | integer | NOT NULL, DEFAULT 1 |
| `is_active` | boolean | NOT NULL, DEFAULT true |
| `created_by` | uuid | FK -> auth.users |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Supabase -- `regression_results` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `run_at` | timestamptz | NOT NULL, DEFAULT now() |
| `avg_composite_score` | numeric(5,3) | NOT NULL |
| `baseline_composite_score` | numeric(5,3) | NOT NULL |
| `drift_detected` | boolean | NOT NULL, DEFAULT false |
| `per_metric_results` | jsonb | NOT NULL |
| `items_tested` | integer | NOT NULL |
| `duration_ms` | integer | NOT NULL |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/kaizen/golden-dataset` | institutional_admin | List golden dataset items |
| POST | `/api/v1/kaizen/golden-dataset` | institutional_admin | Add golden dataset item |
| PATCH | `/api/v1/kaizen/golden-dataset/:id` | institutional_admin | Update item |
| DELETE | `/api/v1/kaizen/golden-dataset/:id` | institutional_admin | Remove item |
| POST | `/api/v1/kaizen/regression/run` | institutional_admin | Trigger manual regression run |
| GET | `/api/v1/kaizen/regression/results` | institutional_admin | Get regression result history |

## Dependencies
- **Blocked by:** S-IA-37-1 (lint engine infrastructure exists)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (12)
1. POST /golden-dataset creates item with valid data
2. GET /golden-dataset returns items for institution
3. PATCH /golden-dataset/:id updates item and increments version
4. DELETE /golden-dataset/:id deactivates item
5. Regression run compares output against baseline scores
6. Drift detected when composite drops > 0.5
7. Per-metric drift detected when individual metric drops > 1.0
8. Regression results stored with timestamp
9. `kaizen.drift.detected` event emitted on drift
10. Weekly Inngest schedule configured correctly
11. Unauthorized user gets 403
12. GoldenDatasetError thrown for invalid operations

## Implementation Notes
- Golden dataset should cover diversity: different question types, Bloom levels, difficulty, clinical domains
- Baseline scores captured when golden items are first curated (snapshot of "known good" generation)
- Drift detection uses statistical comparison: mean + standard deviation from baseline
- Consider versioning golden dataset -- when items are updated, preserve historical baselines
- Weekly schedule preferred over nightly (regression is expensive -- runs 50 full generations)
- Regression results feed into the admin dashboard KPI cards (E-36)
- Private fields with `#` syntax, constructor DI per architecture rules
