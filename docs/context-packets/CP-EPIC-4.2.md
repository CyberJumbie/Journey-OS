# CP-EPIC-4.2 — Exam Assembly (Weeks 27–28)
**Stories:** P4-005 · P4-006 · P4-007 · P4-008
**Auto-loaded by:** `/story P4-00N` where N = 5–8

---

## What This Epic Builds

The full exam assembly pipeline: constraint-based blueprint form → MIP solver (Python/PuLP on port 8001) → exam preview with drag-to-reorder and manual question swap → finalize and publish → basic timed exam delivery with answer recording and score calculation.

**Exit gate:** At least one real exam assembled and administered. MIP solver produces optimal item selection in < 30 seconds.

---

## Prerequisites

- P4-001: item bank filterable (candidate pool query)
- Epic 2.1: tags on items (bloom_level, usmle_system, difficulty, critic_composite_score)
- P2-012: Socket.io (for exam:assigned notification)
- Python service setup: `pip install fastapi uvicorn pulp pydantic` in `python/mip-solver/`

---

## Phase 4 SQL Migration (Epic 4.2)

```sql
-- backend/supabase/migrations/20260202000000_phase4_exams.sql

CREATE TABLE exams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  course_id        UUID NOT NULL,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  status           TEXT DEFAULT 'draft',  -- 'draft' | 'published' | 'completed' | 'archived'
  time_limit_minutes INTEGER,
  total_questions  INTEGER,
  blueprint        JSONB,                 -- constraint spec used for MIP solver
  blueprint_validation JSONB,            -- validation result from solver
  solve_time_ms    INTEGER,
  mip_status       TEXT,                 -- 'optimal' | 'infeasible' | 'timeout' | 'greedy_fallback'
  neo4j_node_id    TEXT,
  sync_status      TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT now(),
  published_at     TIMESTAMPTZ
);

CREATE TABLE exam_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES assessment_items(id),
  position    INTEGER NOT NULL,          -- order in exam
  points      FLOAT DEFAULT 1.0,
  UNIQUE (exam_id, item_id),
  UNIQUE (exam_id, position)
);

CREATE TABLE exam_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id),
  student_id  UUID NOT NULL REFERENCES auth.users(id),
  status      TEXT DEFAULT 'assigned',   -- 'assigned' | 'in_progress' | 'submitted' | 'scored'
  start_time  TIMESTAMPTZ,
  end_time    TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  raw_score   FLOAT,
  pct_score   FLOAT,
  correct_count INTEGER,
  neo4j_node_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE student_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES assessment_items(id),
  selected_option TEXT NOT NULL,          -- 'a' | 'b' | 'c' | 'd' | 'e'
  is_correct      BOOLEAN,
  responded_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, item_id)
);

-- RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty manage own exams" ON exams FOR ALL USING (created_by = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'institution_admin'));

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students see own sessions" ON exam_sessions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "faculty see course sessions" ON exam_sessions FOR SELECT USING (
  auth.uid() IN (SELECT created_by FROM exams WHERE id = exam_id)
);

ALTER TABLE student_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students manage own responses" ON student_responses FOR ALL USING (
  session_id IN (SELECT id FROM exam_sessions WHERE student_id = auth.uid())
);
```

---

## MIP Solver: Python Service

### Setup
```bash
cd python/mip-solver
pip install fastapi uvicorn pulp pydantic

# Start (dev)
uvicorn main:app --port 8001 --reload

# Dockerfile (for Railway deployment)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Full solver.py
```python
# python/mip-solver/solver.py
from pulp import LpProblem, LpVariable, LpMinimize, lpSum, PULP_CBC_CMD, LpStatus
import math, time

