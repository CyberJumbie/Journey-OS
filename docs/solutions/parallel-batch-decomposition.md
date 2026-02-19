---
name: parallel-batch-decomposition
tags: [spec-pipeline, parallel-agents, decompose, orchestration]
story: decompose-all
date: 2026-02-19
---
# Parallel Batch Decomposition Pattern

## Problem
Decomposing 45 epics into 166 stories sequentially takes too long. Need to parallelize without creating conflicts in shared tracking files.

## Solution
Split work into independent batches by sprint group. Each subagent writes ONLY its artifact files. The main orchestrator handles all shared state updates after completion.

### Rules
1. **Subagents write artifacts only** — story files, spec files, etc.
2. **Orchestrator owns tracking** — coverage.yaml, maps, memory files updated ONCE after all agents finish.
3. **Provide full context in agent prompts** — lane assignments, templates, dependency info, architecture rules. Agents can't read previous conversation.
4. **Group by sprint** — stories within a sprint can have intra-epic deps but cross-sprint deps only need IDs (not content).
5. **Verify after completion** — count files, validate totals, check for missing IDs.

### Batch Sizing
- 4-5 parallel agents works well
- ~25-45 files per agent is manageable
- Each agent needs ~300-500 turns depending on file count

## When to Use
- Any batch spec operation producing >20 files
- Story generation, brief generation, test generation

## When Not to Use
- Single-file operations
- Sequential operations where each step depends on the previous result
- Files that need to cross-reference each other's content (not just IDs)
