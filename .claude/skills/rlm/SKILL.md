---
name: rlm
description: "Invoke when processing any .context/source/ document over 10KB, when extracting data model details from technical specs, when finding patterns across multiple docs, or when building story briefs that need cross-doc synthesis. Do NOT invoke for small files (<5KB) like SESSION_STATE.md, coverage.yaml, or individual briefs."
---

# Skill: RLM — Recursive Language Model

## Workflow
1. Initialize REPL: `python3 .claude/skills/rlm/scripts/rlm_repl.py`
2. Load target document into REPL as variable
3. Use `peek()` to sample structure (first 1000 chars)
4. Use `chunk()` to split into processable sections
5. For each chunk, spawn `rlm-subcall` subagent with extraction question
6. Aggregate sub-LLM results in REPL
7. Return structured result to root session

## REPL Functions
- `load(path)` → loads document into `source_docs{}` dictionary
- `peek(doc, start=0, end=1000)` → sample without full load
- `chunk(text, size=4000)` → split by sections or token count
- `search(query, docs)` → regex + keyword search across loaded docs
- `extract(doc, section_heading)` → pull specific section by heading

## When to Use
- Any .context/source/ file over 10KB
- Cross-document synthesis (e.g., reconciling personas across product + architecture docs)
- Extracting inline code blocks, TypeScript interfaces, SQL, or Cypher from specs
- Building story briefs that pull from 3+ source documents

## When NOT to Use
- SESSION_STATE.md (<1KB) — read directly
- coverage.yaml (<2KB) — read directly
- Individual story briefs (<5KB) — read directly
- Solution docs (<2KB) — read directly
- doc-manifest.yaml (<3KB) — read directly
