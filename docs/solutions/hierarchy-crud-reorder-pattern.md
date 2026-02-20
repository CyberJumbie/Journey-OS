---
name: hierarchy-crud-reorder-pattern
tags: [hierarchy, crud, reorder, position, rpc, dual-write]
story: STORY-F-11
date: 2026-02-20
---
# Hierarchy CRUD + Position Reorder Pattern

## Problem
Parent-child entities with position-based ordering (e.g., Course > Section > Session) need:
1. CRUD for each entity scoped to its parent
2. Auto-position assignment on create (max + 1)
3. Atomic batch reorder via array of IDs
4. DualWrite to Neo4j with typed relationships

## Solution

### 1. Repository: Position-Aware Create
```typescript
async create(data: CreateSectionRequest & { position: number }): Promise<Section> {
  // Service resolves position before calling repo
  const { data: row, error } = await this.#supabaseClient
    .from(TABLE)
    .insert({ ...data })
    .select("*")
    .single();
  // ...
}

async getMaxPosition(courseId: string): Promise<number> {
  const { data } = await this.#supabaseClient
    .from(TABLE)
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.position : -1;
}
```

### 2. Service: Auto-Position + Validation
```typescript
let position = request.position;
if (position === undefined) {
  const maxPos = await this.#sectionRepo.getMaxPosition(courseId);
  position = maxPos + 1;
}
```

### 3. Atomic Reorder via Supabase RPC
```sql
CREATE OR REPLACE FUNCTION reorder_sections(p_course_id UUID, p_section_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER := 0; v_id UUID; v_pos INTEGER := 0;
BEGIN
  -- Verify all IDs belong to the course
  IF EXISTS (
    SELECT 1 FROM unnest(p_section_ids) AS sid
    WHERE sid NOT IN (SELECT id FROM sections WHERE course_id = p_course_id)
  ) THEN
    RAISE EXCEPTION 'Invalid section_ids for course %', p_course_id;
  END IF;
  -- Update positions atomically
  FOREACH v_id IN ARRAY p_section_ids LOOP
    UPDATE sections SET position = v_pos, updated_at = NOW()
    WHERE id = v_id AND course_id = p_course_id;
    v_pos := v_pos + 1; v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;
```

Repository calls via `.rpc()`:
```typescript
async reorderSections(courseId: string, sectionIds: string[]): Promise<number> {
  const { data, error } = await this.#supabaseClient.rpc("reorder_sections", {
    p_course_id: courseId,
    p_section_ids: sectionIds,
  });
  // ...
}
```

### 4. DualWrite with Relationship Creation
```typescript
async #tryNeo4jCreateSection(section: Section, courseId: string): Promise<void> {
  if (!this.#neo4jDriver) return;
  const session = this.#neo4jDriver.session();
  try {
    await session.run(
      `CREATE (s:Section { id: $id, ... })
       WITH s
       MATCH (c:Course {id: $course_id})
       CREATE (c)-[:HAS_SECTION]->(s)`,
      { id: section.id, course_id: courseId, ... },
    );
    await this.#sectionRepo.updateSyncStatus(section.id, "synced");
  } catch {
    await this.#sectionRepo.updateSyncStatus(section.id, "failed");
  } finally {
    await session.close();
  }
}
```

### 5. Cascading Read (Nested Response)
```typescript
async getCourseHierarchy(courseId: string): Promise<CourseHierarchy> {
  const course = await this.#courseRepo.findById(courseId);
  const sections = await this.#sectionRepo.findByCourseId(courseId);
  const sectionsWithSessions = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      sessions: await this.#sessionRepo.findBySectionId(section.id),
    })),
  );
  return { course_id: course.id, course_name: course.name, ... sections: sectionsWithSessions };
}
```

## When to Use
- Any parent-child entity with position/ordering (e.g., curriculum units, lesson steps)
- Entities that need drag-and-drop reorder in the UI
- Multi-level hierarchies (3+ levels deep)

## When Not to Use
- Flat lists without ordering — standard CRUD is simpler
- Entities where order is derived (e.g., alphabetical) — no position column needed
- Single-level parent-child without reorder needs

## Source
- ARCHITECTURE_v10 SS 5.2: "Institution > Program > Course > Section > Session"
- STORY-F-11 brief: position-based ordering + cascading reads
