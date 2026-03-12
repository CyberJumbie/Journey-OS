import { compiledGraph } from './graph';
import type { HumanMessage } from '@langchain/core/messages';

/**
 * Input parameters for a single item generation run.
 * Used by Inngest bulk-generation to invoke the pipeline programmatically.
 */
export interface SingleGenerationInput {
  courseId: string;
  topicId: string;
  userId: string;
}

/**
 * Result of a single generation run.
 * Contains the item ID written to Supabase by GraphWriterNode.
 */
export interface SingleGenerationResult {
  itemId: string;
  generationLogId: string;
}

/**
 * Runs the LangGraph generation pipeline for a single assessment item.
 *
 * Invokes the compiled graph with mode='single' and the given course/topic.
 * The pipeline runs through all 12 nodes (init → ... → review_router)
 * and returns the item ID and generation log ID.
 *
 * This is a lightweight wrapper around the existing compiled graph.
 * It does NOT stream — it runs to completion and returns the final state.
 */
export async function runSingleGeneration(
  input: SingleGenerationInput,
): Promise<SingleGenerationResult> {
  const { courseId, topicId } = input;

  // Build a minimal user message to feed into the pipeline
  const userMessage = `Generate a single-best-answer question for topic: ${topicId}`;

  // Invoke the compiled graph synchronously (no streaming needed for bulk)
  const finalState = await compiledGraph.invoke({
    mode: 'single' as const,
    courseId,
    userMessage,
    targetConcepts: [topicId],
    // Provide empty messages array as required by MessagesAnnotation
    messages: [
      {
        role: 'human',
        content: userMessage,
      } as unknown as HumanMessage,
    ],
  });

  const itemId = finalState.itemId as string;
  const generationLogId = finalState.generationLogId as string;

  if (!itemId) {
    throw new Error(
      `Pipeline completed but no itemId in final state for topic ${topicId}`,
    );
  }

  return { itemId, generationLogId };
}
