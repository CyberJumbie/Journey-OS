/**
 * InitNode — first node in the generation pipeline.
 *
 * Responsibilities (NO AI calls — pure data loading):
 * 1. Load course from Neo4j by courseId
 * 2. Query existing SubConcepts for the course
 * 3. Parse userMessage to extract target concepts (keyword match)
 * 4. Set pipelineStatus to 'running'
 * 5. Create generation_logs row in Supabase (status: 'running')
 * 6. Emit TEXT_MESSAGE: "Starting generation for [course name]..."
 * 7. Return updated state via WorkbenchStateBuilder
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import { GraphRepository } from '../../repositories/graph.repository';
import { GenerationLogRepository } from '../../repositories/generation-log.repository';

export class InitNode implements IPipelineNode {
  readonly name = 'init';

  private readonly graphRepo: GraphRepository;
  private readonly generationLogRepo: GenerationLogRepository;

  constructor() {
    this.graphRepo = new GraphRepository();
    this.generationLogRepo = new GenerationLogRepository();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] loading course and subconcepts for courseId=${state.courseId}`);

    // 1. Load course from Neo4j
    const course = await this.graphRepo.findCourseByUuid(state.courseId);
    if (!course) {
      throw new Error(`Course not found in Neo4j: ${state.courseId}`);
    }

    // 2. Query existing SubConcepts for this course
    const knownSubConcepts = await this.graphRepo.getSubConceptsForCourse(state.courseId);
    console.log(`[${this.name}] found ${knownSubConcepts.length} subconcepts for course ${course.code}`);

    // 3. Parse userMessage to extract target concepts via keyword matching
    const targetConcepts = this.extractTargetConcepts(state.userMessage, knownSubConcepts);
    console.log(`[${this.name}] extracted ${targetConcepts.length} target concepts: ${targetConcepts.join(', ')}`);

    // 4. Create generation_logs row in Supabase (status: 'running')
    const generationLog = await this.generationLogRepo.create({
      course_id: state.courseId,
      mode: state.mode,
      input_message: state.userMessage,
    });

    console.log(`[${this.name}] created generation log: ${generationLog.id}`);

    // 5. Build state update using the Builder pattern
    const courseName = course.name || course.code;
    const stateUpdate = new WorkbenchStateBuilder()
      .withPipelineStatus('running')
      .withGenerationLogId(generationLog.id)
      .withTargetConcepts(targetConcepts)
      .build();

    // 6. Emit TEXT_MESSAGE via messages channel for CopilotKit
    const textMessage = new AIMessage({
      content: `Starting generation for ${courseName}...`,
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  /**
   * Extract target concepts from the user's natural language message
   * by matching against known SubConcepts for the course.
   *
   * Uses case-insensitive substring matching. If no matches found,
   * returns the raw user message words as fallback concepts so the
   * context_compiler can do vector search.
   */
  private extractTargetConcepts(
    userMessage: string,
    knownSubConcepts: string[],
  ): string[] {
    const messageLower = userMessage.toLowerCase();

    // Match known subconcepts whose name appears in the user message
    const matched = knownSubConcepts.filter((concept) =>
      messageLower.includes(concept.toLowerCase()),
    );

    if (matched.length > 0) {
      return matched;
    }

    // Fallback: extract meaningful words (>3 chars) from the message
    // These will be used by context_compiler for vector search
    const stopWords = new Set([
      'about', 'generate', 'question', 'create', 'make', 'write',
      'item', 'assessment', 'test', 'quiz', 'exam', 'from',
      'with', 'that', 'this', 'the', 'for', 'and', 'but',
      'not', 'are', 'was', 'were', 'been', 'being', 'have',
      'has', 'had', 'having', 'does', 'did', 'will', 'would',
      'could', 'should', 'shall', 'may', 'might', 'must',
      'need', 'please', 'want', 'like', 'help', 'can',
    ]);

    const words = userMessage
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ''))
      .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));

    return words.length > 0 ? words : [userMessage.trim()];
  }
}
