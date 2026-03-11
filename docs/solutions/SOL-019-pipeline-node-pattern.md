# SOL-019: Pipeline Node Pattern (LangGraph.js Generation)

## Trigger
When implementing any new LangGraph pipeline node in `backend/src/pipeline/nodes/`.
Story it emerged from: P1-016 through P1-023 (Epic 1.3)

## Pattern

### What it solves
Consistent structure for every pipeline node: interface contract, prompt loading, model selection, state updates, and TEXT_MESSAGE emissions for CopilotKit.

### Implementation
```typescript
// Layer: pipeline
// File convention: backend/src/pipeline/nodes/{NodeName}.ts (PascalCase)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import AnthropicClient from '../../lib/AnthropicClient.js';

// Load prompt at module level (once)
function loadPrompt(): string {
  return readFileSync(
    path.join(__dirname, '../prompts/my-node-system.txt'),
    'utf-8',
  );
}

// Model selection (Rule 6):
//   Haiku for cheap ops (classifier, context refiner)
//   Sonnet for generation (vignette, stem, distractor)
//   NO Opus in Phase 1
const MODEL = 'claude-sonnet-4-5-20250929';

export class MyNode implements IPipelineNode {
  readonly name = 'my_node';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    const anthropic = AnthropicClient.getInstance(); // Singleton
    const systemPrompt = loadPrompt(); // From .txt file (Rule 8)

    // Stream response
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: '...' }],
    });

    let accumulated = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        accumulated += event.delta.text;
      }
    }

    // TEXT_MESSAGE for CopilotKit progress
    const messages = [new AIMessage({ content: 'Node completed...' })];

    // WorkbenchStateBuilder for state (never raw object literals)
    return {
      ...new WorkbenchStateBuilder().withMyField(accumulated).build(),
      messages,
    };
  }
}
```

### Graph wiring pattern
```typescript
// In graph.ts — wrap IPipelineNode.execute() for LangGraph
const myNode = new MyNode();
async function myNodeFn(state: GraphState): Promise<Partial<GraphState>> {
  return myNode.execute(state as WorkbenchState);
}
graphBuilder.addNode('my_node', myNodeFn);
```

### Gotchas
- `readFileSync` path uses `__dirname` — works in CJS but may need `import.meta.url` in ESM
- WorkbenchStateBuilder returns `Partial<WorkbenchState>` but `messages` field (for AIMessage) is a LangGraph channel, not on WorkbenchState — spread builder result alongside `{ messages }`
- Anthropic streaming events: check `event.type === 'content_block_delta'` AND `event.delta.type === 'text_delta'`
- For JSON responses (DistractorGenerator), parse accumulated text with `JSON.parse` — add fallback for malformed JSON

## Provenance
First created: P1-016 through P1-023 (Epic 1.3)
Also applies to: P2-005 (TaggerNode), P2-006 (CriticAgentNode), P2-007 (ReviewRouterNode)
