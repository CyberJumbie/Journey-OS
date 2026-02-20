# STORY-F-52 Brief: ChatPanel Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-52
old_id: S-F-19-2
lane: faculty
lane_priority: 3
within_lane_order: 52
sprint: 7
size: L
depends_on:
  - STORY-F-43 (faculty) — Workbench SplitPane layout exists
  - STORY-F-38 (faculty) — SSE streaming endpoint exists
blocks: []
personas_served: [faculty]
epic: E-19 (Workbench UI)
feature: F-09 (Generation Workbench)
```

## 1. Summary

Build a **CopilotKit-powered chat panel** with real-time SSE streaming display for conversational question generation and refinement. The panel integrates the CopilotKit `<CopilotChat>` component and displays messages with role indicators (user, assistant, system). SSE streaming tokens render incrementally with a typewriter effect and less than 500ms to first token. A pipeline progress bar shows the current generation node (e.g., "Generating vignette... step 3/14"). When generation completes, a question preview card renders inline in NBME-style format. Faculty can conversationally refine items ("make the vignette longer"), triggering targeted pipeline re-entry. Message history is persisted per session in a Supabase `generation_sessions` table. The input area supports multiline text with Enter to send / Shift+Enter for newline. Empty state shows onboarding prompt suggestions. Pipeline errors display as dismissible alerts.

Key constraints:
- CopilotKit integration with custom `useGenerationStream` wrapper for SSE STATE_DELTA parsing
- StreamingText atom for incremental token rendering with cursor animation
- QuestionPreviewCard in NBME-style (vignette, stem, options A-E)
- Session persistence in `generation_sessions` table
- CopilotKit runtime configured in server with LangGraph pipeline as tool
- Named exports only, TypeScript strict, design tokens only, atomic design

## 2. Task Breakdown

1. **Types** -- Create `ChatMessage`, `ChatSession`, `PipelineProgress`, `StreamToken` in `packages/types/src/workbench/`
2. **Chat bubble atom** -- `ChatBubble` in `packages/ui/src/atoms/` with role-based styling
3. **Streaming text atom** -- `StreamingText` in `packages/ui/src/atoms/` with cursor animation
4. **Chat input molecule** -- `ChatInput` in `packages/ui/src/molecules/` with multiline and Enter/Shift+Enter
5. **Progress bar molecule** -- `ProgressBar` in `packages/ui/src/molecules/` for pipeline stages
6. **Question preview card** -- `QuestionPreviewCard` organism in NBME format
7. **Chat panel** -- `ChatPanel` organism integrating CopilotKit
8. **Generation stream service** -- `GenerationStreamService` in web app for SSE parsing
9. **useGenerationStream hook** -- Wraps CopilotKit `useCopilotChat` with SSE handling
10. **useChatSession hook** -- Manages session creation and persistence
11. **Supabase migration** -- `generation_sessions` table
12. **API tests** -- 12-15 tests covering message rendering, streaming, session persistence, error handling, refinement
13. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/workbench/chat.types.ts

/** Chat message role */
export type ChatMessageRole = "user" | "assistant" | "system";

/** Pipeline stage for progress tracking */
export interface PipelineStage {
  readonly name: string;
  readonly label: string;
  readonly index: number;
  readonly total: number;
  readonly status: "pending" | "active" | "completed" | "error";
}

/** Pipeline progress state */
export interface PipelineProgress {
  readonly current_stage: string;
  readonly current_index: number;
  readonly total_stages: number;
  readonly label: string;
  readonly percentage: number;
}

/** Chat message */
export interface ChatMessage {
  readonly id: string;
  readonly session_id: string;
  readonly role: ChatMessageRole;
  readonly content: string;
  readonly is_streaming: boolean;
  readonly pipeline_progress: PipelineProgress | null;
  readonly generated_question: GeneratedQuestionPreview | null;
  readonly error: ChatMessageError | null;
  readonly created_at: string;
}

/** Error within a chat message */
export interface ChatMessageError {
  readonly code: string;
  readonly message: string;
  readonly dismissible: boolean;
}

/** Generated question preview (displayed inline in chat) */
export interface GeneratedQuestionPreview {
  readonly id: string;
  readonly vignette: string;
  readonly stem: string;
  readonly options: readonly { key: string; text: string }[];
  readonly correct_answer: string;
  readonly rationale: string;
  readonly bloom_level: string;
  readonly difficulty: string;
}

/** Chat session stored in Supabase */
export interface ChatSession {
  readonly id: string;
  readonly user_id: string;
  readonly course_id: string;
  readonly messages: readonly ChatMessage[];
  readonly generation_spec: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** SSE stream token event */
export interface StreamToken {
  readonly type: "token" | "state_delta" | "progress" | "complete" | "error";
  readonly content: string;
  readonly metadata: Record<string, unknown>;
}

/** Prompt suggestion for empty state */
export interface PromptSuggestion {
  readonly label: string;
  readonly prompt: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_generation_sessions_table

CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  generation_spec JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON generation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON generation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON generation_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX idx_generation_sessions_course_id ON generation_sessions(course_id);
CREATE INDEX idx_generation_sessions_updated_at ON generation_sessions(updated_at DESC);
```

