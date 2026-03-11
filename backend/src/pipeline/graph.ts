/**
 * P1-016: LangGraph StateGraph — 7-node generation pipeline scaffold.
 *
 * Linear pipeline: init → context_compiler → vignette_builder → stem_writer
 *   → distractor_generator → validator → graph_writer
 *
 * Each node implements IPipelineNode. Currently all are pass-through stubs
 * that will be fleshed out in P1-017 through P1-023.
 *
 * Agent ID: journey_generation
 * Served by `langgraph dev` at localhost:2024. CopilotKit connects
 * to it and streams STATE_DELTA events to the frontend useCoAgent hook.
 */

import { StateGraph, Annotation, MessagesAnnotation, END, START } from '@langchain/langgraph';
import type { WorkbenchState, PipelineStatus } from '@journey-os/shared-types';
import { InitNode } from './nodes/InitNode.js';
import { ContextCompilerNode } from './nodes/ContextCompilerNode.js';
import { VignetteBuilderNode } from './nodes/VignetteBuilderNode.js';
import { StemWriterNode } from './nodes/StemWriterNode.js';
import { DistractorGeneratorNode } from './nodes/DistractorGeneratorNode.js';
import { ValidatorNode } from './nodes/ValidatorNode.js';
import { GraphWriterNode } from './nodes/GraphWriterNode.js';

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
  sourceChunkIds: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
});

// ── Type alias for the annotated state ──────────────────────────────────────────
type GraphState = typeof WorkbenchAnnotation.State;

// ── Node instances ──────────────────────────────────────────────────────────────

const initNode = new InitNode();
const contextCompilerNode = new ContextCompilerNode();
const vignetteBuilderNode = new VignetteBuilderNode();
const stemWriterNode = new StemWriterNode();
const distractorGeneratorNode = new DistractorGeneratorNode();
const validatorNode = new ValidatorNode();
const graphWriterNode = new GraphWriterNode();

// ── Node wrapper functions ──────────────────────────────────────────────────────
// LangGraph expects plain functions (state) => Partial<state>.
// These wrappers delegate to the IPipelineNode instances.

async function init(state: GraphState): Promise<Partial<GraphState>> {
  return initNode.execute(state);
}

async function contextCompiler(state: GraphState): Promise<Partial<GraphState>> {
  return contextCompilerNode.execute(state);
}

async function vignetteBuilder(state: GraphState): Promise<Partial<GraphState>> {
  return vignetteBuilderNode.execute(state);
}

async function stemWriter(state: GraphState): Promise<Partial<GraphState>> {
  return stemWriterNode.execute(state);
}

async function distractorGenerator(state: GraphState): Promise<Partial<GraphState>> {
  return distractorGeneratorNode.execute(state);
}

async function validator(state: GraphState): Promise<Partial<GraphState>> {
  return validatorNode.execute(state);
}

async function graphWriter(state: GraphState): Promise<Partial<GraphState>> {
  return graphWriterNode.execute(state);
}

// ── Graph construction ──────────────────────────────────────────────────────────
// Linear pipeline: START → init → context_compiler → vignette_builder →
//   stem_writer → distractor_generator → validator → graph_writer → END

const graphBuilder = new StateGraph(WorkbenchAnnotation)
  .addNode('init', init)
  .addNode('context_compiler', contextCompiler)
  .addNode('vignette_builder', vignetteBuilder)
  .addNode('stem_writer', stemWriter)
  .addNode('distractor_generator', distractorGenerator)
  .addNode('validator', validator)
  .addNode('graph_writer', graphWriter)
  .addEdge(START, 'init')
  .addEdge('init', 'context_compiler')
  .addEdge('context_compiler', 'vignette_builder')
  .addEdge('vignette_builder', 'stem_writer')
  .addEdge('stem_writer', 'distractor_generator')
  .addEdge('distractor_generator', 'validator')
  .addEdge('validator', 'graph_writer')
  .addEdge('graph_writer', END);

/**
 * Compiled graph — exported for langgraph.json.
 * Agent ID: journey_generation
 * The LangGraph dev server picks this up via:
 *   "journey_generation": "./src/pipeline/graph.ts:compiledGraph"
 */
export const compiledGraph = graphBuilder.compile();
