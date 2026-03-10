# PSUPP-014: Question Version History (/questions/:questionId/history)
**Group:** Question Management
**Component:** `QuestionHistory` | `pages/questions/QuestionHistory.tsx`
**Priority:** P1 — needed once P4-002 (rich editor) ships; versioning exists but no UI to view it
**Depends:** P2-007 (assessment_item_versions table exists), P4-002 (rich editor creates versions)
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** to view the full version history of any question
**So that** I can see what changed between edits and revert to any previous version if needed

## Acceptance Criteria
- Route: `/questions/:questionId/history`
- Linked from: Question Detail page Panel 1 "Edit" → history icon, Item Editor header
- Endpoint: `GET /api/v1/items/:id/versions`
- Response:
```typescript
interface VersionHistory {
  itemId: string;
  currentVersion: number;
  versions: {
    versionNumber: number;
    createdAt: string;
    editedBy: { id: string; name: string };
    editInstruction: string;     // what the user asked to change
    changesSummary: string;      // AI-generated diff summary (1 sentence)
    criticScoreBefore: number | null;
    criticScoreAfter: number | null;
    stem: string;                // full stem at this version
    vignette: string;
  }[];
}
```
- Timeline view: versions shown newest-to-oldest with diff indicators
- "View this version" → expands to show full question at that version (read-only)
- "Restore to this version" → `POST /api/v1/items/:id/versions/:versionNumber/restore`
  - Creates a new version with restored content (does NOT delete history)
  - Triggers re-validation + critic re-score (same as P4-002 save flow)
- Diff highlighting: stems that changed shown with before/after comparison (simple word-level diff, client-side)

## Files to Create
- `frontend/src/app/(faculty)/questions/[questionId]/history/page.tsx`
- `frontend/src/hooks/useItemVersionHistory.ts`
- `backend/src/controllers/item-versions.controller.ts`

## Files to Modify
- `backend/src/routes/items.routes.ts` — add `GET /items/:id/versions` + `POST /items/:id/versions/:n/restore`

## Smoke Test
```bash
# After making 2 edits to an item via P4-002:
curl "localhost:3001/api/v1/items/{itemId}/versions" -H "Authorization: Bearer $JWT" | \
  jq '[.versions[] | {versionNumber, editInstruction, criticScoreAfter}]'
# Expected: array of 3+ versions (original + 2 edits)

# Restore version 1
curl -X POST "localhost:3001/api/v1/items/{itemId}/versions/1/restore" \
  -H "Authorization: Bearer $JWT"
# Expected: 200, new version created with v1 content, critic re-scored
```
