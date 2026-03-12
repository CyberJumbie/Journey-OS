# SOL-020: CopilotKit Workbench Wiring Pattern

## Trigger
When wiring a CopilotKit chat + state preview panel to a LangGraph pipeline in Next.js App Router.
Story it emerged from: P1-026, P1-027, P1-028

## Pattern

### What it solves
Connecting CopilotKit's useCoAgent to a LangGraph StateGraph so STATE_DELTA events
progressively render a preview panel while the chat panel shows conversation.

### Implementation
```typescript
// 1. Page: dynamic import with ssr: false (CopilotKit SSR crash)
// frontend/src/app/(faculty)/workbench/page.tsx
'use client';
import dynamic from 'next/dynamic';
const QuestWorkbench = dynamic(
  () => import('@/components/organisms/QuestWorkbench'),
  { ssr: false }
);

// 2. Organism wires two panels into a split-pane template (~30 lines)
// frontend/src/components/organisms/QuestWorkbench/QuestWorkbench.tsx
export function QuestWorkbench({ courseId }: { courseId: string }) {
  return (
    <WorkbenchTemplate
      left={<ChatPanel courseId={courseId} />}
      right={<QuestionPreviewPanel />}
    />
  );
}

// 3. ChatPanel: CopilotChat + useCopilotReadable for context
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotReadable } from '@copilotkit/react-core';

function ChatPanel({ courseId }: { courseId: string }) {
  useCopilotReadable({ description: "Course ID", value: courseId });
  return <CopilotChat labels={{ title: "Generator" }} />;
}

// 4. PreviewPanel: useCoAgent for streaming state
import { useCoAgent } from '@copilotkit/react-core';
function QuestionPreviewPanel() {
  const { state } = useCoAgent<WorkbenchState>({ name: 'journey_generation' });
  // Render progressively: vignette → stem → options → validation
}

// 5. StreamingText atom: append-only DOM manipulation (no flicker)
// Uses useRef to track lastRenderedLength, appends only new chars as text nodes

// 6. Mutations in organisms, NOT molecules
// ApproveRejectBar receives onApprove/onReject callbacks (pure presentational)
// QuestionPreviewPanel owns useUpdateItemStatus() mutation
```

### Gotchas
- `useCoAgent` name MUST match the agent name in backend CopilotKit runtime config
- CopilotChat CSS must be imported: `import '@copilotkit/react-ui/styles.css'`
- Override CopilotChat styles via globals.css (component doesn't accept className for inner elements)
- StreamingText re-renders the entire string on each STATE_DELTA — DOM append pattern prevents flicker
- Mutations belong in organisms, not molecules (atomic design compliance)

## Provenance
First created: P1-026, P1-027, P1-028
Also applies to: Any future CopilotKit + LangGraph integration