## 5. API Contract (complete request/response)

### POST /api/v1/generation/sessions (Auth: faculty)

Creates a new chat session.

**Request Body:**
```json
{
  "course_id": "course-uuid-1"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "session-uuid-1",
    "user_id": "faculty-uuid-1",
    "course_id": "course-uuid-1",
    "messages": [],
    "generation_spec": null,
    "created_at": "2026-02-19T10:00:00Z",
    "updated_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/generation/sessions/:sessionId (Auth: faculty, owner)

Updates session messages (append).

**Request Body:**
```json
{
  "messages": [
    {
      "id": "msg-uuid-1",
      "role": "user",
      "content": "Generate a cardiology question about STEMI management",
      "is_streaming": false,
      "pipeline_progress": null,
      "generated_question": null,
      "error": null,
      "created_at": "2026-02-19T10:01:00Z"
    }
  ]
}
```

### GET /api/v1/generation/sessions?course_id={courseId} (Auth: faculty)

Lists user's sessions for a course.

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "session-uuid-1",
      "course_id": "course-uuid-1",
      "messages": [],
      "created_at": "2026-02-19T10:00:00Z",
      "updated_at": "2026-02-19T10:00:00Z"
    }
  ],
  "error": null,
  "meta": { "total": 1, "page": 1, "per_page": 20 }
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not session owner |
| 404 | `NOT_FOUND` | Session not found |

## 6. Frontend Spec

### ChatPanel Component

**File:** `apps/web/src/components/workbench/chat-panel.tsx`

```
ChatPanel (organism)
  ├── CopilotChat (CopilotKit) — wraps the entire panel
  │   ├── Message list (scrollable)
  │   │   ├── ChatBubble[] (atom) — role-based styling
  │   │   │   ├── User: right-aligned, Navy Deep background
  │   │   │   ├── Assistant: left-aligned, White background
  │   │   │   └── System: centered, Cream background
  │   │   ├── StreamingText (atom) — typewriter effect with blinking cursor
  │   │   ├── ProgressBar (molecule) — "Generating vignette... step 3/14"
  │   │   ├── QuestionPreviewCard (organism) — NBME-style preview
  │   │   └── Error alert (dismissible) — pipeline error display
  │   ├── Empty state: onboarding prompt suggestions
  │   │   ├── "Generate a cardiology question about..."
  │   │   ├── "Create an EMQ set for pharmacology..."
  │   │   └── "Build a diagnostic reasoning item..."
  │   └── ChatInput (molecule)
  │       ├── Multiline textarea
  │       ├── Enter to send / Shift+Enter for newline
  │       └── Send button (Lucide Send icon)
  └── Session selector (for resuming previous sessions)
