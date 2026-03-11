/**
 * ContextCompilerNode — retrieves and refines relevant content chunks for generation.
 *
 * Two RAG paths merged via Reciprocal Rank Fusion (RRF):
 * 1. Graph RAG: SubConcept → TEACHES → ContentChunk (Neo4j)
 * 2. Vector RAG: pgvector cosine similarity search (Supabase)
 *
 * After merging, Haiku refines the context to a 4,000-token budget.
 *
 * Model: claude-haiku-4-5-20241022 (context refiner — cheap ops, Rule 6)
 */

import fs from 'fs';
import path from 'path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import { GraphRepository } from '../../repositories/graph.repository.js';
import { ChunkRepository } from '../../repositories/chunk.repository.js';
import { EmbeddingProviderFactory } from '../../ingestion/EmbeddingProviderFactory.js';
import AnthropicClient from '../../lib/AnthropicClient.js';
import { config } from '../../config/config.js';

/** Maximum token budget for refined context. */
const CONTEXT_TOKEN_BUDGET = 4000;

/** Approximate tokens per character (conservative estimate). */
const CHARS_PER_TOKEN = 4;

/** Maximum character budget based on token estimate. */
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * CHARS_PER_TOKEN;

/** RRF constant (standard value from the literature). */
const RRF_K = 60;

/**
 * Load a prompt template from the prompts directory.
 * Rule 8: Prompts in separate .txt files, never inline.
 */