def solve_exam(items, total_q, bloom_dist, diff_mix, min_critic, exclude_ids, 
               usmle_dist=None, time_limit=30):
    start = time.time()

    # Filter: exclude hard-excluded items and below critic threshold
    candidates = [i for i in items 
                  if i['id'] not in exclude_ids 
                  and i['critic_composite_score'] >= min_critic]

    if len(candidates) < total_q:
        return {"status": "infeasible", "selected_item_ids": [], "message": f"Only {len(candidates)} items meet criteria, need {total_q}"}

    prob = LpProblem("exam_assembly", LpMinimize)
    x = {item['id']: LpVariable(f"x_{item['id']}", cat='Binary') for item in candidates}

    # Objective: maximize average critic score (minimize negative)
    prob += -lpSum(item['critic_composite_score'] * x[item['id']] for item in candidates)

    # Constraint 1: total questions
    prob += lpSum(x[i] for i in x) == total_q

    # Constraint 2: Bloom distribution (±5% tolerance)
    for bloom_level, target_pct in bloom_dist.items():
        bloom_items = [i['id'] for i in candidates if i['bloom_level'] == int(bloom_level)]
        if bloom_items:
            lo = math.floor((target_pct - 0.05) * total_q)
            hi = math.ceil((target_pct + 0.05) * total_q)
            prob += lpSum(x[i] for i in bloom_items) >= max(0, lo)
            prob += lpSum(x[i] for i in bloom_items) <= hi

    # Constraint 3: Difficulty mix (±5% tolerance)
    for diff, target_pct in diff_mix.items():
        diff_items = [i['id'] for i in candidates if i['difficulty'] == diff]
        if diff_items:
            lo = math.floor((target_pct - 0.05) * total_q)
            hi = math.ceil((target_pct + 0.05) * total_q)
            prob += lpSum(x[i] for i in diff_items) >= max(0, lo)
            prob += lpSum(x[i] for i in diff_items) <= hi

    # Constraint 4: USMLE system distribution (optional)
    if usmle_dist:
        for system, target_pct in usmle_dist.items():
            sys_items = [i['id'] for i in candidates if i['usmle_system'] == system]
            if sys_items:
                lo = math.floor((target_pct - 0.08) * total_q)  # wider tolerance for systems
                hi = math.ceil((target_pct + 0.08) * total_q)
                prob += lpSum(x[i] for i in sys_items) >= max(0, lo)
                prob += lpSum(x[i] for i in sys_items) <= hi

    prob.solve(PULP_CBC_CMD(timeLimit=time_limit, msg=0))

    elapsed_ms = int((time.time() - start) * 1000)
    status = LpStatus[prob.status]

    if status == "Infeasible":
        # Fallback: greedy selection by critic score
        sorted_candidates = sorted(candidates, key=lambda i: i['critic_composite_score'], reverse=True)
        selected_ids = [i['id'] for i in sorted_candidates[:total_q]]
        return {"status": "greedy_fallback", "selected_item_ids": selected_ids, "solve_time_ms": elapsed_ms, "gap_pct": 1.0}

    selected_ids = [item_id for item_id, var in x.items() if var.value() == 1]
    return {
        "status": "optimal" if status == "Optimal" else "timeout",
        "selected_item_ids": selected_ids,
        "solve_time_ms": elapsed_ms,
        "gap_pct": 0.0 if status == "Optimal" else 0.1,
    }
```

### Express Integration
```typescript
// backend/src/services/ExamAssemblyService.ts