```

**States:**
1. **Empty** -- Prompt suggestions displayed, no messages
2. **Typing** -- User composing a message
3. **Streaming** -- Assistant response streaming with typewriter effect
4. **Progress** -- Pipeline progress bar visible during generation
5. **Complete** -- QuestionPreviewCard displayed inline
6. **Refining** -- User sends refinement message, pipeline re-enters
7. **Error** -- Dismissible error alert within chat

**Design tokens:**
- User bubble: Navy Deep `#002c76` background, White text
- Assistant bubble: White `#ffffff` background, text-foreground
- System bubble: Cream `#f5f3ef` background, text-muted-foreground
- Streaming cursor: blinking Navy Deep `#002c76` bar
- Progress bar track: Cream `#f5f3ef`, fill: Green `#69a338`
- QuestionPreviewCard: White `#ffffff` card with Navy Deep border, NBME format
- Error alert: destructive variant from design system
- Send button: Navy Deep `#002c76` icon
- Empty state text: text-muted-foreground
- Prompt suggestion chips: Cream `#f5f3ef` background with hover

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/workbench/chat.types.ts` | Types | Create |
| 2 | `packages/types/src/workbench/index.ts` | Types | Edit (add chat exports) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add workbench export if not done) |
| 4 | Supabase migration: `generation_sessions` table | Database | Apply via MCP |
| 5 | `packages/ui/src/atoms/chat-bubble.tsx` | Atom | Create |
| 6 | `packages/ui/src/atoms/streaming-text.tsx` | Atom | Create |
| 7 | `packages/ui/src/molecules/chat-input.tsx` | Molecule | Create |
| 8 | `packages/ui/src/molecules/progress-bar.tsx` | Molecule | Create |
| 9 | `apps/web/src/components/workbench/question-preview-card.tsx` | Organism | Create |
| 10 | `apps/web/src/components/workbench/chat-panel.tsx` | Organism | Create |
| 11 | `apps/web/src/services/generation-stream.service.ts` | Service | Create |
| 12 | `apps/web/src/hooks/use-generation-stream.ts` | Hook | Create |
| 13 | `apps/web/src/hooks/use-chat-session.ts` | Hook | Create |
| 14 | `apps/web/src/__tests__/workbench/chat-panel.test.tsx` | Tests | Create |
| 15 | `apps/web/src/__tests__/workbench/generation-stream.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-43 | faculty | Pending | Workbench SplitPane layout must exist |
| STORY-F-38 | faculty | Pending | SSE streaming endpoint must exist |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- `@copilotkit/react-core` -- CopilotKit React SDK
- `@copilotkit/react-ui` -- CopilotKit UI components
- `@copilotkit/runtime` -- CopilotKit server runtime (for apps/server)

### Existing Files Needed
- `apps/web/src/components/workbench/` -- Workbench layout (from STORY-F-43)
- `apps/server/src/services/generation/` -- Generation pipeline (from STORY-F-38)
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/web/src/lib/supabase/` -- Supabase client for session persistence

## 9. Test Fixtures (inline)

```typescript
// Mock chat messages
export const USER_MESSAGE: ChatMessage = {
  id: "msg-uuid-1",
  session_id: "session-uuid-1",
  role: "user",
  content: "Generate a cardiology question about STEMI management",
  is_streaming: false,
  pipeline_progress: null,
  generated_question: null,
  error: null,
  created_at: "2026-02-19T10:01:00Z",
};

export const STREAMING_ASSISTANT_MESSAGE: ChatMessage = {
  id: "msg-uuid-2",
  session_id: "session-uuid-1",
  role: "assistant",
  content: "A 55-year-old male presents to the emergency department with...",
  is_streaming: true,
  pipeline_progress: {
    current_stage: "generate_vignette",
    current_index: 3,
    total_stages: 14,
    label: "Generating vignette...",
    percentage: 21,
  },
  generated_question: null,
  error: null,
  created_at: "2026-02-19T10:01:05Z",
};

