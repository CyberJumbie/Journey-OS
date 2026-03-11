/**
 * LangGraph StateGraph — generation + review pipeline.
 *
 * Generation branch (mode: 'single' | 'bulk'):
 *   init → context_compiler → vignette_builder → stem_writer
 *   → distractor_generator → dedup_detector → validator → graph_writer
 *   → critic_agent → tagger → toulmin_generator → review_router
 *
 * Review branch (mode: 'review', P2-007):
 *   init → load_review_question → apply_edit → revalidate
 *   → critic_agent → tagger → toulmin_generator → review_router
 *
 * review_router has a conditional edge:
 *   - retry → vignette_builder (generation) or apply_edit (review)
 *   - finish → END
 *
 * Agent ID: journey_generation
 * Served by `langgraph dev` at localhost:2024. CopilotKit connects
 * to it and streams STATE_DELTA events to the frontend useCoAgent hook.
 */

import { StateGraph, Annotation, MessagesAnnotation, END, START } from '@langchain/langgraph';
import type {
  WorkbenchState,
  PipelineStatus,
  ItemTags,
  CriticScore,
  ToulminArgument,
  AutoRoute,
  RefinementTarget,
} from '@journey-os/shared-types';
import { InitNode } from './nodes/InitNode.js';
import { ContextCompilerNode } from './nodes/ContextCompilerNode.js';
import { VignetteBuilderNode } from './nodes/VignetteBuilderNode.js';
import { StemWriterNode } from './nodes/StemWriterNode.js';
import { DistractorGeneratorNode } from './nodes/DistractorGeneratorNode.js';
import { ValidatorNode } from './nodes/ValidatorNode.js';
import { GraphWriterNode } from './nodes/GraphWriterNode.js';
import { TaggerNode } from './nodes/TaggerNode.js';
import { DedupDetectorNode } from './nodes/DedupDetectorNode.js';
import { CriticAgentNode } from './nodes/CriticAgentNode.js';
import { ToulminGeneratorNode } from './nodes/ToulminGeneratorNode.js';
import { ReviewRouterNode } from './nodes/ReviewRouterNode.js';
import { LoadReviewQuestionNode } from './nodes/LoadReviewQuestionNode.js';
import { ApplyEditNode } from './nodes/ApplyEditNode.js';
import { RevalidateNode } from './nodes/RevalidateNode.js';

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

  // Phase 2 state channels
  tags: Annotation<ItemTags | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  criticScores: Annotation<CriticScore[] | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  criticComposite: Annotation<number | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  toulmin: Annotation<ToulminArgument | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  autoRoute: Annotation<AutoRoute | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  retryCount: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  isDuplicate: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  dupSimilarity: Annotation<number | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  dupItemId: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  taskShellId: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Review mode state channels (P2-007)
  reviewItemId: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  editInstruction: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  editedSections: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Refinement routing (P2-009)
  refinementTarget: Annotation<RefinementTarget | null>({
    reducer: (_prev, next) => next,
    default: () => null,
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
const taggerNode = new TaggerNode();
const dedupDetectorNode = new DedupDetectorNode();
const criticAgentNode = new CriticAgentNode();
const toulminGeneratorNode = new ToulminGeneratorNode();
const reviewRouterNode = new ReviewRouterNode();
const loadReviewQuestionNode = new LoadReviewQuestionNode();
const applyEditNode = new ApplyEditNode();
const revalidateNode = new RevalidateNode();

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

async function dedupDetector(state: GraphState): Promise<Partial<GraphState>> {
  return dedupDetectorNode.execute(state);
}

async function criticAgent(state: GraphState): Promise<Partial<GraphState>> {
  return criticAgentNode.execute(state);
}

async function tagger(state: GraphState): Promise<Partial<GraphState>> {
  return taggerNode.execute(state);
}

async function toulminGenerator(state: GraphState): Promise<Partial<GraphState>> {
  return toulminGeneratorNode.execute(state);
}

async function reviewRouter(state: GraphState): Promise<Partial<GraphState>> {
  return reviewRouterNode.execute(state);
}

async function loadReviewQuestion(state: GraphState): Promise<Partial<GraphState>> {
  return loadReviewQuestionNode.execute(state);
}

async function applyEdit(state: GraphState): Promise<Partial<GraphState>> {
  return applyEditNode.execute(state);
}

async function revalidate(state: GraphState): Promise<Partial<GraphState>> {
  return revalidateNode.execute(state);
}

// ── Mode-based routing (P2-007) ─────────────────────────────────────────────────
// After init, route to the correct pipeline branch based on mode.

function modeRouter(state: GraphState): 'generate' | 'review' {
  if (state.mode === 'review') {
    return 'review';
  }
  // 'single' and 'bulk' both use the generation pipeline
  return 'generate';
}

// ── Conditional edge function (self-correction loop) ────────────────────────────
// After review_router runs, check if it signaled a retry (autoRoute = null)
// or a final decision (autoRoute is set to a route string).

function retryOrFinish(state: GraphState): 'retry' | 'finish' {
  // If autoRoute is null, review_router wants a retry loop
  if (state.autoRoute === null || state.autoRoute === undefined) {
    return 'retry';
  }
  // Otherwise, a final route was determined — pipeline is done
  return 'finish';
}

// ── Graph construction ──────────────────────────────────────────────────────────
//
// Generation branch (mode: 'single' | 'bulk'):
//   START → init → context_compiler → vignette_builder → stem_writer
//   → distractor_generator → dedup_detector → validator → graph_writer
//   → critic_agent → tagger → toulmin_generator → review_router
//
// Review branch (mode: 'review', P2-007):
//   START → init → load_review_question → apply_edit → revalidate
//   → critic_agent → tagger → toulmin_generator → review_router
//
// review_router conditional edge:
//   retry → vignette_builder (generation) — review retries handled by re-invocation
//   finish → END

const graphBuilder = new StateGraph(WorkbenchAnnotation)
  // ── Shared nodes ──────────────────────────────────────────────────────────────
  .addNode('init', init)
  .addNode('critic_agent', criticAgent)
  .addNode('tagger', tagger)
  .addNode('toulmin_generator', toulminGenerator)
  .addNode('review_router', reviewRouter)

  // ── Generation branch nodes ───────────────────────────────────────────────────
  .addNode('context_compiler', contextCompiler)
  .addNode('vignette_builder', vignetteBuilder)
  .addNode('stem_writer', stemWriter)
  .addNode('distractor_generator', distractorGenerator)
  .addNode('dedup_detector', dedupDetector)
  .addNode('validator', validator)
  .addNode('graph_writer', graphWriter)

  // ── Review branch nodes (P2-007) ─────────────────────────────────────────────
  .addNode('load_review_question', loadReviewQuestion)
  .addNode('apply_edit', applyEdit)
  .addNode('revalidate', revalidate)

  // ── Entry ─────────────────────────────────────────────────────────────────────
  .addEdge(START, 'init')

  // ── Mode-based branching after init ───────────────────────────────────────────
  .addConditionalEdges('init', modeRouter, {
    generate: 'context_compiler',
    review: 'load_review_question',
  })

  // ── Generation branch edges ───────────────────────────────────────────────────
  .addEdge('context_compiler', 'vignette_builder')
  .addEdge('vignette_builder', 'stem_writer')
  .addEdge('stem_writer', 'distractor_generator')
  .addEdge('distractor_generator', 'dedup_detector')
  .addEdge('dedup_detector', 'validator')
  .addEdge('validator', 'graph_writer')
  .addEdge('graph_writer', 'critic_agent')

  // ── Review branch edges (P2-007) ─────────────────────────────────────────────
  .addEdge('load_review_question', 'apply_edit')
  .addEdge('apply_edit', 'revalidate')
  .addEdge('revalidate', 'critic_agent')

  // ── Shared tail: critic → tagger → toulmin → review_router ────────────────────
  .addEdge('critic_agent', 'tagger')
  .addEdge('tagger', 'toulmin_generator')
  .addEdge('toulmin_generator', 'review_router')

  // ── Self-correction loop ──────────────────────────────────────────────────────
  .addConditionalEdges('review_router', retryOrFinish, {
    retry: 'vignette_builder',
    finish: END,
  });

/**
 * Compiled graph — exported for langgraph.json.
 * Agent ID: journey_generation
 * The LangGraph dev server picks this up via:
 *   "journey_generation": "./src/pipeline/graph.ts:compiledGraph"
 */
export const compiledGraph = graphBuilder.compile();
