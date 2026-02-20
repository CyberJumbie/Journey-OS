---
name: admin-paginated-list-pattern
tags: [admin, pagination, supabase, rbac, superadmin, list, table]
story: STORY-SA-3
date: 2026-02-20
---
# Admin Paginated List Pattern

## Problem
Multiple admin endpoints (user directory, application review, institution list) need
paginated, filterable, sortable lists with RBAC protection and consistent response shapes.

## Solution
Three-layer pattern: Service (dual query) -> Controller (param parsing) -> Route (RBAC guard).

### Service Layer
```typescript
export class FooService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async list(query: FooListQuery): Promise<FooListResponse> {
    // 1. Clamp and validate params
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const sortBy = query.sort_by ?? "created_at";
    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      throw new ValidationError(`Invalid sort field: "${sortBy}"`);
    }

    // 2. Build parallel data + count queries
    let dataQuery = this.#supabaseClient
      .from("table")
      .select("col1, col2, ...")
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    let countQuery = this.#supabaseClient
      .from("table")
      .select("id", { count: "exact", head: true });

    // 3. Apply identical filters to BOTH queries
    if (query.status && query.status !== "all") {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    // 4. Execute in parallel
    const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

    // 5. Map rows explicitly (no raw Supabase types leak)
    const items = (dataResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      // ...
    }));

    return { items, meta: { page, limit, total: countResult.count ?? 0, total_pages } };
  }
}
```

### Controller Layer
```typescript
export class FooController {
  readonly #service: FooService;

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      // Parse query params: parseInt for numbers, typeof narrowing for strings
      const result = await this.#service.list({
        page: page ? parseInt(page as string, 10) : undefined,
        sort_by: typeof sort_by === "string" ? (sort_by as FooSortField) : undefined,
        sort_dir: sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
      });
      res.status(200).json({ data: result, error: null });
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        res.status(400).json({ data: null, error: { code: error.code, message: error.message } });
        return;
      }
      res.status(500).json({ data: null, error: { code: "INTERNAL_ERROR", message: "..." } });
    }
  }
}
```

### Route Registration
```typescript
// After app.use("/api/v1", createAuthMiddleware())
app.get("/api/v1/admin/things", rbac.require(AuthRole.SUPERADMIN), (req, res) =>
  controller.handleList(req, res),
);
```

### Test Mock (dual query)
```typescript
function createMockSupabase(data: unknown[] = [], total = 0): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error: null }),
  };
  const countChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: vi.fn() };
  Object.defineProperty(countChain, "then", {
    value: (resolve: (v: unknown) => void) => resolve({ count: total, error: null }),
  });
  let callCount = 0;
  return {
    from: vi.fn(() => (++callCount % 2 === 1 ? chain : countChain)),
  } as unknown as SupabaseClient;
}
```

## When to Use
- Any admin list endpoint with pagination, filtering, sorting
- SuperAdmin or multi-role RBAC-protected routes
- Pattern used by: SA-2 (users), SA-3 (applications), SA-7 (institutions)

## When NOT to Use
- Public endpoints (no RBAC)
- Single-item lookups (use getById pattern instead)
- Neo4j queries (different query builder)

## Source Reference
[STORY-SA-2 § GlobalUserService], [STORY-SA-3 § ApplicationReviewService]
