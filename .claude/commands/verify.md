---
description: Run all checks. typecheck + lint + build + story-specific smoke test. All must pass before /review.
allowed-tools: Bash, Read
---

Run all verification checks. Every check must pass. Zero tolerance for errors or warnings.

---

## Step 1 — TypeScript

```bash
pnpm run typecheck 2>&1
```

Expected: no errors. Zero. If ANY error: stop and fix it before continuing.
`@ts-ignore` is not a fix. Resolve the type problem.

---

## Step 2 — Lint

```bash
pnpm run lint 2>&1
```

Expected: no warnings, no errors. Fix all issues. No `eslint-disable` comments unless they were pre-existing in the prototype (don't add new ones).

---

## Step 3 — Build

```bash
pnpm run build 2>&1 | tail -30
```

Expected: build succeeds. No TypeScript errors during build. No missing module imports.

---

## Step 4 — Story-Specific Smoke Test

Determine story type from the current story file and run the appropriate check:

### If this is an INFRASTRUCTURE story (P1-001, P1-002, P1-003, P1-007):
```bash
# Monorepo builds
pnpm run build --filter=* 2>&1 | grep -E "error|Error|FAIL"

# Packages resolve
pnpm run typecheck --filter=@msm/* 2>&1

# Env validation
node -e "import('./backend/src/config/env.ts').then(m => m.validateEnv())" 2>&1
```

### If this is a DATABASE story (P1-004, P1-005, P1-006):
```bash
# Supabase migration applied
npx supabase db diff 2>&1 | grep -E "pending|error"

# Neo4j node counts (after seeding)
node scripts/validate-graph.ts 2>&1
# Expected output format:
#   Institution nodes: [N] ✅
#   School nodes: [N] ✅
#   USMLE_System nodes: 16 ✅
#   USMLE_Topic nodes: ~200 ✅
#   Orphan nodes: 0 ✅
#   Missing constraints: 0 ✅
```

### If this is a PIPELINE / INGESTION story (P1-009 through P1-015):
```bash
# Smoke test with test fixture
node scripts/smoke-test-ingestion.ts --file fixtures/test-syllabus.pdf 2>&1
# Expected: upload record created, content_chunks > 0, embeddings created

# Check dual-write happened
node -e "
const { supabase } = require('./backend/src/lib/supabase');
supabase.from('content_chunks').select('count').then(r => console.log('chunks:', r.data))
" 2>&1
```

### If this is a GENERATION PIPELINE story (P1-016 through P1-023):
```bash
# LangGraph state graph compiles
node -e "import('./backend/src/pipeline/graph.ts').then(m => console.log('graph:', m.graph ? 'OK' : 'FAIL'))" 2>&1

# Pipeline node runs in isolation
node scripts/smoke-test-pipeline-node.ts --node [node-name] 2>&1
# Expected: node runs with fixture input and produces typed output

# Streaming: STATE_DELTA events fire
curl -s -N -X POST http://localhost:3001/api/v1/generate \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "test-course-id", "prompt": "generate a question about hypernatremia"}' \
  | head -20
# Expected: Server-Sent Events with STATE_DELTA events before TEXT_MESSAGE
```

### If this is a WORKBENCH / FRONTEND story (P1-024 through P1-029):
```bash
# Component renders without runtime errors
pnpm run test -- frontend/src/[component-path].test.tsx 2>&1

# API endpoint returns expected shape
curl -s -H "Authorization: Bearer $TEST_JWT" \
  http://localhost:3001/api/v1/[endpoint] | jq 'keys'
# Verify keys match the TypeScript interface from 06_SCREEN_BACKEND_MAP.md
```

### For ALL story types — check DualWrite:
```bash
# Any story that writes data: verify Supabase record AND Neo4j node exist
# Run after smoke test
node scripts/check-dual-write.ts --storyId $STORY_ID 2>&1
# Expected: Supabase: ✅ | Neo4j: ✅ | sync_status: synced
```

---

## Step 5 — Print Result

If ALL pass:
```
═══════════════════════════════════════════════
VERIFY COMPLETE — ALL PASS ✅
═══════════════════════════════════════════════
TypeScript:    ✅ 0 errors
Lint:          ✅ 0 warnings
Build:         ✅ succeeds
Smoke test:    ✅ [description of what was tested]
DualWrite:     ✅ Supabase + Neo4j consistent | N/A

Ready for: /review
═══════════════════════════════════════════════
```

If ANY fail:
```
═══════════════════════════════════════════════
VERIFY FAILED — DO NOT PROCEED ❌
═══════════════════════════════════════════════
TypeScript:    ❌ [N] errors
  [paste first 5 errors]

Lint:          ✅
Build:         ❌
  [paste error]

Smoke test:    ❌
  [paste failure]
═══════════════════════════════════════════════
Fix all failures. Re-run /verify. Do not run /review until all pass.
```
