---
name: notification-ownership-pattern
tags: [notification, ownership, authorization, supabase-only]
story: STORY-F-2
date: 2026-02-20
---
# Notification Ownership Pattern

## Problem
Notifications are user-scoped resources. Users must only read/modify their own notifications. RBAC (role-based) doesn't apply — any authenticated user can have notifications. RLS provides defense-in-depth but we use service_role key, so ownership must be enforced at the service layer.

## Solution
Three-layer authorization for user-owned resources:

### 1. Auth Middleware (route level)
Routes placed after `createAuthMiddleware()` — rejects unauthenticated requests.

### 2. Service-Level Ownership Check (business logic)
```typescript
async markAsRead(id: string, userId: string): Promise<Notification> {
  const notification = await this.#repository.findById(id);
  if (!notification) {
    throw new NotificationNotFoundError(id);
  }
  if (notification.user_id !== userId) {
    throw new NotificationForbiddenError(id);
  }
  return this.#repository.markAsRead(id);
}
```

Key: `findById` first (returns null, no throw), then compare `user_id`, then mutate.

### 3. RLS Policies (defense-in-depth)
```sql
-- Users can only SELECT their own notifications
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only UPDATE their own notifications
CREATE POLICY "Users mark own as read" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

### Controller Pattern
Extract `user.id` from authenticated request using double-cast:
```typescript
const user = (req as unknown as Record<string, unknown>).user as
  | { id: string }
  | undefined;
if (!user?.id) {
  res.status(401).json({ data: null, error: { code: "VALIDATION_ERROR", message: "User not authenticated" } });
  return;
}
```

## When to Use
- Any user-scoped resource where all authenticated users have access (not role-gated)
- Notifications, user preferences, saved items, reading history

## When NOT to Use
- Role-gated resources (use RBAC middleware instead)
- Institution-scoped resources (use institution scoping pattern)
- Public resources (no auth needed)

## Supabase-Only Service Pattern
When a feature doesn't need Neo4j dual-write:
- Constructor takes only `Repository` (no `Driver | null`)
- No `#tryNeo4j*` private methods
- No `sync_status` tracking
- No `updateNeo4jId` repository method
- Significantly simpler service layer