async assembleExam(constraints: ExamConstraints, courseId: string): Promise<Exam> {
  // 1. Fetch candidate pool from item bank
  const candidates = await itemBankRepo.getCandidates({
    courseId,
    status: 'approved',
    minCriticScore: constraints.minCriticScore || 3.0,
    excludeIds: constraints.excludeItemIds || [],
  });

  // 2. Call MIP solver
  const solverUrl = config.MIP_SOLVER_URL || 'http://localhost:8001';
  let solverResult;
  try {
    const response = await fetch(`${solverUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: candidates,
        total_questions: constraints.totalQuestions,
        bloom_distribution: constraints.bloomDistribution,
        difficulty_mix: constraints.difficultyMix,
        min_critic_score: constraints.minCriticScore || 3.0,
        exclude_item_ids: constraints.excludeItemIds || [],
        usmle_system_distribution: constraints.usmleSystemDistribution || null,
      }),
      signal: AbortSignal.timeout(35000),  // 35s timeout
    });
    solverResult = await response.json();
  } catch (err) {
    // Greedy fallback if solver unavailable
    logger.warn('MIP solver unavailable — using greedy fallback');
    solverResult = this.greedyFallback(candidates, constraints);
  }

  // 3. Build exam from selected IDs
  const selectedItems = candidates.filter(c => solverResult.selected_item_ids.includes(c.id));
  return await dualWriteService.createExam(courseId, constraints, selectedItems, solverResult);
}
```

---

## Blueprint Validation Logic

```typescript
function validateBlueprint(exam: Exam): BlueprintValidation {
  const systems = countBy(exam.questions, q => q.usmle_system);
  const difficulties = countBy(exam.questions, q => q.difficulty);
  const blooms = countBy(exam.questions, q => q.bloom_level);
  const total = exam.questions.length;

  return {
    system_distribution: Object.entries(systems).map(([system, count]) => ({
      system, actual: count, target: Math.round((blueprint.usmleSystemDistribution?.[system] || 0) * total),
      status: Math.abs(count - target) <= 2 ? 'pass' : Math.abs(count - target) <= 4 ? 'warn' : 'fail',
    })),
    difficulty_balance: Object.entries(difficulties).map(([diff, count]) => ({
      difficulty: diff, actual: count, target: Math.round(blueprint.difficultyMix[diff] * total),
      status: Math.abs(count - target) <= 2 ? 'pass' : 'warn',
    })),
    total_questions: total,
    total_points: exam.questions.reduce((sum, q) => sum + q.points, 0),
  };
}
```

---

## New Files (Epic 4.2)

```
python/mip-solver/main.py
python/mip-solver/solver.py
python/mip-solver/requirements.txt
python/mip-solver/Dockerfile
frontend/src/app/(faculty)/exams/new/page.tsx
frontend/src/app/(faculty)/exams/[id]/page.tsx
frontend/src/app/(student)/exams/[sessionId]/take/page.tsx
frontend/src/hooks/useExamBuilder.ts
frontend/src/hooks/useExam.ts
frontend/src/hooks/useExamSession.ts
frontend/src/components/organisms/BlueprintForm/BlueprintForm.tsx
frontend/src/components/molecules/DistributionSlider/DistributionSlider.tsx
frontend/src/components/organisms/BlueprintValidationPanel/BlueprintValidationPanel.tsx
frontend/src/components/organisms/ExamQuestionList/ExamQuestionList.tsx
frontend/src/components/organisms/SwapQuestionModal/SwapQuestionModal.tsx
frontend/src/components/organisms/ExamTimer/ExamTimer.tsx
frontend/src/components/organisms/QuestionNavigator/QuestionNavigator.tsx
backend/src/services/ExamAssemblyService.ts
backend/src/controllers/exam.controller.ts
backend/src/controllers/exam-session.controller.ts
backend/src/services/ExamSessionService.ts
backend/src/repositories/exam.repository.ts
backend/src/repositories/exam-session.repository.ts
backend/src/routes/exam.routes.ts
backend/supabase/migrations/20260202000000_phase4_exams.sql
```

---

## Smoke Tests

```bash
# 1. MIP solver directly
curl -X POST "localhost:8001/solve" -H "Content-Type: application/json" -d '{
  "items": [...50 items from item bank...],
  "total_questions": 20,
  "bloom_distribution": {"3": 0.4, "4": 0.4, "5": 0.2},
  "difficulty_mix": {"Easy": 0.3, "Medium": 0.5, "Hard": 0.2},
  "min_critic_score": 3.0,
  "exclude_item_ids": []
}'
# Expected: { status: "optimal", selected_item_ids: [20 ids], solve_time_ms: < 10000 }

# 2. Full exam assembly via Express
curl -X POST "localhost:3001/api/v1/exams" -H "Authorization: Bearer $JWT" -d '{
  "name": "Cardio Midterm Q1 2026",
  "courseId": "medi-531",
  "totalQuestions": 20,
  "timeLimitMinutes": 30,
  "bloomDistribution": {"3": 0.4, "4": 0.4, "5": 0.2},
  "difficultyMix": {"Easy": 0.3, "Medium": 0.5, "Hard": 0.2},
  "minCriticScore": 3.5
}'
# Expected: exam object with 20 questions, blueprint_validation all pass/warn

# 3. Manual swap
curl -X PATCH "localhost:3001/api/v1/exams/{examId}/questions/{qId}/swap" \
  -H "Authorization: Bearer $JWT" -d '{"replacementItemId":"new-item-uuid"}'

# 4. Finalize
curl -X PATCH "localhost:3001/api/v1/exams/{examId}" \
  -H "Authorization: Bearer $JWT" -d '{"status":"published"}'

# 5. Assign to student + complete delivery
curl -X POST "localhost:3001/api/v1/exams/{examId}/assign" \
  -H "Authorization: Bearer $JWT" -d '{"studentIds":["student-uuid"],"startTime":"...","durationMinutes":30}'
# Login as student, answer all questions, submit
# Check: exam_sessions.pct_score is set, student_responses has 20 rows
```

---

## Failure Modes

1. **MIP solver infeasible** — too few items in bank for constraints → response is `status: 'infeasible'`, UI shows "Not enough questions matching these constraints. Try relaxing Bloom or difficulty requirements."
2. **MIP solver timeout** — solver hits 30s limit → returns best solution found so far (gap_pct > 0) with `status: 'timeout'` — still usable
3. **MIP solver unavailable** (Railway cold start) — `ExamAssemblyService` falls back to greedy selection by critic score, flags `mip_status: 'greedy_fallback'` on exam row
4. **Swap makes blueprint invalid** — re-run `validateBlueprint` after every swap, show warn badges but do NOT block finalize
5. **Student timer runs out** — frontend fires auto-submit; if network fails, server checks `end_time` on every response write and auto-submits server-side
