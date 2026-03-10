---
description: Answer a question from the reference docs without loading them into the main context window. Use when slim context files don't have the answer.
argument-hint: '"your question here"'
allowed-tools: Bash, Read
---

You need to answer: **$ARGUMENTS**

This query costs ~200 tokens in the main context (just the answer JSON).
It does NOT load the full reference docs (which would cost 40–80K tokens each).

---

## Step 1 — Identify Which Reference Doc Has the Answer

Based on the question, pick the most likely source:

| Question type | Doc to check |
|--------------|-------------|
| Stack, framework, TypeScript conventions | 04_TECHNICAL_CONTEXT.md |
| Phase scope, epic deliverables, what's deferred | 02_DEVELOPMENT_ROADMAP.md |
| API shape for a specific screen | 06_SCREEN_BACKEND_MAP.md |
| Why a design decision was made | 05_GAP_ANALYSIS.md |
| Neo4j node labels, relationship names | packages/shared-types/NODE_REGISTRY |
| Supabase table schema, columns, RLS | backend/supabase/migrations/ |

---

## Step 2 — Targeted Read (surgical, not full-doc)

```bash
# Search for the relevant section rather than loading the whole doc
grep -n "$SEARCH_TERM" docs/reference/04_TECHNICAL_CONTEXT.md | head -10
# Then read just those lines:
sed -n 'START,ENDp' docs/reference/04_TECHNICAL_CONTEXT.md
```

Read only the section that answers the question. Stop when you have the answer.
Target: 200–500 tokens of source material, not thousands.

---

## Step 3 — Answer Format

Return only the answer. No preamble.

```
DESIGN QUERY ANSWER
─────────────────────────────────────────────
Question: [the question]
Source: [doc name § section]

Answer: [direct answer in 1–5 sentences]

Implication for this story:
[One sentence: what this means for the implementation]
─────────────────────────────────────────────
Tokens used: ~[N] (vs ~[40-80K] to load full doc)
```

---

## When the Answer Isn't in Reference Docs

If the reference docs don't answer it, try in this order:
1. `.context/` slim files (already loaded)
2. `docs/solutions/` for prior decisions
3. `packages/shared-types/` for type definitions
4. `backend/supabase/migrations/` for schema

If still not found:
```
DESIGN QUERY — NO ANSWER FOUND
─────────────────────────────────────────────
Question: [the question]
Checked: [list of docs searched]

This appears to be an undocumented decision.
Options:
  1. Make a reasonable call based on patterns in the codebase
  2. Flag as an UNKNOWN in /plan and document the decision made
  3. Ask for clarification before planning
─────────────────────────────────────────────
```
