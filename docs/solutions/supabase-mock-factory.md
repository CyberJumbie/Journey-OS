---
name: supabase-mock-factory
tags: [testing, vitest, supabase, mock, factory]
story: STORY-SA-1
date: 2026-02-19
---
# Supabase Mock Factory Pattern

When testing services that use the Supabase client, create a factory function
that builds separate mock objects for each chained operation.

## Problem
Supabase queries chain differently depending on the operation:
- `select().eq().or().limit()` — read chain
- `insert().select().single()` — write chain
- `select().eq().order().range()` — paginated read chain

Using `mockReturnThis()` across these chains causes the wrong methods to
resolve on the wrong chain, leading to runtime errors like
`single is not a function`.

## Solution
Create separate mock chain objects per operation. Return the correct chain
based on which method is called on the `from()` result.

```typescript
function createMockSupabase(overrides?: {
  selectResult?: { data: unknown[]; error: null } | { data: null; error: { message: string } };
  insertResult?: { data: unknown; error: null } | { data: null; error: { message: string } };
}): SupabaseClient {
  // Write chain: insert() -> select() -> single()
  const singleFn = vi.fn().mockResolvedValue(overrides?.insertResult ?? { data: { id: "1" }, error: null });
  const insertSelectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  // Read chain: select() -> eq() -> or() -> limit()
  const limitFn = vi.fn().mockResolvedValue(overrides?.selectResult ?? { data: [], error: null });
  const orFn = vi.fn().mockReturnValue({ limit: limitFn });
  const eqFn = vi.fn().mockReturnValue({ or: orFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    from: vi.fn(() => ({
      select: selectFn,
      insert: insertFn,
    })),
  } as unknown as SupabaseClient;
}
```

For paginated queries with parallel data+count calls, use a call counter:

```typescript
function createMockSupabase(data: unknown[] = [], total = 0): SupabaseClient {
  // Data chain: select() -> eq() -> order() -> range()
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error: null }),
  };

  // Count chain: select() -> eq() -> (thenable)
  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  Object.defineProperty(countChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ count: total, error: null }),
  });

  let callCount = 0;
  return {
    from: vi.fn(() => {
      callCount++;
      if (callCount % 2 === 1) return chain;
      return countChain;
    }),
  } as unknown as SupabaseClient;
}
```

## When to Use
- Any vitest test that mocks `SupabaseClient` for service-layer tests.
- Adapt the chain shape to match the actual Supabase query being tested.

## When NOT to Use
- Integration tests that use a real Supabase client.
- Simple single-operation mocks (e.g., just `.from().select()`).

## Source Reference
[STORY-SA-1 § application.service.test.ts], [STORY-SA-2 § global-user.service.test.ts]
