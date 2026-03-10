# CP-EPIC-2.2 — Review Mode + Bulk Generation (Weeks 11–12)
**Stories:** P2-007 · P2-008 · P2-009 · P2-010 · P2-011 · P2-012
**Auto-loaded by:** `/story P2-00N` where N = 7–12

---

## What This Epic Builds

Extends the workbench from generate-only to generate-and-refine. Adds conversational editing of existing questions, background bulk generation via Inngest, and real-time Socket.io notifications.

**Exit gate:** Faculty can modify questions conversationally. Bulk generation of 20+ questions runs in background with real-time progress. Review mode loads existing items.

---

## Prerequisites

- Epic 2.1 complete: full 14-node pipeline, auto-routing operational
- P1-029: question bank (`/items`) exists
- Inngest dev server running locally: `npx inngest-cli dev`

---

## New Infrastructure: Inngest

Inngest handles background job orchestration. Install and configure before P2-010.

```bash
# Install
npm install inngest --workspace=backend
npm install @inngest/sdk --workspace=backend  # or just inngest

# Start local dev server (in separate terminal)
npx inngest-cli@latest dev
# → Inngest Dev UI at http://localhost:8288

# Backend Inngest client singleton
```

```typescript
// backend/src/lib/InngestClient.ts
import { Inngest } from 'inngest';
import { config } from '../config/config';

class InngestClientSingleton {
  private static instance: Inngest | null = null;
  static getInstance(): Inngest {
    if (!this.instance) {
      this.instance = new Inngest({
        id: 'journey-os',
        eventKey: config.INNGEST_EVENT_KEY,  // from env
      });
    }
    return this.instance;
  }
}
export const getInngestClient = () => InngestClientSingleton.getInstance();
```

```typescript
// backend/src/index.ts — register Inngest functions
import { serve } from 'inngest/express';
import { bulkGenerationFunction } from './inngest/bulk-generation.function';
import { dataLintFunction } from './inngest/data-lint.function';
import { goldenRegressionFunction } from './inngest/golden-regression.function';

app.use('/api/inngest', serve({
  client: getInngestClient(),
  functions: [bulkGenerationFunction, dataLintFunction, goldenRegressionFunction],
}));
```

---

## New Infrastructure: Socket.io

```typescript
// backend/src/lib/SocketServer.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

class SocketServerSingleton {
  private static io: Server | null = null;

  static init(httpServer: ReturnType<typeof createServer>): Server {
    if (!this.io) {
      this.io = new Server(httpServer, {
        cors: { origin: config.FRONTEND_URL, credentials: true }
      });
      this.io.use((socket, next) => {
        // Validate JWT from socket.handshake.auth.token
        const token = socket.handshake.auth.token;
        verifyJWT(token)
          .then(user => { socket.data.userId = user.id; next(); })
          .catch(() => next(new Error('Unauthorized')));
      });
      this.io.on('connection', socket => {
        socket.join(`user:${socket.data.userId}`);
      });
    }
    return this.io;
  }

  static emit(userId: string, event: string, data: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, data);
  }
}

export const getSocketServer = () => SocketServerSingleton;
```

---

## New Env Vars Required

```env
# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key     # from Inngest dashboard
INNGEST_SIGNING_KEY=your-signing-key         # for webhook signature verification

# Socket.io (already have FRONTEND_URL from existing config)
```

---

## Review Mode Pipeline Branch

```typescript
// In graph.ts — mode-based branching at init
.addConditionalEdges('init', modeRouter, {
  single:  'context_compiler',   // generate new question
  bulk:    'context_compiler',   // same pipeline, called N times by Inngest
  review:  'load_review_question',  // P2-007: review branch
})

// Review branch nodes
.addNode('load_review_question', loadReviewQuestionNode)
.addNode('apply_edit',           applyEditNode)
.addNode('revalidate',           revalidateNode)
.addEdge('load_review_question', 'apply_edit')
.addEdge('apply_edit',           'revalidate')
.addEdge('revalidate',           'critic_agent')   // re-uses existing critic + router
```

---

## Bulk Generation Inngest Function

