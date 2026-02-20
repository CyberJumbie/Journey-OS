# STORY-F-30: Processing Progress UI

**Epic:** E-11 (Content Processing Pipeline)
**Feature:** F-05 (Content Upload & Processing)
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-11-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need real-time processing status updates so that I can see how my uploaded content progresses through the pipeline.

## Acceptance Criteria
- [ ] SSE endpoint: `GET /api/v1/content/:id/progress` streams pipeline events
- [ ] Events: `stage_started`, `stage_completed`, `stage_error`, `pipeline_completed`
- [ ] Each event includes: stage name, progress percentage, timestamp, error details (if any)
- [ ] Progress UI component showing current stage and overall progress bar
- [ ] Stage indicators: parse (25%), clean (50%), chunk (75%), embed (100%)
- [ ] Error state display with retry button
- [ ] Auto-reconnect on SSE connection drop with exponential backoff (1s, 2s, 4s, max 30s)
- [ ] Controller emits SSE events from Inngest pipeline callbacks
- [ ] 8-10 API tests for SSE event format, stage transitions, error events
- [ ] TypeScript strict, named exports only, design tokens only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/LectureProcessing.tsx` | `apps/web/src/components/content/processing-progress.tsx` | Extract progress bar and stage indicators; replace inline styles with Tailwind design tokens; convert to named exports; use `useSyncExternalStore` for mounted state |
| `pages/courses/SyllabusProcessing.tsx` | `apps/web/src/components/content/processing-progress.tsx` | Same component serves both lecture and syllabus processing; parameterize by content type |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/progress.types.ts` |
| Controller | apps/server | `src/controllers/content/progress.controller.ts` |
| Route | apps/server | `src/routes/content/progress.routes.ts` |
| SSE Service | apps/server | `src/services/sse/sse.service.ts` |
| View - Progress | apps/web | `src/components/content/processing-progress.tsx` |
| View - Stage | apps/web | `src/components/content/pipeline-stage-indicator.tsx` |
| Hooks | apps/web | `src/hooks/use-pipeline-progress.ts` |
| Tests | apps/server | `src/controllers/content/__tests__/progress.controller.test.ts` |

## Database Schema
No new tables. Pipeline stages write progress to Redis pub/sub channel; SSE controller subscribes and forwards to connected clients.

## API Endpoints

### GET /api/v1/content/:id/progress
**Auth:** JWT required (content owner or course member)
**Response:** `text/event-stream`
**SSE Events:**
```
event: stage_started
data: {"stage":"parse","progress":0,"timestamp":"2026-02-20T..."}

event: stage_completed
data: {"stage":"parse","progress":25,"timestamp":"2026-02-20T..."}

event: stage_error
data: {"stage":"chunk","error":"ChunkError: token limit exceeded","timestamp":"..."}

event: pipeline_completed
data: {"progress":100,"duration_ms":12500,"timestamp":"..."}

event: heartbeat
data: {}
```

## Dependencies
- **Blocked by:** STORY-F-27 (pipeline must emit events)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-10 API tests: SSE content-type header validation, stage_started event format, stage_completed event with progress percentage, stage_error event with error details, pipeline_completed event, heartbeat at 30s interval, auth guard (401 without JWT), reconnection via Last-Event-ID
- 0 E2E tests

## Implementation Notes
- SSE (Server-Sent Events) for streaming per architecture rules; Socket.io is for presence only.
- SSE connection kept alive with heartbeat every 30 seconds.
- Pipeline stages write progress to a Redis pub/sub channel; SSE controller subscribes and forwards.
- `ProcessingProgress` is an Organism with `PipelineStageIndicator` Molecules (Atomic Design).
- Use design tokens for progress bar colors: `--color-info` (in progress), `--color-success` (complete), `--color-error` (error).
- Auto-reconnect uses `EventSource` with exponential backoff (1s, 2s, 4s, max 30s).
- Express response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Validate JWT before opening SSE connection; reject unauthorized with 401 (not a stream).