export const COMPLETED_ASSISTANT_MESSAGE: ChatMessage = {
  id: "msg-uuid-3",
  session_id: "session-uuid-1",
  role: "assistant",
  content: "Here is your generated question:",
  is_streaming: false,
  pipeline_progress: null,
  generated_question: {
    id: "question-uuid-1",
    vignette: "A 55-year-old male with a history of hypertension presents to the emergency department with acute substernal chest pain radiating to the left arm for the past 30 minutes. ECG shows ST-segment elevation in leads V1-V4.",
    stem: "Which of the following is the most appropriate next step in management?",
    options: [
      { key: "A", text: "Administer aspirin and clopidogrel, prepare for primary PCI" },
      { key: "B", text: "Order troponin levels and repeat ECG in 6 hours" },
      { key: "C", text: "Start IV nitroglycerin and admit to telemetry" },
      { key: "D", text: "Perform chest X-ray and CT angiography" },
      { key: "E", text: "Prescribe sublingual nitroglycerin and discharge home" },
    ],
    correct_answer: "A",
    rationale: "Anterior STEMI requires immediate dual antiplatelet therapy and primary PCI. Door-to-balloon time should be under 90 minutes.",
    bloom_level: "Apply",
    difficulty: "medium",
  },
  error: null,
  created_at: "2026-02-19T10:01:30Z",
};

export const ERROR_MESSAGE: ChatMessage = {
  id: "msg-uuid-4",
  session_id: "session-uuid-1",
  role: "system",
  content: "",
  is_streaming: false,
  pipeline_progress: null,
  generated_question: null,
  error: {
    code: "GENERATION_FAILED",
    message: "Pipeline failed at vignette generation stage. Please try again.",
    dismissible: true,
  },
  created_at: "2026-02-19T10:02:00Z",
};

export const REFINEMENT_MESSAGE: ChatMessage = {
  id: "msg-uuid-5",
  session_id: "session-uuid-1",
  role: "user",
  content: "Make the vignette longer and add more clinical details",
  is_streaming: false,
  pipeline_progress: null,
  generated_question: null,
  error: null,
  created_at: "2026-02-19T10:03:00Z",
};

// Mock session
export const MOCK_SESSION: ChatSession = {
  id: "session-uuid-1",
  user_id: "faculty-uuid-1",
  course_id: "course-uuid-1",
  messages: [USER_MESSAGE, COMPLETED_ASSISTANT_MESSAGE],
  generation_spec: null,
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:01:30Z",
};

// Prompt suggestions for empty state
export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { label: "Cardiology", prompt: "Generate a cardiology question about STEMI management" },
  { label: "Pharmacology", prompt: "Create an EMQ set for drug interactions" },
  { label: "Diagnostic", prompt: "Build a diagnostic reasoning item for abdominal pain" },
];

// Mock SSE tokens
export const MOCK_STREAM_TOKENS: StreamToken[] = [
  { type: "progress", content: "", metadata: { stage: "generate_vignette", index: 1, total: 14 } },
  { type: "token", content: "A ", metadata: {} },
  { type: "token", content: "55-year-old ", metadata: {} },
  { type: "token", content: "male ", metadata: {} },
  { type: "complete", content: "", metadata: { question_id: "question-uuid-1" } },
];
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/web/src/__tests__/workbench/chat-panel.test.tsx`

```
describe("ChatPanel")
  describe("message rendering")
    > renders user messages with right-aligned Navy Deep bubble
    > renders assistant messages with left-aligned White bubble
    > renders system messages centered with Cream background
    > renders empty state with prompt suggestions when no messages

  describe("streaming display")
    > renders StreamingText with typewriter effect during streaming
    > shows pipeline progress bar with stage label and percentage
    > streaming text has blinking cursor animation

  describe("question preview")
    > renders QuestionPreviewCard inline when generation completes
    > preview card shows vignette, stem, options A-E in NBME format
    > preview card shows correct answer and rationale

  describe("input")
    > Enter key sends message
    > Shift+Enter inserts newline
    > send button submits message

  describe("error handling")
    > renders dismissible error alert for pipeline errors
    > dismissing error removes alert from chat

  describe("session persistence")
    > creates new session on first message
    > appends messages to existing session
