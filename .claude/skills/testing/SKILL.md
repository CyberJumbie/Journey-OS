---
name: testing
description: "Invoke when running /validate, /test-flow, or when writing tests for any story. Covers the 70/30 API/UI split, vitest patterns, Playwright patterns, multi-perspective review, and real-time UI testing."
---

# Skill: Testing Strategy

## The 70/30 Rule
- 70% of tests are API-level (vitest): CRUD, validation, auth, data integrity
- 30% of tests are E2E (Playwright): critical user journeys only
- NEVER test CRUD by clicking through forms. Test at the service layer.

## API Tests (vitest) — The Primary Test Surface

### What to Test
Every story should have API tests covering:
1. **CRUD** — create, read, update, delete at service or controller layer
2. **Validation** — invalid inputs rejected with correct error codes
3. **Authorization** — wrong-role requests rejected (403)
4. **Data integrity** — foreign keys, sync status, referential consistency
5. **Edge cases** — empty data, duplicates, concurrent operations
6. **Domain-specific** — whatever the story's acceptance criteria require

### Pattern
```typescript
describe('EntityService', () => {
  it('creates with valid data', async () => { ... });
  it('rejects invalid input with ValidationError', async () => { ... });
  it('rejects unauthorized role with AuthorizationError', async () => { ... });
  it('maintains referential integrity after create', async () => { ... });
});
```

## E2E Tests (Playwright) — Critical Journeys Only

### When to Write E2E
Only if the story is part of one of the project's critical user journeys.
Define critical journeys early (during /decompose) and list them in
`.context/spec/CRITICAL-JOURNEYS.md`.

Typical projects have 3-5 critical journeys. Examples:
- User completes signup and first action
- Core workflow end-to-end (e.g., faculty generates a question)
- Payment or checkout flow
- Admin performs critical management action
- Cross-role interaction (e.g., advisor views student's work)

### Playwright Patterns
```typescript
// USE accessibility-tree selectors (reliable):
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email').fill('user@example.com');
await page.getByText('Success').toBeVisible();

// AVOID CSS selectors (fragile):
await page.click('.btn-primary');  // DON'T
await page.locator('#email-input');  // DON'T
```

### Real-Time UI Testing (SSE / WebSocket)
```typescript
// For async operations (LLM responses, pipeline completion):
await expect(page.getByTestId('result'))
  .toBeVisible({ timeout: 60_000 });  // 60s for LLM responses

// For WebSocket presence:
// Use page.routeWebSocket() to mock or intercept
```

### Visual Regression
```typescript
// Built-in Playwright screenshot comparison (zero cost):
await expect(page).toHaveScreenshot('dashboard.png');
```

## Multi-Perspective Review (Pass 4 of /validate)

Four focused questions, not a full re-read:

**4a. SECURITY**
"Does this story introduce any auth bypass, data leak, or unvalidated input?"
Check: middleware coverage, RLS policies, input sanitization.

**4b. PERFORMANCE**
"Does this story introduce N+1 queries, unbounded loops, or missing indexes?"
Check: query patterns, pagination, React re-renders.

**4c. DATA INTEGRITY**
"Does this story maintain consistency across all data stores?"
Check: sync status, FK relations, graph consistency, no orphans.

**4d. ARCHITECTURE**
"Does this story respect layer boundaries and naming conventions?"
Check: MVC layers, import direction, package boundaries.
