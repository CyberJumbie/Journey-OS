---
name: enriched-view-service-pattern
tags: [view-service, enriched-list, detail-view, supabase, joins, batch-count]
story: STORY-F-13
date: 2026-02-20
---
# Enriched View Service Pattern

## Problem
List and detail pages need data joined from multiple tables (e.g., course + program name + director name + section/session counts). The base CRUD repository returns flat DTOs without relational data, and the controller shouldn't orchestrate multiple service calls.

## Solution
Create a dedicated **ViewService** that composes the existing repository (with enriched query methods) and any other services needed for the view.

### 1. Repository: Add enriched query methods

```typescript
// course.repository.ts
async listEnriched(query: CourseListQuery): Promise<CourseListViewResponse> {
  // Use Supabase relational select for joined fields
  let dataQuery = this.#supabaseClient
    .from(TABLE)
    .select(
      "id, code, name, department, program_id, status, academic_year, course_director_id, updated_at, " +
      "program:programs(name), " +
      "director:profiles!courses_course_director_id_fkey(full_name)"
    );

  // Apply filters BEFORE .order() and .range()
  if (query.status) dataQuery = dataQuery.eq("status", query.status);
  // ... more filters ...

  // Terminal methods last
  const result = await dataQuery
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  // Batch count related entities
  const courseIds = result.data.map(r => r.id);
  const [sectionCounts, sessionCounts] = await Promise.all([
    this.#countSectionsByCourseIds(courseIds),
    this.#countSessionsByCourseIds(courseIds),
  ]);

  // Map to enriched list items
  return { courses: result.data.map(row => ({
    ...baseFields(row),
    program_name: row.program?.name ?? null,
    course_director_name: row.director?.full_name ?? null,
    section_count: sectionCounts.get(row.id) ?? 0,
    session_count: sessionCounts.get(row.id) ?? 0,
  })), meta };
}
```

### 2. Batch count through intermediate tables

When counting entities through intermediate tables (e.g., sessions through sections), query the intermediate table with nested selects:

```typescript
async #countSessionsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
  // Query sections (which has course_id) with nested sessions
  const { data } = await this.#supabaseClient
    .from("sections")
    .select("course_id, sessions(id)")
    .in("course_id", courseIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const courseId = row.course_id;
    const sessions = row.sessions as unknown[];
    counts.set(courseId, (counts.get(courseId) ?? 0) + sessions.length);
  }
  return counts;
}
```

**Never** use `.in("foreign_table.column", ids)` on joined columns — PostgREST `.in()` only works on direct table columns.

### 3. ViewService: Compose repo + other services

```typescript
export class CourseViewService {
  readonly #repository: CourseRepository;
  readonly #hierarchyService: HierarchyService;

  async getDetailView(id: string): Promise<CourseDetailView> {
    // Parallel fetch — independent queries
    const [enriched, hierarchy] = await Promise.all([
      this.#repository.findByIdEnriched(id),
      this.#hierarchyService.getCourseHierarchy(id),
    ]);

    if (!enriched) throw new CourseNotFoundError(id);

    return { ...mapToDetailView(enriched), hierarchy: hierarchy.sections };
  }
}
```

### 4. ViewController: Thin layer

```typescript
export class CourseViewController {
  async handleListView(req: Request, res: Response): Promise<void> {
    const query = this.#parseListQuery(req);
    const result = await this.#service.listView(query);
    res.status(200).json({ data: result, error: null });
  }
}
```

### 5. Route registration (index.ts)

Register view routes **before** parameterized `:id` routes to avoid path conflicts:

```typescript
app.get("/api/v1/courses/view", rbac.require(AuthRole.FACULTY), (req, res) =>
  courseViewController.handleListView(req, res),
);
app.get("/api/v1/courses/:id/view", rbac.require(AuthRole.FACULTY), (req, res) =>
  courseViewController.handleGetDetailView(req, res),
);
```

## When to Use
- List pages that need joined/computed fields (names from FK relations, counts from child tables)
- Detail pages that compose data from multiple services
- Read-only views that don't need the full CRUD service

## When NOT to Use
- Simple CRUD where the base DTO is sufficient
- When the enrichment is a single join (just add it to the base repository method)

## Key Rules
1. **Escape user search input** before constructing PostgREST `.or()` filter strings (`%`, `_`, `,`, `.`)
2. **Use `Promise.all`** for independent queries (enriched data + hierarchy, multiple count queries)
3. **Batch count queries** by collecting IDs from the page, not per-row
4. **Apply `.eq()` filters before `.order()` and `.range()`** — terminal methods finalize the Supabase builder chain
