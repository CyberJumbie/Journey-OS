---
name: ideation
description: "Invoke when running /feature, /user-flow, /epic, or /decompose commands. Covers the full ideation pipeline from features through sprint decomposition. Requires doc-manifest.yaml to exist (run /classify first)."
---

# Skill: Ideation Pipeline

## Prerequisites
- `.context/doc-manifest.yaml` must exist (run `/classify` first)
- `.context/spec/personas/` must be populated (run `/personas` first)

## Principles

### Every Claim is Sourced
Every feature, flow step, and story must cite its source:
`[DOC_NAME § Section Heading]`

If a claim cannot be traced to a source document, it is flagged as
an assumption and requires human confirmation.

### Vertical Slices Only
Every user story cuts through ALL layers of the stack:
Model → Repository → Service → Controller → View → Tests

Forbidden: horizontal slices like "build all models" or "build all endpoints."

### Size Constraints
- Features: 2-3 sentence description, maps to 1+ screens
- User flows: 5-15 steps per happy path
- Epics: 1-3 sprints each, 2-5 per feature
- Stories per sprint: 3-8 (no more)
- Story size: S (2-3 files), M (4-6), L (7-10), XL (split it)

## RLM Usage in Ideation

For each command, use RLM to read source docs. Never load full docs
into context. The pattern:

```
1. Read doc-manifest.yaml (small, read directly)
2. Identify which source docs are relevant (by role + key entities)
3. Use RLM to extract relevant sections from those docs
4. Synthesize extracted content into the output artifact
5. Cite every claim: [DOC § Section]
```

## Feature → Flow → Epic → Story Mapping

Maintain a cross-reference map at `.context/spec/maps/FEATURE-EPIC-MAP.md`:

```
F-01 Knowledge Graph
  ├── UF-01 Faculty creates content (persona: faculty)
  ├── UF-02 Admin views coverage (persona: admin)
  ├── E-01 KG Foundation (Sprint 1-2)
  │   ├── STORY-1.1 Layer 1 seeder
  │   ├── STORY-1.2 Layer 2 frameworks
  │   └── ...
  └── E-02 KG Content Pipeline (Sprint 3-4)
      └── ...
```

Update this map after every `/feature`, `/epic`, and `/decompose`.

## Dependency Detection
When decomposing stories, check for:
- Data dependencies: does Story B need tables/nodes created by Story A?
- API dependencies: does Story B call endpoints created by Story A?
- Component dependencies: does Story B use UI components from Story A?
- Seed data dependencies: does Story B need test data from Story A?

Flag these in SPRINT-N-DEPENDENCY-MAP.md.