```

**File:** `apps/web/src/__tests__/workbench/generation-stream.test.ts`

```
describe("GenerationStreamService")
  > parses SSE token events into StreamToken objects
  > parses progress events with stage metadata
  > handles complete event with question data
  > handles error events gracefully
```

**Total: ~19 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The ChatPanel is a core workbench component. E2E coverage for the full generation workflow (one of the 5 critical journeys) will cover chat interaction in a later story.

## 12. Acceptance Criteria

1. ChatPanel integrates CopilotKit `<CopilotChat>` component
2. Messages display with role indicators (user, assistant, system) and role-based styling
3. SSE streaming tokens render incrementally with typewriter effect and less than 500ms to first token
4. Pipeline progress bar shows current node label and step count
5. QuestionPreviewCard renders inline in NBME format when generation completes
6. Conversational refinement: user message triggers targeted pipeline re-entry
7. Message history persisted per session in Supabase `generation_sessions` table
8. Multiline input with Enter to send / Shift+Enter for newline
9. Empty state shows onboarding prompt suggestions
10. Pipeline errors shown as dismissible alerts within chat
11. All 19 API tests pass
12. Named exports only, TypeScript strict, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| CopilotKit CopilotChat integration | S-F-19-2 Acceptance Criteria |
| SSE streaming with less than 500ms first token | S-F-19-2 Acceptance Criteria |
| Pipeline progress bar | S-F-19-2 Acceptance Criteria: "step 3/14" |
| QuestionPreviewCard in NBME format | S-F-19-2 Notes: "NBME-style format (vignette, stem, options A-E)" |
| generation_sessions table | S-F-19-2 Notes: "create generation_sessions table with columns" |
| Conversational refinement | S-F-19-2 Acceptance Criteria: "make the vignette longer" |
| CopilotKit runtime with LangGraph | S-F-19-2 Notes: "CopilotKit runtime must be configured with LangGraph pipeline as a tool" |
| SSE STATE_DELTA parsing | S-F-19-2 Notes: "wrap with custom useGenerationStream for SSE STATE_DELTA parsing" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `profiles` and `courses` tables exist
- **Express:** Server running on port 3001 with SSE generation endpoint (from STORY-F-38)
- **Next.js:** Web app running on port 3000
- **CopilotKit:** `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime` installed
- **LLM API key:** Claude API key configured for CopilotKit runtime

## 15. Implementation Notes

- **CopilotKit setup:** Configure `CopilotKitProvider` in the workbench layout. Server-side: add `@copilotkit/runtime` to Express with the LangGraph generation pipeline registered as a CopilotKit tool/action.
- **useGenerationStream hook:** Wraps CopilotKit's `useCopilotChat`. Intercepts SSE events, parses `STATE_DELTA` events into `StreamToken` objects. Manages `isStreaming`, `progress`, `currentTokens` state. Exposes `sendMessage(text)` and `cancel()`.
- **StreamingText atom:** Renders accumulated tokens character-by-character with CSS animation. Blinking cursor uses `@keyframes` animation on a `|` character. New tokens appended to existing content on each `StreamToken` event.
- **QuestionPreviewCard:** Card component rendering vignette (italic block), stem (bold), options A-E (lettered list with correct answer highlighted in Green), rationale (collapsible section). Uses shadcn/ui Card + Collapsible.
- **ChatInput:** `<textarea>` with `onKeyDown` handler. `event.key === "Enter" && !event.shiftKey` triggers send. `rows` auto-expands up to 5 rows. Reset to single row after send.
- **Session persistence:** `useChatSession` hook creates session via POST on first message, then PATCH to append messages after each exchange. Session ID stored in URL search params for bookmarkability.
- **Error display:** Pipeline errors parsed from SSE `error` events. Rendered as shadcn/ui `Alert` with `variant="destructive"` and close button. Dismissing removes from message list.
- **No default exports:** All atoms, molecules, organisms, hooks, services use named exports only.
