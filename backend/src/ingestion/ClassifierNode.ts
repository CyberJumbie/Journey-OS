import { readFileSync } from 'fs';
import { resolve } from 'path';
import type Anthropic from '@anthropic-ai/sdk';
import AnthropicClient from '../lib/AnthropicClient';
import type { ContentChunkRow } from '@journey-os/shared-types';

/**
 * ClassifierNode — Stage 1 of concept extraction pipeline.
 *
 * Classifies each chunk as academic, noise, or borderline using Claude Haiku.
 * Only academic chunks proceed to Stage 2 (ConceptExtractorNode).
 * Cost: ~$0.002 per syllabus.
 *
 * RULE: Classifier must run before concept_extractor. Never skip.
 */

export interface ClassificationResult {
  type: 'academic' | 'noise' | 'borderline';
  confidence: number;
}

export interface ClassifiedChunks {
  academic: ContentChunkRow[];
  noise: ContentChunkRow[];
  borderline: ContentChunkRow[];
  noise_ratio: number;
}

const SYSTEM_PROMPT = readFileSync(
  resolve(__dirname, '../pipeline/prompts/classifier-system.txt'),
  'utf-8',
);

export class ClassifierNode {
  private readonly client: Anthropic;

  constructor() {
    this.client = AnthropicClient.getInstance();
  }

  /**
   * Classify all chunks and return them grouped by type.
   */
  async classify(chunks: ContentChunkRow[]): Promise<ClassifiedChunks> {
    const academic: ContentChunkRow[] = [];
    const noise: ContentChunkRow[] = [];
    const borderline: ContentChunkRow[] = [];

    for (const chunk of chunks) {
      const result = await this.classifyOne(chunk.content ?? '');

      switch (result.type) {
        case 'academic':
          academic.push(chunk);
          break;
        case 'noise':
          noise.push(chunk);
          break;
        case 'borderline':
          // Treat borderline as academic (conservative — don't lose content)
          academic.push(chunk);
          borderline.push(chunk);
          break;
      }
    }

    const noiseRatio = chunks.length > 0 ? noise.length / chunks.length : 0;

    if (noiseRatio > 0.4) {
      console.warn(
        `[ClassifierNode] High noise ratio: ${(noiseRatio * 100).toFixed(1)}% ` +
          `(${noise.length}/${chunks.length} chunks classified as noise)`,
      );
    }

    console.log(
      `[ClassifierNode] Classified ${chunks.length} chunks: ` +
        `${academic.length} academic, ${noise.length} noise, ${borderline.length} borderline`,
    );

    return { academic, noise, borderline, noise_ratio: noiseRatio };
  }

  private async classifyOne(content: string): Promise<ClassificationResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse JSON response
      const parsed = JSON.parse(text) as ClassificationResult;

      // Validate
      if (!['academic', 'noise', 'borderline'].includes(parsed.type)) {
        return { type: 'academic', confidence: 0.5 }; // Default to academic on parse error
      }

      return parsed;
    } catch (err) {
      console.error('[ClassifierNode] Classification failed, defaulting to academic:', err);
      return { type: 'academic', confidence: 0.0 };
    }
  }
}
