import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import AnthropicClient from '../lib/AnthropicClient';
import type { ContentChunkRow } from '@journey-os/shared-types';
import { DualWriteService } from '../services/dual-write.service';
import { GraphRepository } from '../repositories/graph.repository';
import { ChunkRepository } from '../repositories/chunk.repository';
import { ProficiencyVariableRepository } from '../repositories/proficiency-variable.repository';

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
  private readonly pvRepository: ProficiencyVariableRepository;

  constructor() {
    this.client = AnthropicClient.getInstance();
    this.dualWriteService = new DualWriteService();
    this.graphRepository = new GraphRepository();
    this.chunkRepository = new ChunkRepository();
    this.pvRepository = new ProficiencyVariableRepository();
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

      // Update sync_status via repository (Rule: no direct DB in services/nodes)
      await this.chunkRepository.updateSyncStatus(chunk.id, nodeId);
    } catch (err) {
      console.error(`[ConceptExtractorNode] Failed to sync ContentChunk ${chunk.id} to Neo4j:`, err);
    }
  }

  /**
   * Persist a SubConcept: MERGE node in Neo4j, create TEACHES edge.
   * SubConcepts are merged by name (not upload_id) so the same concept
   * from different syllabi maps to the same node.
   *
   * Also creates a ProficiencyVariable (1:1 with SubConcept) via DualWriteService
   * and links it to matching TaskShells via ASSESSED_BY.
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

      // Create ProficiencyVariable (1:1 with SubConcept) via DualWriteService
      await this.createProficiencyVariable(concept);
    } catch (err) {
      console.error(
        `[ConceptExtractorNode] Failed to persist concept "${concept.name}" ` +
          `for chunk ${chunk.id}:`,
        err,
      );
    }
  }

  /**
   * Create a ProficiencyVariable for a SubConcept using DualWriteService.
   * Supabase first (source of truth), then Neo4j (MERGE for idempotency).
   * After creation, links to matching TaskShells via ASSESSED_BY.
   * Bloom default: 3 if bloom_level_guess is unavailable.
   */
  private async createProficiencyVariable(concept: ExtractedConcept): Promise<void> {
    const pvUuid = randomUUID();
    const pvName = `pv_${concept.name}`;
    const bloomGuess = concept.bloom_level_guess ?? 3;

    try {
      await this.dualWriteService.dualWrite(
        // Step 1: Write Supabase (source of truth)
        async () => {
          const result = await this.pvRepository.upsertProficiencyVariable({
            id: pvUuid,
            name: pvName,
            sub_concept_id: concept.uuid,
          });
          return result;
        },
        // Step 2: Write Neo4j (MERGE — idempotent)
        async () => {
          const nodeId = await this.graphRepository.mergeProficiencyVariable(
            pvUuid,
            pvName,
            concept.uuid,
          );
          return nodeId;
        },
        'proficiency_variables',
      );

      // Step 3: Link to TaskShells (ASSESSED_BY with priority)
      await this.graphRepository.linkAssessedBy(pvUuid, bloomGuess);
    } catch (err) {
      // PV creation failure should not block concept extraction
      console.error(
        `[ConceptExtractorNode] Failed to create ProficiencyVariable for "${concept.name}":`,
        err,
      );
    }
  }
}