function loadPrompt(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

/**
 * Reciprocal Rank Fusion — merges two ranked lists into a single ranking.
 * Score for each ID: sum of 1/(k + rank_i) across all lists where it appears.
 * Higher scores = more relevant (appears in multiple lists or ranked higher).
 */
function reciprocalRankFusion(
  graphRanks: string[],
  vectorRanks: string[],
  k: number = RRF_K,
): string[] {
  const scores: Record<string, number> = {};

  graphRanks.forEach((id, i) => {
    scores[id] = (scores[id] ?? 0) + 1 / (k + i + 1);
  });

  vectorRanks.forEach((id, i) => {
    scores[id] = (scores[id] ?? 0) + 1 / (k + i + 1);
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
}

export class ContextCompilerNode implements IPipelineNode {
  readonly name = 'context_compiler';

  private readonly graphRepo: GraphRepository;
  private readonly chunkRepo: ChunkRepository;

  constructor() {
    this.graphRepo = new GraphRepository();
    this.chunkRepo = new ChunkRepository();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] compiling context for concepts: ${state.targetConcepts.join(', ')}`);

    // ── 1. Graph RAG path ──────────────────────────────────────────────────────
    const graphChunkIds = await this.graphRagSearch(state.targetConcepts);
    console.log(`[${this.name}] graph RAG returned ${graphChunkIds.length} chunk IDs`);

    // ── 2. Vector RAG path ─────────────────────────────────────────────────────
    const vectorChunkIds = await this.vectorRagSearch(state.courseId, state.userMessage);
    console.log(`[${this.name}] vector RAG returned ${vectorChunkIds.length} chunk IDs`);

    // ── 3. RRF merge ───────────────────────────────────────────────────────────
    const mergedIds = reciprocalRankFusion(graphChunkIds, vectorChunkIds);
    console.log(`[${this.name}] RRF merged to ${mergedIds.length} unique chunks`);

    if (mergedIds.length === 0) {
      console.warn(`[${this.name}] no chunks found — returning empty context`);

      const emptyState = new WorkbenchStateBuilder()
        .withContext('')
        .withSourceChunkIds([])
        .build();

      const noChunksMessage = new AIMessage({
        content: 'No relevant content chunks found for the requested concepts. The generated item will rely on general knowledge.',
      });

      return {
        ...emptyState,
        messages: [noChunksMessage],
      } as Partial<WorkbenchState>;
    }

    // ── 4. Fetch full chunk content from Supabase ──────────────────────────────
    const chunks = await this.chunkRepo.findByIds(mergedIds);
    const rawContext = chunks
      .map((chunk) => chunk.content ?? '')
      .filter((content) => content.length > 0)
      .join('\n\n---\n\n');

    console.log(`[${this.name}] raw context: ${rawContext.length} chars from ${chunks.length} chunks`);

    // ── 5. Refine with Haiku if over budget ─────────────────────────────────────
    let refinedContext: string;

    if (rawContext.length <= CONTEXT_CHAR_BUDGET) {
      // Under budget — no need to call Haiku
      refinedContext = rawContext;
      console.log(`[${this.name}] context within budget, skipping Haiku refinement`);
    } else {
      // Over budget — use Haiku to trim
      refinedContext = await this.refineContextWithHaiku(
        rawContext,
        state.targetConcepts,
      );
      console.log(`[${this.name}] Haiku refined context: ${refinedContext.length} chars`);
    }

    // ── 6. Build state update ──────────────────────────────────────────────────
    // Store source chunk IDs so graph_writer can create GENERATED_FROM edges
    const usedChunkIds = chunks.map((chunk) => chunk.id);

    const stateUpdate = new WorkbenchStateBuilder()
      .withContext(refinedContext)
      .withSourceChunkIds(usedChunkIds)
      .build();

    // ── 7. TEXT_MESSAGE for CopilotKit UI ──────────────────────────────────────
    const textMessage = new AIMessage({
      content: `Found ${chunks.length} relevant chunks from your course materials. Context compiled and ready for generation.`,
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  /**
   * Graph RAG: find ContentChunk UUIDs via Neo4j SubConcept graph traversal.
   * For each target concept, find chunks that TEACH matching SubConcepts.
   */
  private async graphRagSearch(targetConcepts: string[]): Promise<string[]> {
    const allChunkIds: string[] = [];

    for (const concept of targetConcepts) {
      try {
        const chunkIds = await this.graphRepo.findChunkIdsBySubConcept(concept);
        allChunkIds.push(...chunkIds);
      } catch (err) {
        console.warn(`[${this.name}] graph RAG failed for concept "${concept}":`, err);
        // Continue with other concepts — don't block on one failure
      }
    }

    // Deduplicate while preserving order
    return [...new Set(allChunkIds)];
  }

  /**
   * Vector RAG: embed userMessage and do pgvector cosine similarity search.
   * Uses the search provider configured via EMBEDDING_SEARCH_PROVIDER.
   */
  private async vectorRagSearch(courseId: string, userMessage: string): Promise<string[]> {
    try {
      // Get the search embedding provider (Voyage or OpenAI, config-controlled)
      const searchProvider = EmbeddingProviderFactory.getSearchProvider(config);

      // Embed the user's message
      const embeddings = await searchProvider.embed([userMessage]);
      const queryEmbedding = embeddings[0];

      if (!queryEmbedding) {
        console.warn(`[${this.name}] embedding returned empty for user message`);
        return [];
      }

      // pgvector cosine similarity search
      return await this.chunkRepo.vectorSearchChunks(courseId, queryEmbedding, 10);
    } catch (err) {
      console.warn(`[${this.name}] vector RAG search failed:`, err);
      // Don't block pipeline on embedding/vector search failure
      return [];
    }
  }

  /**
   * Use Claude Haiku to refine raw context to the 4,000-token budget.
   * Haiku trims redundancy and keeps clinically actionable content.
   */
  private async refineContextWithHaiku(
    rawContext: string,
    targetConcepts: string[],
  ): Promise<string> {
    const anthropic = AnthropicClient.getInstance();
    const systemPrompt = loadPrompt('context-refiner-system');

    const userPrompt = [
      `Target concepts: ${targetConcepts.join(', ')}`,
      '',
      `Token budget: ${CONTEXT_TOKEN_BUDGET} tokens (approximately ${CONTEXT_CHAR_BUDGET} characters)`,
      '',
      '## Raw Content Chunks',
      '',
      rawContext,
    ].join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: CONTEXT_TOKEN_BUDGET,
    });

    // Extract text from the response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.warn(`[${this.name}] Haiku returned no text content, using truncated raw context`);
      return rawContext.slice(0, CONTEXT_CHAR_BUDGET);
    }

    return textBlock.text;
  }
}