```typescript
// backend/src/inngest/bulk-generation.function.ts
import { getInngestClient } from '../lib/InngestClient';
import { runSingleGeneration } from '../pipeline/run-single';

export const bulkGenerationFunction = getInngestClient().createFunction(
  {
    id: 'bulk-generation',
    concurrency: { limit: 5 },          // max 5 parallel
    retries: 2,
  },
  { event: 'journey/batch.requested' },
  async ({ event, step }) => {
    const { batchId, courseId, topicIds, count, userId } = event.data;
    const topics = topicIds.slice(0, count);

    for (const topicId of topics) {
      await step.run(`generate-${topicId}`, async () => {
        try {
          const item = await runSingleGeneration({ courseId, topicId, userId });
          await updateBatchItem(batchId, topicId, 'completed', item.id);
          getSocketServer().emit(userId, 'batch:item:completed', { batchId, itemId: item.id });
        } catch (err) {
          await updateBatchItem(batchId, topicId, 'failed', null, String(err));
          // never rethrow — batch continues on single failure
        }
      });
    }

    await markBatchCompleted(batchId);
    getSocketServer().emit(userId, 'batch:completed', { batchId });
  }
);
```

---

## TypeScript Interface Updates

```typescript
// WorkbenchState Phase 2 additions (Epic 2.2)
interface WorkbenchState {
  // ... Phase 2.1 fields ...

  // Review mode
  reviewItemId: string | null;         // itemId being reviewed
  editInstruction: string | null;      // the faculty's instruction
  editedSections: string[];            // which sections were modified
}

// Batch types
interface BulkBatch {
  id: string;
  courseId: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimatedCost: number | null;
  createdAt: string;
}

interface BulkBatchItem {
  id: string;
  batchId: string;
  itemId: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage: string | null;
}
```

---

## New Files (Epic 2.2)

```
backend/src/lib/InngestClient.ts
backend/src/lib/SocketServer.ts
backend/src/inngest/bulk-generation.function.ts
backend/src/pipeline/nodes/LoadReviewQuestionNode.ts
backend/src/pipeline/nodes/ApplyEditNode.ts
backend/src/pipeline/nodes/RevalidateNode.ts
backend/src/pipeline/prompts/apply-edit-system.txt
backend/src/controllers/batch.controller.ts
backend/src/services/batch.service.ts
backend/src/repositories/batch.repository.ts
backend/src/routes/batch.routes.ts
frontend/src/lib/socket.ts
frontend/src/hooks/useNotifications.ts
frontend/src/hooks/useBatches.ts
frontend/src/hooks/useBatchDetail.ts
frontend/src/hooks/useItemVersions.ts
frontend/src/components/atoms/NotificationBell/NotificationBell.tsx
frontend/src/components/atoms/VersionBadge/VersionBadge.tsx
frontend/src/components/atoms/EditHighlight/EditHighlight.tsx
frontend/src/components/molecules/NotificationDropdown/NotificationDropdown.tsx
frontend/src/components/molecules/BatchItemRow/BatchItemRow.tsx
frontend/src/components/organisms/BatchCard/BatchCard.tsx
frontend/src/components/organisms/VersionHistoryPanel/VersionHistoryPanel.tsx
frontend/src/app/(faculty)/batches/page.tsx
frontend/src/app/(faculty)/batches/[id]/page.tsx
backend/supabase/migrations/20250902000000_item_versions.sql
backend/supabase/migrations/20250902000001_bulk_batches.sql
```

---

## Smoke Tests

```bash
# 1. Review mode: load existing item
# Navigate to /workbench?mode=review&itemId={real_id}
# Expected: right panel pre-populated, no generation wait

# 2. Conversational refinement: targeted edit
# Chat: "make the distractors harder but keep the vignette"
# Expected: only options section updates, new version row in assessment_item_versions

# 3. Bulk generation
curl -X POST localhost:3001/api/v1/batches \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"courseId":"medi-531","topicIds":["T1","T2","T3","T4","T5"],"count":5}'
sleep 90
curl "localhost:3001/api/v1/batches/{batchId}" -H "Authorization: Bearer $JWT"
# Expected: completed_count: 5, status: 'completed'

# 4. Socket.io notification
# While batch runs, open browser DevTools → Network → WS
# Expected: batch:item:completed events for each of 5 items
# NotificationBell badge increments in real time
```

---

## Failure Modes

1. **Inngest not running locally** → `pnpm dev` must include `npx inngest-cli dev` in Turborepo tasks
2. **Socket.io JWT validation fails** → check `FRONTEND_URL` in config matches browser origin exactly
3. **Review mode loads wrong item** → `loadReviewQuestionNode` must use `state.reviewItemId`, not `state.itemId`
4. **Batch item fails mid-run** → Inngest `step.run` catches error, marks item failed, continues. Never re-throw inside step.
5. **apply_edit changes correct answer** → ApplyEditNode must validate that exactly one option remains `is_correct: true` after edit
6. **Partial re-run creates inconsistent state** — mid-graph entry must carry forward ALL state from previous nodes, only overwrite modified sections
