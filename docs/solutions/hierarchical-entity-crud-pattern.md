---
name: hierarchical-entity-crud-pattern
tags: [hierarchy, crud, parent-child, reorder, cascading-read, dual-write]
story: STORY-F-11
date: 2026-02-20
---
# Hierarchical Entity CRUD Pattern

## Problem
Nested entities (e.g., Course > Section > Session) need parent existence validation before child creation, position-based ordering with drag-and-drop reorder support, and cascading reads that return a full subtree in one response.

## Solution

### Parent Validation
Before creating a child, the service verifies the parent exists:

```typescript
async createSection(courseId: string, request: Omit<CreateSectionRequest, "course_id">): Promise<Section> {
  const course = await this.#courseRepo.findById(courseId);
  if (!course) {
    throw new HierarchyNotFoundError(`Course not found: ${courseId}`);
  }
  // ... create child
}
```

### Auto-Position Assignment
When no position is provided, auto-assign the next position:

```typescript
let position = request.position;
if (position === undefined) {
  const maxPos = await this.#sectionRepo.getMaxPosition(courseId);
  position = maxPos + 1;
}
```

`getMaxPosition` queries the max position value (returns -1 if no children exist, so first child gets position 0).

### Reorder via Postgres RPC
Drag-and-drop reorder sends an ordered array of IDs. Use a Postgres function for atomic position updates:

```typescript
async reorderSections(courseId: string, sectionIds: string[]): Promise<number> {
  // Validate all IDs belong to this parent
  const existing = await this.#sectionRepo.findByCourseId(courseId);
  const existingIds = new Set(existing.map(s => s.id));
  for (const id of sectionIds) {
    if (!existingIds.has(id)) {
      throw new HierarchyValidationError(`Section ${id} does not belong to course ${courseId}`);
    }
  }
  return this.#sectionRepo.reorderSections(courseId, sectionIds);
}
```

### Cascading Read
Return a full nested tree by parallelizing child queries:

```typescript
async getCourseHierarchy(courseId: string): Promise<CourseHierarchy> {
  const course = await this.#courseRepo.findById(courseId);
  const sections = await this.#sectionRepo.findByCourseId(courseId);

  const sectionsWithSessions = await Promise.all(
    sections.map(async (section) => {
      const sessions = await this.#sessionRepo.findBySectionId(section.id);
      return { ...section, sessions };
    }),
  );

  return { course_id: course.id, course_name: course.name, sections: sectionsWithSessions };
}
```

### DualWrite for Each Entity Level
Each entity type gets its own `#tryNeo4jCreate*` method that creates the node AND the relationship to its parent:

```cypher
CREATE (s:Section {id: $id, title: $title, position: $position})
WITH s
MATCH (c:Course {id: $course_id})
CREATE (c)-[:HAS_SECTION]->(s)
```

### Route Structure
Nest child routes under parent resource:
- `POST /api/v1/programs` (institution-scoped)
- `POST /api/v1/courses/:courseId/sections`
- `PUT /api/v1/courses/:courseId/sections/reorder`
- `POST /api/v1/sections/:sectionId/sessions`
- `GET /api/v1/courses/:courseId/hierarchy` (cascading read)

## When to Use
- Any entity with a parent-child relationship requiring validation
- Entities that need position-based ordering (sections, chapters, steps)
- Nested structures that need to be read as a full tree

## When NOT to Use
- Flat entity lists without parent-child relationships
- Entities where ordering doesn't matter
- Deep hierarchies (>3 levels) where N+1 becomes a concern — use a single recursive CTE or Neo4j traversal instead
