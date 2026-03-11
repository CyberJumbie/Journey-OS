/**
 * P1-008: LangGraph.js StateGraph — Spike stub
 *
 * Minimal StateGraph with one pass-through node that transitions
 * pipelineStatus: idle -> running -> completed.
 *
 * Served by `langgraph dev` at localhost:2024. CopilotKit connects
 * to it and streams STATE_DELTA events to the frontend useCoAgent hook.
 *
 * This graph will be expanded to 7 pipeline nodes in Epic 1.3.
 */

import { StateGraph, Annotation, MessagesAnnotation, END, START } from '@langchain/langgraph';
import type { WorkbenchState, PipelineStatus } from '@journey-os/shared-types';

// ── State Annotation ────────────────────────────────────────────────────────────
// Extends MessagesAnnotation to include the messages channel required by
// the LangGraph Platform protocol (CopilotKit uses this for chat history).

export const WorkbenchAnnotation = Annotation.Root({
  // Messages channel — required for LangGraph Platform + CopilotKit interop
  ...MessagesAnnotation.spec,

  // Pipeline-specific state channels
  mode: Annotation<WorkbenchState['mode']>({
    reducer: (_prev, next) => next,
    default: () => 'single' as const,
  }),
  courseId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  userMessage: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  targetConcepts: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  context: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  vignette: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  stem: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  options: Annotation<WorkbenchState['options']>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  validationResults: Annotation<WorkbenchState['validationResults']>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  pipelineStatus: Annotation<PipelineStatus>({
    reducer: (_prev, next) => next,
    default: () => 'idle' as const,
  }),
  generationLogId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  itemId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

// ── Type alias for the annotated state ──────────────────────────────────────────
type GraphState = typeof WorkbenchAnnotation.State;

// ── Pass-through node ───────────────────────────────────────────────────────────
// Spike node: transitions pipelineStatus through running -> completed.
// Each state update triggers a STATE_DELTA event to CopilotKit.

async function spikePassthroughNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  console.log('[spike-node] Entering pass-through node');
  console.log('[spike-node] userMessage:', state.userMessage);

  // Simulate pipeline work
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    pipelineStatus: 'completed' as const,
    context: `Spike processed message: "${state.userMessage}"`,
    stem: 'This is a spike-generated stem for testing STATE_DELTA.',
    vignette:
      'A 45-year-old patient presents for evaluation. [Spike test vignette]',
  };
}

// ── Graph construction ──────────────────────────────────────────────────────────

const graphBuilder = new StateGraph(WorkbenchAnnotation)
  .addNode('spike_passthrough', spikePassthroughNode)
  .addEdge(START, 'spike_passthrough')
  .addEdge('spike_passthrough', END);

/**
 * Compiled graph — exported for langgraph.json.
 * The LangGraph dev server picks this up via:
 *   "journey_generation": "./src/pipeline/graph.ts:compiledGraph"
 */
export const compiledGraph = graphBuilder.compile();
