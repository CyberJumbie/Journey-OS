/**
 * Compute Levenshtein distance between two strings.
 * Used for auto-mapping source column headers to target fields.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= aLen; i++) matrix[i] = [i];
  for (let j = 0; j <= bLen; j++) matrix[0]![j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[aLen]![bLen]!;
}

/**
 * Calculate similarity score (0.0-1.0) between two strings.
 * 1.0 = exact match, 0.0 = completely different.
 */
export function stringSimilarity(a: string, b: string): number {
  const normalizedA = a.toLowerCase().replace(/[_\s-]/g, "");
  const normalizedB = b.toLowerCase().replace(/[_\s-]/g, "");
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshteinDistance(normalizedA, normalizedB) / maxLen;
}

/** Known aliases for target fields to improve auto-mapping accuracy */
export const FIELD_ALIASES: Record<string, readonly string[]> = {
  stem: ["question", "question text", "item stem", "prompt", "q", "item"],
  vignette: ["lead in", "clinical scenario", "scenario", "case", "lead-in"],
  answer_choice_a: ["option a", "choice a", "a", "answer a", "optiona"],
  answer_choice_b: ["option b", "choice b", "b", "answer b", "optionb"],
  answer_choice_c: ["option c", "choice c", "c", "answer c", "optionc"],
  answer_choice_d: ["option d", "choice d", "d", "answer d", "optiond"],
  answer_choice_e: ["option e", "choice e", "e", "answer e", "optione"],
  correct_answer: ["answer", "correct", "key", "answer key", "correctanswer"],
  rationale: ["explanation", "feedback", "rationale", "reasoning"],
  difficulty: ["difficulty", "difficulty level", "diff"],
  tags: ["tag", "tags", "category", "categories", "keywords"],
  course: ["course", "course name", "course id", "subject"],
  bloom_level: ["bloom", "bloom level", "cognitive level", "blooms"],
  topic: ["topic", "subject", "domain", "area"],
};
