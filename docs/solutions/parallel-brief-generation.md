---
name: parallel-brief-generation
tags: [briefs, spec-pipeline, parallel, subagents]
story: spec-briefs-batch-1
date: 2026-02-19
---
# Parallel Brief Generation

## Problem
Generating briefs sequentially is slow — each brief requires reading 4-6 source docs and producing ~1000 lines. Five briefs would take 15-20 minutes sequentially.

## Solution
Launch one subagent per brief in parallel. Briefs are independent artifacts (no shared state), so there's no risk of the data-loss bug that affected coverage.yaml during decompose-all.

### Steps
1. Read backlog files to confirm exact story IDs for ready stories
2. Read all story files to extract acceptance criteria, dependencies, implementation layers
3. Launch N parallel Task agents (subagent_type: general-purpose), each with:
   - Full story details inlined in the prompt
   - List of source docs to read (from doc-manifest.yaml)
   - All 16 section requirements
   - Architecture rules from CLAUDE.md
4. Wait for all agents to complete
5. Verify all brief files exist on disk
6. Commit as a single batch

### Key Details
- Each agent reads 4-6 source docs directly (no RLM needed for docs under 100KB)
- Agents write ONLY their brief file — no shared tracking files
- Main orchestrator handles coverage.yaml updates after all agents finish
- Average agent: ~80K tokens, ~4 minutes

## When to Use
- Generating briefs for 2+ stories that have no dependencies between them
- All stories must be "ready" (zero blockers)

## When Not to Use
- Stories with shared dependencies where brief content might conflict
- Single brief generation (just use /brief directly)
