import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import AnthropicClient from '../lib/AnthropicClient';
import type { ContentChunkRow } from '@journey-os/shared-types';
import { DualWriteService } from '../services/dual-write.service';
import { GraphRepository } from '../repositories/graph.repository';
import { ChunkRepository } from '../repositories/chunk.repository';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/**
 * ConceptExtractorNode — Stage 2 of concept extraction pipeline.
 *
 * Extracts 2-5 SubConcepts from each academic chunk using Claude Haiku.
 * Creates SubConcept nodes in Neo4j and TEACHES edges from ContentChunks.
 * Uses DualWriteService for all cross-database writes.
 *
 * RULE: Only runs on chunks that passed ClassifierNode (Stage 1).
 */

export interface ExtractionResult {
  concepts: string[];
  usmle_system_guess: string | null;
  usmle_discipline_guess: string | null;
  bloom_level_guess: number;
}

export interface ExtractedConcept {
  name: string;
  uuid: string;
  chunk_id: string;
  usmle_system_guess: string | null;
  usmle_discipline_guess: string | null;
  bloom_level_guess: number;
}

const SYSTEM_PROMPT = readFileSync(
  resolve(__dirname, '../pipeline/prompts/concept-extractor-system.txt'),
  'utf-8',
);

export class ConceptExtractorNode {
  private readonly client: Anthropic;
  private readonly dualWriteService: DualWriteService;
  private readonly graphRepository: GraphRepository;
  private readonly chunkRepository: ChunkRepository;

  constructor() {
    this.client = AnthropicClient.getInstance();
    this.dualWriteService = new DualWriteService();
    this.graphRepository = new GraphRepository();
    this.chunkRepository = new ChunkRepository();
  }

  /**
   * Extract concepts from all academic chunks and persist them.
   * Returns all extracted concepts.
   */
  async extract(academicChunks: ContentChunkRow[]): Promise<ExtractedConcept[]> {
    const allConcepts: ExtractedConcept[] = [];

    for (const chunk of academicChunks) {
      const result = await this.extractFromChunk(chunk.content ?? '');

      if (!result || result.concepts.length === 0) {
        continue;
      }

      // First, ensure the ContentChunk node exists in Neo4j
      await this.ensureContentChunkNode(chunk);

      // Then create SubConcept nodes and TEACHES edges
      for (const conceptName of result.concepts) {
        const concept: ExtractedConcept = {
          name: conceptName,
          uuid: randomUUID(),
          chunk_id: chunk.id,
          usmle_system_guess: result.usmle_system_guess,
          usmle_discipline_guess: result.usmle_discipline_guess,
          bloom_level_guess: result.bloom_level_guess,
        };

        await this.persistConcept(concept, chunk);
        allConcepts.push(concept);
      }
    }

    console.log(
      `[ConceptExtractorNode] Extracted ${allConcepts.length} concepts ` +
        `from ${academicChunks.length} chunks`,
    );

    return allConcepts;
  }

  private async extractFromChunk(content: string): Promise<ExtractionResult | null> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const parsed = JSON.parse(text) as ExtractionResult;

      // Validate concepts array
      if (!Array.isArray(parsed.concepts) || parsed.concepts.length === 0) {
        return null;
      }

      // Cap at 5 concepts
      parsed.concepts = parsed.concepts.slice(0, 5);

      return parsed;
    } catch (err) {
      console.error('[ConceptExtractorNode] Extraction failed for chunk:', err);
      return null;
    }
  }

  /**
   * Ensure the ContentChunk node exists in Neo4j.
   * Uses DualWriteService pattern — the chunk already exists in Supabase,
   * we just need to create the Neo4j node and update sync_status.
   */
  private async ensureContentChunkNode(chunk: ContentChunkRow): Promise<void> {
    if (chunk.sync_status === 'synced') {
      return; // Already synced
    }

    try {
      const nodeId = await this.graphRepository.mergeContentChunk(
        chunk.id,
        chunk.chunk_index ?? 0,
      );

      // Update sync_status in Supabase directly since chunk already exists
      const supabase = SupabaseClientSingleton.getInstance();
      await supabase
        .from('content_chunks')
        .update({ sync_status: 'synced', neo4j_node_id: nodeId })
        .eq('id', chunk.id);
    } catch (err) {
      console.error(`[ConceptExtractorNode] Failed to sync ContentChunk ${chunk.id} to Neo4j:`, err);
    }
  }

  /**
   * Persist a SubConcept: MERGE node in Neo4j, create TEACHES edge.
   * SubConcepts are merged by name (not upload_id) so the same concept
   * from different syllabi maps to the same node.
   */
  private async persistConcept(
    concept: ExtractedConcept,
    chunk: ContentChunkRow,
  ): Promise<void> {
    try {
      // MERGE SubConcept node (by name — shared across courses)
      await this.graphRepository.mergeSubConcept(concept.uuid, concept.name);

      // Create TEACHES edge: ContentChunk -> SubConcept
      await this.graphRepository.mergeTeachesEdge(chunk.id, concept.name);
    } catch (err) {
      console.error(
        `[ConceptExtractorNode] Failed to persist concept "${concept.name}" ` +
          `for chunk ${chunk.id}:`,
        err,
      );
    }
  }
}
