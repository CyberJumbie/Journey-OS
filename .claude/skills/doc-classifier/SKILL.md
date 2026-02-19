---
name: doc-classifier
description: "Invoke when running /classify on a new project. Handles document discovery, role classification, tech stack detection, persona extraction, and doc-manifest.yaml generation. Also invoke when new documents are added to .context/source/ after initial classification."
---

# Skill: Document Classifier

## Purpose
Classify project source documents into roles so the framework knows where to find
product context, architecture decisions, schema definitions, code standards, and
design specs.

## Document Roles

| Role | What It Contains | Examples |
|------|-----------------|----------|
| `orientation` | Project overview, reading order, quick-start | START-HERE.md, README.md |
| `product` | Personas, pain points, success metrics, roadmap | PRODUCT_BRIEF.md, ROADMAP.md |
| `architecture` | System design, data flow, tech choices, subsystem specs | ARCHITECTURE.md, WORKBENCH_SPEC.md |
| `schema` | Exact contracts: tables, nodes, endpoints, types | DDL.md, API_CONTRACT.md, NODE_REGISTRY.md |
| `process` | How to build: code standards, deployment, seeding | CODE_STANDARDS.md, DEPLOYMENT.md |
| `reference` | Deep reference: design specs, examples, research | DESIGN_SPEC.md, screens/, blueprints |

## Classification Strategy

### If Numbered Tiers Exist (00-/01-/02-/03-/04-/05-)
Map directly:
- 00-* → orientation
- 01-* → product
- 02-* → architecture
- 03-* → schema
- 04-* → process
- 05-* → reference

### If Flat or Partial Structure
For each document:
1. RLM peek first 2000 chars + last 500 chars
2. Spawn Haiku sub-LLM with classification prompt:
   "Given this document excerpt, classify its role as one of:
    orientation, product, architecture, schema, process, reference.
    Also extract: key entities, whether it defines personas (y/n),
    API endpoints (y/n), database schemas (y/n), visual design (y/n)."
3. Store result in manifest

## Priority Stack (Default)
When documents disagree, resolve in this order:
1. Schema docs (exact contracts)
2. Architecture docs (system design)
3. Process docs (code standards)
4. Reference docs (design specs)
5. Product docs (business context)
6. Orientation docs (overviews)

Human can override in .context/priority-stack.md.

## Tech Stack Detection
From architecture and schema docs, extract:
- Frontend framework (Next.js, React, Vue, etc.)
- Backend framework (Express, Fastify, Django, etc.)
- Databases (PostgreSQL, Neo4j, MongoDB, etc.)
- Testing tools (vitest, jest, Playwright, etc.)
- Deployment targets (Vercel, AWS, Railway, etc.)
- AI/ML services (if any)

## Output
- `.context/doc-manifest.yaml` — full classification
- `.context/priority-stack.md` — human-editable conflict resolution order
