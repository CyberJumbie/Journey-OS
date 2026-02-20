# STORY-F-52: ChatPanel Component

**Epic:** E-19 (Workbench UI)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 7
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-19-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a CopilotKit-powered chat panel with real-time SSE streaming display so that I can conversationally generate and refine assessment items while seeing results stream in live.

## Acceptance Criteria
- [ ] ChatPanel organism integrates CopilotKit `<CopilotChat>` component
- [ ] Messages display with role indicators (user, assistant, system)
- [ ] SSE streaming tokens render incrementally (typewriter effect) with <500ms to first token
- [ ] Pipeline progress bar: shows current node (e.g., "Generating vignette... step 3/14")
- [ ] Generated question preview card renders inline when generation completes
- [ ] Conversational refinement: user can say "make the vignette longer" and pipeline re-runs targeted node
- [ ] Message history persisted per session in Supabase `generation_sessions` table
- [ ] Input area: multiline text input with send button and `Enter` to send / `Shift+Enter` for newline
- [ ] Empty state: onboarding prompt suggestions ("Generate a cardiology question about...")
- [ ] Error display: pipeline errors shown as dismissible alert within chat
- [ ] 12-15 API tests: message rendering, streaming display, session persistence, error handling, refinement flow
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/faculty/QuestWorkbench.tsx` (ChatPanel, ChatMessage components) | `apps/web/src/components/workbench/chat-panel.tsx` | Extract `ChatPanel` and `ChatMessage` from the monolithic QuestWorkbench; replace all inline `style={{}}` with Tailwind design tokens; replace hardcoded colors (`C.navyDeep`, `C.parchment`, `C.green`) with CSS custom properties; convert to named exports; replace mock conversation data with SSE stream integration via `useGenerationStream` hook; replace raw `<input>` with shadcn/ui `Textarea`; extract `Tag` component into proper atom |
| `pages/questions/AIRefinement.tsx` | `apps/web/src/components/workbench/chat-panel.tsx` | Merge AI chat refinement patterns into ChatPanel; reuse chat message rendering and suggestion chips; replace react-router `useNavigate`/`useParams` with Next.js equivalents; convert `export default` to named export |
| `pages/questions/ConversationalRefinement.tsx` | `apps/web/src/components/workbench/chat-panel.tsx` | Merge conversational refinement iteration tracking (iteration count, max iterations, target stage selection) into ChatPanel refinement mode; replace inline styles with Tailwind; replace `getDiffHighlight` logic with proper diff rendering component |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/workbench/chat.types.ts` |
| Atoms | packages/ui | `src/atoms/chat-bubble.tsx`, `src/atoms/streaming-text.tsx` |
| Molecules | packages/ui | `src/molecules/chat-input.tsx`, `src/molecules/progress-bar.tsx` |
| Organisms | apps/web | `src/components/workbench/chat-panel.tsx`, `src/components/workbench/question-preview-card.tsx` |
| Service | apps/web | `src/services/generation-stream.service.ts` |
| Hooks | apps/web | `src/hooks/use-generation-stream.ts`, `src/hooks/use-chat-session.ts` |
| Tests | apps/web | `src/__tests__/workbench/chat-panel.test.tsx`, `src/__tests__/workbench/generation-stream.test.ts` |

## Database Schema

### Supabase -- `generation_sessions` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK -> auth.users |
| `course_id` | uuid | NOT NULL, FK -> courses |
| `messages` | jsonb | NOT NULL, DEFAULT '[]' |
| `generation_spec` | jsonb | NULL |
| `status` | varchar(20) | NOT NULL, DEFAULT 'active' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/generation-sessions` | Faculty+ | Create new chat session |
| GET | `/api/v1/generation-sessions/:id` | Faculty+ | Get session with messages |
| PATCH | `/api/v1/generation-sessions/:id` | Faculty+ | Append message to session |
| GET | `/api/v1/generate` | Faculty+ | SSE stream generation events (exists) |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-43 (SplitPane layout), STORY-F-38 (SSE streaming from pipeline)
- **Cross-epic:** STORY-F-38 (Sprint 6 SSE streaming)

## Testing Requirements
### API Tests (12-15)
1. Renders chat panel with header showing session mode
2. Renders user messages right-aligned with correct styling
3. Renders assistant messages left-aligned with correct styling
4. Streaming text renders incrementally with cursor animation
5. Progress bar updates with pipeline node names during generation
6. Generated question preview card renders inline on completion
7. Input area sends message on Enter key
8. Shift+Enter creates newline in input
9. Empty state shows suggestion prompt chips
10. Error messages render as dismissible alerts
11. Session messages persist to Supabase on send
12. Refinement message includes previous generation context
13. Auto-scrolls to newest message
14. CopilotKit integration initializes correctly

## Implementation Notes
- CopilotKit provides `useCopilotChat` hook -- wrap with custom `useGenerationStream` for SSE STATE_DELTA parsing.
- StreamingText atom handles incremental token rendering with cursor animation via CSS `@keyframes`.
- QuestionPreviewCard renders completed item in NBME-style format (vignette, stem, options A-E).
- Session persistence: `generation_sessions` table stores messages as JSONB array.
- Refinement: new message includes previous generation context; pipeline re-enters at relevant node.
- CopilotKit runtime configured in apps/server with LangGraph pipeline as a tool.
- ChatBubble atom: user messages use `--navy-deep` background, assistant messages use `--parchment` background with border.
- ProgressBar molecule: shows current pipeline node name and step count. Design tokens for progress bar colors.
- Input area: shadcn/ui `Textarea` with send button. Extracted params shown as `Tag` chips below input.
- SSE connection uses `EventSource` with auto-reconnect and exponential backoff (1s, 2s, 4s, max 30s).
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
