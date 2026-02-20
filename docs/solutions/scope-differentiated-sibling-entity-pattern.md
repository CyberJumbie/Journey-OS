---
name: scope-differentiated-sibling-entity-pattern
tags: [domain-model, shared-table, scope-filtering, repository, dual-write]
story: STORY-IA-2
date: 2026-02-20
---

# Scope-Differentiated Sibling Entity Pattern

Two domain entities (e.g., ILO and SLO) share a single database table, differentiated by a `scope` column. Each entity gets its own types, model, repository, service, and tests — but queries are silently filtered by scope to prevent cross-entity leakage.

## Problem

ILOs (institution-scoped) and SLOs (course-scoped) share `student_learning_objectives`. Without strict scope filtering, a query for SLOs could return ILOs and vice versa.

## Solution

### 1. Shared types in a common file

```typescript
// packages/types/src/objective/objective-common.types.ts
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
export type ObjectiveStatus = "draft" | "active" | "archived";
export type SyncStatus = "pending" | "synced" | "failed";
```

### 2. Separate type files per entity

```typescript
// ilo.types.ts — institution-scoped, no course_id
export interface ILO { institution_id: string; /* ... */ }

// slo.types.ts — course-scoped, has course_id
export interface SLO { course_id: string; institution_id: string; /* ... */ }
```

### 3. Repository scope constant

Every repository declares a `SCOPE` constant and includes it in **every query**:

```typescript
const SCOPE = "session"; // or "institutional" for ILO

async findById(id: string): Promise<SLO | null> {
  const { data } = await this.#supabaseClient
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .eq("scope", SCOPE)  // <-- NEVER omit this
    .maybeSingle();
  return data;
}
```

### 4. Partial indexes per scope

```sql
CREATE UNIQUE INDEX idx_slo_code_per_course
  ON student_learning_objectives(course_id, code) WHERE scope = 'session';
CREATE UNIQUE INDEX idx_ilo_code_per_institution
  ON student_learning_objectives(institution_id, code) WHERE scope = 'institutional';
```

### 5. Generalized error classes

Error constructors accept a generic `scopeId` parameter instead of entity-specific names:

```typescript
export class DuplicateObjectiveCodeError extends JourneyOSError {
  constructor(code: string, scopeId: string) {
    super(`Objective code "${code}" already exists in scope ${scopeId}`, "DUPLICATE_OBJECTIVE_CODE");
  }
}
```

### 6. Separate Neo4j labels and relationships

- ILO: `(Institution)-[:DEFINES]->(ILO)`
- SLO: `(Course)-[:HAS_SLO]->(SLO)`

Never combine into a single `Objective` label.

## When to Use

- Two+ domain entities that share a database table with a discriminator column
- Entities have mostly overlapping columns but different scoping (course vs institution)
- Entities need independent indexes and uniqueness constraints

## When Not to Use

- Entities with fundamentally different schemas — use separate tables
- Only one entity uses the table — no need for scope filtering
- The discriminator has 3+ values — consider if single-table inheritance is the right pattern

## Checklist for Adding a New Sibling

1. Create `{entity}.types.ts` importing from `objective-common.types.ts`
2. Add barrel export to `objective/index.ts` (re-read after edit — eslint hook may strip)
3. Rebuild types: `cd packages/types && npx tsc -b tsconfig.json`
4. Apply partial indexes via Supabase migration with `WHERE scope = '{value}'`
5. Generalize error constructors if they reference the scope entity (e.g., institution → scopeId)
6. Create model with `#private` fields, `fromRow()`, `toDTO()`, `toNeo4jProperties()`
7. Create repository with `SCOPE` constant in every query
8. Create service with DualWrite, using the sibling service as a template
9. Mirror sibling test file, updating scope/entity names
10. Run sibling tests to verify no regressions from shared code changes
