---
name: repository-pattern
tags: [repository, supabase, service, separation, scope-filter]
story: STORY-IA-4
date: 2026-02-20
---
# Repository Pattern

## Problem
Services previously contained Supabase query logic mixed with business logic
(DualWrite, validation, orchestration). This violates MVC separation and makes
testing harder — mocking Supabase chains is fragile.

## Solution
Extract all Supabase queries into a Repository class. The service depends on
the repository via constructor DI. The repository handles only Supabase; the
service handles business logic and DualWrite.

```typescript
// Repository — query layer only
export class FooRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateFooRequest): Promise<Foo> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({ ...data, scope: SCOPE })
      .select("*")
      .single();

    if (error || !row) throw new FooNotFoundError("create failed");
    return row as unknown as Foo;
  }

  async findById(id: string): Promise<Foo | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("scope", SCOPE)  // Always filter by scope on shared tables
      .maybeSingle();

    if (error) throw new FooNotFoundError(id);
    return (data as unknown as Foo) ?? null;
  }

  // Dedicated method for sync status — don't abuse UpdateFooRequest
  async updateSyncStatus(
    id: string,
    syncStatus: "synced" | "failed",
    graphNodeId: string | null,
  ): Promise<void> {
    const fields: Record<string, unknown> = { sync_status: syncStatus };
    if (graphNodeId) fields.graph_node_id = graphNodeId;

    await this.#supabaseClient
      .from(TABLE)
      .update(fields)
      .eq("id", id)
      .eq("scope", SCOPE);
  }
}

// Service — business logic + DualWrite orchestration
export class FooService {
  readonly #repository: FooRepository;
  readonly #neo4jDriver: Driver | null;

  constructor(repository: FooRepository, neo4jDriver: Driver | null = null) {
    this.#repository = repository;
    this.#neo4jDriver = neo4jDriver;
  }

  async create(request: CreateFooRequest): Promise<Foo> {
    // 1. Validate
    // 2. Check uniqueness via repository
    // 3. Supabase write via repository
    const foo = await this.#repository.create(request);
    // 4. DualWrite Neo4j (best-effort)
    // 5. Update sync_status via repository.updateSyncStatus()
    return foo;
  }
}
```

### Key Rules
1. **Shared tables need scope filters** — if ILO/SLO share a table,
   every query MUST include `.eq("scope", SCOPE)`.
2. **Use `.single()` on all write operations** (insert, update, archive)
   to verify exactly 1 row was affected. `.maybeSingle()` for reads.
3. **Dedicated `updateSyncStatus()` method** — never cast
   `{sync_status}` as `UpdateFooRequest`. That bypasses type safety.
4. **Repository returns `null` for not-found reads** — the service
   decides whether to throw `NotFoundError`.

## When to Use
- Any entity with Supabase CRUD operations
- Especially entities on shared tables (ILO/SLO, etc.)
- Any service with DualWrite orchestration

## When NOT to Use
- Simple single-query operations that don't need a class
- Neo4j-only operations (different query builder)

## Source Reference
[STORY-IA-4 § ILORepository, ILOService]
