# /review — Audit code against all quality rules

Run the full quality audit. Produces a scored review with BLOCKING/HIGH/MEDIUM issues.
This is the gate before /commit. All BLOCKING issues must be resolved first.

## Step 1: Run automated checks

```bash
echo "=== LAYER VIOLATIONS ==="
# Logic in routes?
grep -rn "if\|switch\|async.*=>\s*{" backend/src/routes/ --include="*.ts" \
  | grep -v "authMiddleware\|validateMiddleware\|router\." | head -10

# DB in controllers?
grep -rn "supabase\.\|neo4j\.\|\.query\(" backend/src/controllers/ --include="*.ts" | head -10

# DB in services (outside repository calls)?
grep -rn "\.from(\|session\.run\|driver\.session" backend/src/services/ --include="*.ts" | head -10

# Business logic in repos?
grep -rn "role\|permission\|forbidden\|if.*status.*===\|throw.*Forbidden" \
  backend/src/repositories/ --include="*.ts" | head -5

echo "=== SINGLETON VIOLATIONS ==="
grep -rn "createClient(\|neo4j\.driver(\|new Anthropic(\|new OpenAI(" \
  backend/src/{routes,controllers,services,repositories,pipeline,ingestion}/ \
  --include="*.ts" 2>/dev/null | head -10

echo "=== FACTORY BYPASS ==="
grep -rn "new LlamaParseParser\|new PdfplumberParser\|new PdfParseParser" \
  backend/src/ --include="*.ts" 2>/dev/null | grep -v "PdfParserFactory.ts" | head -5

echo "=== DUALWRITE BYPASS ==="
grep -rn "session\.run\|driver\.session" backend/src/ --include="*.ts" \
  | grep -v "graph\.repository\|Neo4jClient\|dual-write" | head -5
grep -rn "\.from(.*)\.(insert\|update\|delete)" backend/src/ --include="*.ts" \
  | grep -v "repositories/\|dual-write" | head -5

echo "=== NEO4J CREATE (should be MERGE) ==="
grep -rn "\bCREATE \b" backend/src/ seeder/src/ --include="*.ts" \
  | grep -v "CREATE EXTENSION\|CREATE INDEX\|CREATE TABLE\|CREATE POLICY\|// " | head -5

echo "=== INLINE PROMPTS ==="
grep -rn "You are a\|Generate a\|Write a clinical\|As a medical" \
  backend/src/pipeline/nodes/ --include="*.ts" 2>/dev/null | head -5

echo "=== WRONG MODEL (Haiku in generation nodes) ==="
grep -rn "claude-haiku" backend/src/pipeline/nodes/ --include="*.ts" \
  | grep -v "context-compiler\|classifier\|concept-extractor" | head -5

echo "=== OPUS IN PHASE 1 ==="
grep -rn "claude-opus" backend/src/ --include="*.ts" 2>/dev/null | head -5

echo "=== ATOMIC VIOLATIONS (fetch in atoms/molecules) ==="
grep -rn "useQuery\|useMutation\|fetch(\|axios\." \
  frontend/src/components/{atoms,molecules}/ --include="*.tsx" 2>/dev/null | head -10

echo "=== GOD COMPONENTS (> 150 lines) ==="
find frontend/src/components/ -name "*.tsx" 2>/dev/null | while read f; do
  lines=$(wc -l < "$f")
  [ "$lines" -gt 150 ] && echo "GOD: $f ($lines lines)"
done

echo "=== STORAGE API ==="
grep -rn "localStorage\|sessionStorage" frontend/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5

echo "=== BARE FETCH IN COMPONENTS ==="
grep -rn "fetch(\|axios\." frontend/src/{app,components}/ --include="*.tsx" \
  | grep -v "lib/api-client\|// " 2>/dev/null | head -5

echo "=== TYPESCRIPT ERRORS ==="
cd frontend && npx tsc --noEmit 2>&1 | grep "error TS" | head -10; cd ..
cd backend && npx tsc --noEmit 2>&1 | grep "error TS" | head -10; cd ..

echo "=== SKINNY NODE VIOLATIONS ==="
grep -rn "SET.*content\s*=\|SET.*vignette\|SET.*stem\b\|SET.*body\s*=" \
  backend/src/ --include="*.ts" 2>/dev/null | head -5
```

## Step 2: Score and report

For each section above:
- **0 results** = ✅ PASS
- **Any results** = classify as BLOCKING / HIGH / MEDIUM

| Check | Severity |
|-------|----------|
| Layer violations | BLOCKING |
| Singleton violations | BLOCKING |
| DualWrite bypass | BLOCKING |
| Neo4j CREATE | BLOCKING |
| TypeScript errors | BLOCKING |
| Factory bypass | HIGH |
| Inline prompts | HIGH |
| Wrong model | HIGH |
| Atomic violations | MEDIUM |
| God components | MEDIUM |
| Bare fetch | MEDIUM |
| Storage API | MEDIUM |
| Skinny node | LOW |

## Step 3: Output

```markdown
## Review: [branch or story ID]

### ❌ BLOCKING (must fix before merge)
- [LAYER] backend/src/services/upload.service.ts:47 — direct Supabase query
  FIX: Move .from('uploads').insert() to upload.repository.ts

### ⚠ HIGH (should fix before merge)
- [MODEL] backend/src/pipeline/nodes/VignetteBuilderNode.ts:23 — uses claude-haiku
  FIX: Change to claude-sonnet-4-5-20250929

### ℹ MEDIUM (file an issue)
- [GOD] frontend/src/components/organisms/QuestWorkbench/QuestWorkbench.tsx (187 lines)
  FIX: Split ChatPanel and QuestionPreviewPanel into separate files

### ✅ PASSING
- Layer violations: 0
- Singleton violations: 0
- DualWrite: correct
- TypeScript: 0 errors

### Verdict: CHANGES_REQUESTED | APPROVED
```

## Step 4: If APPROVED → proceed to /commit
