---
name: versioned-entity-update-pattern
tags: [versioning, snapshot, update, template, service]
story: STORY-F-4
date: 2026-02-20
---
# Versioned Entity Update Pattern

## Problem
Some entities (templates, curricula) need immutable version history. Every update must snapshot the current state before applying changes, and the version counter must increment atomically.

## Solution
The service layer orchestrates a two-step update:

1. **Snapshot** the current state into a `_versions` table
2. **Apply** the update with `current_version + 1`

```typescript
// In service.update():
const dto = await this.#repository.findById(id);
const model = new TemplateModel(dto);
model.assertOwnership(userId, "update");

// Step 1: Snapshot current state
const snapshot = model.createVersionSnapshot(userId);
await this.#repository.createVersion(snapshot);

// Step 2: Apply update with incremented version
const updated = await this.#repository.update(id, {
  ...changes,
  current_version: dto.current_version + 1,
});
```

The domain model provides `createVersionSnapshot(createdBy)` which:
- Generates a UUID for the version record
- Copies all mutable fields from the current state
- Sets `version_number` to `current_version` (the version being superseded)
- Stamps `created_by` and `created_at`

## Database Schema
```sql
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  -- all mutable fields copied from parent table --
  UNIQUE(template_id, version_number)
);
```

The `ON DELETE CASCADE` ensures versions are cleaned up when the parent entity is deleted. The unique constraint prevents duplicate version numbers.

## When to Use
- Entity updates must be auditable with full state history
- Users need to view or restore previous versions
- The entity has multiple mutable fields that change together

## When NOT to Use
- Simple status updates (use a status log table instead)
- Entities where only the latest state matters
- High-frequency updates where versioning would be expensive
