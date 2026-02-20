---
name: approval-workflow-pattern
tags: [approval, multi-table, rollback, institution, invitation]
story: STORY-SA-5
date: 2026-02-20
---
# Approval Workflow Pattern

**Problem:** Multi-table state transition (application → institution → invitation) without
database transactions. Supabase JS client doesn't support transactions, so failures between
steps can leave data in an inconsistent state.

**Solution:** Sequential operations with manual rollback on failure.

## Pattern

```typescript
async approve(id: string, domain: string, userId: string) {
  // 1. Validate preconditions (idempotency guard)
  const record = await this.#fetch(id);
  if (record.status !== "pending") {
    throw new DuplicateApprovalError(id);
  }

  // 2. Check uniqueness constraints before mutating
  await this.#assertDomainAvailable(domain);

  // 3. Update source record status (optimistic locking via WHERE clause)
  await this.#updateStatus(id, userId);

  // 4. Create dependent records (with rollback on failure)
  let dependentId: string;
  try {
    dependentId = await this.#createDependent(record, domain);
  } catch (error) {
    await this.#rollbackStatus(id); // revert step 3
    throw error;
  }

  // 5. Create secondary records (invitation, notification, etc.)
  const secondaryId = await this.#createSecondary(dependentId, record);

  // 6. Side effects (email, Neo4j dual-write — best-effort)
  await this.#trySideEffects(dependentId, record);

  return result;
}
```

## Key Principles

1. **Validate before mutate** — check status + uniqueness before any UPDATE/INSERT
2. **Optimistic locking** — use `WHERE status = 'pending'` to prevent race conditions
3. **Manual rollback** — if step N+1 fails, revert step N (can't use DB transactions)
4. **Best-effort side effects** — email/Neo4j wrapped in try/catch, logged on failure
5. **Token generation** — `crypto.randomBytes(36).toString('base64url').slice(0, 48)`

## When to Use

- Multi-table state transitions (approval, onboarding, enrollment)
- When Supabase JS client is the only available client (no raw SQL transactions)
- When side effects (email, graph writes) should not block the main flow

## When NOT to Use

- Single-table CRUD (just use .update() directly)
- When you have access to Supabase RPC/functions for server-side transactions
- When all operations are idempotent (no rollback needed)

## Files Reference

- Service: `apps/server/src/services/institution/institution.service.ts`
- Controller: `apps/server/src/controllers/institution/approval.controller.ts`
- Error classes: `apps/server/src/errors/institution.error.ts`
- Email stub: `apps/server/src/services/email/invitation-email.service.ts`
