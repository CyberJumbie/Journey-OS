---
name: express-mock-res-pattern
tags: [testing, vitest, express, mock, response]
story: STORY-F-18
date: 2026-02-20
---
# Express Mock Response Pattern

## Problem
When testing Express controllers, destructuring primitive values (`statusCode`, `body`) from a mock factory captures the **initial** values. When `status()` and `json()` mutate the mock's internal state, the destructured variables remain unchanged — causing all assertions to fail.

## Anti-Pattern (WRONG)

```typescript
function createMockRes() {
  let statusCode = 0;
  let body: unknown = null;
  const json = vi.fn().mockImplementation((data) => { body = data; });
  const status = vi.fn().mockImplementation((code) => {
    statusCode = code;
    return { json };
  });
  return { res: { status, json } as unknown as Response, statusCode, body };
}

// BUG: statusCode and body are always 0 and null
const { res, statusCode, body } = createMockRes();
await controller.handleUpload(req, res);
expect(statusCode).toBe(201); // FAILS — still 0
```

The destructuring `const { statusCode, body } = createMockRes()` copies the **number** `0` and **null** by value. The `let statusCode` inside the factory is a different binding.

## Solution: Mutable State Object

```typescript
interface MockResState {
  statusCode: number;
  body: unknown;
  res: Response;
}

function createMockRes(): MockResState {
  const state: MockResState = {
    statusCode: 0,
    body: null,
    res: null as unknown as Response,
  };
  const json = vi.fn().mockImplementation((data: unknown) => {
    state.body = data;
  });
  const send = vi.fn();
  const status = vi.fn().mockImplementation((code: number) => {
    state.statusCode = code;
    return { json, send };
  });
  state.res = { status, json, send } as unknown as Response;
  return state;
}

// CORRECT: access via dot notation on the mutable object
const mock = createMockRes();
await controller.handleUpload(req, mock.res);
expect(mock.statusCode).toBe(201); // PASSES
expect((mock.body as Record<string, unknown>).data).toHaveProperty("id");
```

## When to Use
- Every Express controller test that needs to assert on response status codes and JSON bodies.
- Pair with `createMockReq()` factories that use `null` (not `undefined`) for absent optional properties.

## When NOT to Use
- Integration tests that use `supertest` — it captures the real response.
- Tests where you only need to verify the mock was called (use `expect(res.status).toHaveBeenCalledWith(200)` instead).

## Key Rule
Never destructure primitives from factory returns. Always access properties on the returned object via dot notation so mutations are visible.
