---
name: briefing
description: "Invoke when running /brief to generate self-contained context packets for stories. The most important skill in the framework. A brief must contain EVERYTHING needed for implementation with zero external lookups."
---

# Skill: Story Brief Generation

## The Self-Containment Rule
A story brief is a contract. It must contain every TypeScript interface,
every SQL statement, every Cypher query, every API request/response shape,
every test fixture, and every acceptance criterion INLINE.

"See §3 of the architecture doc" is NEVER acceptable.
The actual content from §3 must be copied into the brief.

If the brief is missing information that Claude Code needs during
implementation, that is a brief quality bug. Fix the brief, don't
patch with /design-query.

## RLM Extraction Strategy

For each of the 15 required sections, use RLM to extract from
the relevant source document:

| Section | Source Documents (by role) |
|---------|--------------------------|
| Summary | product + architecture |
| Task Breakdown | architecture + code standards |
| Data Model | schema (database DDL or node registry) |
| Database Schema | schema (exact SQL or Cypher) |
| API Contract | schema (API contract doc) |
| Frontend Spec | reference (design spec) + code standards |
| Files to Create | code standards (directory structure) |
| Dependencies | architecture + prior stories |
| Test Fixtures | schema (seed data or examples) |
| API Test Spec | code standards (testing patterns) |
| E2E Test Spec | process (critical journey list) |
| Acceptance Criteria | synthesized from all above |
| Source References | all docs cited |
| Environment | process (deployment doc) |
| Figma Prototype | reference (design spec) |

## Extraction Pattern per Section

```
For section "Data Model":
1. From doc-manifest.yaml, find docs with role=schema
2. RLM: load the schema doc
3. RLM: extract(doc, "section matching this story's data domain")
4. Spawn Haiku sub-LLM: "Extract the TypeScript interface for [entity].
   Return the full interface with all fields, types, and JSDoc comments."
5. Paste the result into the brief verbatim
6. Add citation: [DATABASE_DDL.md § assessment_items table]
```

## Quality Checklist
Before saving a brief, verify:
- [ ] All TypeScript interfaces are complete (not truncated)
- [ ] SQL/Cypher includes all columns/properties
- [ ] API contract has request AND response shapes
- [ ] API contract includes error responses (400, 401, 403)
- [ ] Test fixtures include both valid and invalid examples
- [ ] API test spec covers CRUD + validation + auth
- [ ] E2E spec is present OR explicitly marked "not a critical journey"
- [ ] Every section has at least one [DOC § Section] citation
- [ ] Acceptance criteria are numbered and testable
- [ ] Files to create are in implementation order

## Brief Size Target
A good brief is 3-8KB. Under 3KB suggests missing detail.
Over 10KB suggests included content that isn't needed for this story.
