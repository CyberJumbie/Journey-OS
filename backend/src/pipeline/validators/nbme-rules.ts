/**
 * NBME Validation Rules — 10 pure-function checks for generated assessment items.
 *
 * Each rule receives a GeneratedQuestion and returns a ValidationResult.
 * All are warnings in Phase 1 (never block generation).
 *
 * Exported individually for testability.
 */

import type { GeneratedOption, ValidationResult } from '@journey-os/shared-types';

// ── Input Shape ──────────────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  vignette: string;
  stem: string;
  options: GeneratedOption[];
}

// ── Rule Function Type ───────────────────────────────────────────────────────────

export type NbmeRule = (item: GeneratedQuestion) => ValidationResult;

// ── Helper Functions ─────────────────────────────────────────────────────────────

/** Count words by splitting on whitespace. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Check if the max/min word-count ratio among options exceeds 2x.
 * Returns true if options have similar length (pass), false if too dissimilar.
 */
export function checkSimilarLength(options: GeneratedOption[]): boolean {
  if (options.length === 0) return true;

  const lengths = options.map((o) => wordCount(o.text));
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);

  // Avoid division by zero — a 0-word option is already a problem
  if (min === 0) return false;

  return max / min <= 2;
}

/**
 * Check if any option text contains absolute terms.
 * Focuses on "always" and "never" as the primary offenders.
 * Returns true if absolutes are found (fail condition).
 */
export function hasAbsoluteTerms(options: GeneratedOption[]): boolean {
  const absolutePattern = /\b(always|never)\b/i;
  return options.some((o) => absolutePattern.test(o.text));
}

/**
 * Check if any option contains "all of the above" / "none of the above" variants.
 * Returns true if such phrases are found (fail condition).
 */
export function hasAllAbove(options: GeneratedOption[]): boolean {
  const pattern = /\b(all|none)\s+of\s+the\s+above\b|\b(all|none)\s+of\s+these\b/i;
  return options.some((o) => pattern.test(o.text));
}

/**
 * Simple grammatical cue detection.
 * Checks if the stem ends with an indefinite article ("a" or "an") and only
 * the correct answer grammatically matches the article.
 * Returns true if a grammatical cue is detected (fail condition).
 */
export function hasGrammaticalCue(stem: string, options: GeneratedOption[]): boolean {
  const trimmedStem = stem.trim().replace(/\?$/, '').trim();
  const lastWord = trimmedStem.split(/\s+/).pop()?.toLowerCase() ?? '';

  if (lastWord !== 'a' && lastWord !== 'an') return false;

  const vowelStart = /^[aeiou]/i;
  const correct = options.filter((o) => o.is_correct);
  const incorrect = options.filter((o) => !o.is_correct);

  if (correct.length !== 1) return false;

  const correctStartsVowel = vowelStart.test(correct[0].text.trim());

  if (lastWord === 'an') {
    // "an" — correct starts with vowel, all distractors start with consonant
    if (correctStartsVowel && incorrect.every((o) => !vowelStart.test(o.text.trim()))) {
      return true;
    }
  } else {
    // "a" — correct starts with consonant, all distractors start with vowel
    if (!correctStartsVowel && incorrect.every((o) => vowelStart.test(o.text.trim()))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if numeric options are in ascending order.
 * For non-numeric options, this check passes automatically.
 * Returns true if options are properly ordered (pass condition).
 */
export function areOptionsOrdered(options: GeneratedOption[]): boolean {
  if (options.length === 0) return true;

  // Extract leading numbers from option texts
  const numbers = options.map((o) => {
    const match = o.text.trim().match(/^[\d,.]+/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  });

  // Only enforce ordering if ALL options start with numbers
  if (numbers.some((n) => n === null || isNaN(n))) return true;

  const validNumbers = numbers as number[];
  for (let i = 1; i < validNumbers.length; i++) {
    if (validNumbers[i] < validNumbers[i - 1]) return false;
  }

  return true;
}

/**
 * Check if unusual words (>5 chars) from the stem appear in the correct answer
 * but not in any distractors. This can cue test-wise students.
 * Returns true if stem cueing is detected (fail condition).
 */
export function hasStemCueing(stem: string, options: GeneratedOption[]): boolean {
  const correct = options.find((o) => o.is_correct);
  if (!correct) return false;

  const distractors = options.filter((o) => !o.is_correct);

  // Extract words >5 chars from stem (case-insensitive), excluding common words
  const commonWords = new Set([
    'which', 'would', 'should', 'could', 'about', 'their', 'there',
    'these', 'those', 'where', 'after', 'before', 'during', 'between',
    'following', 'patient', 'likely', 'finding', 'result', 'treatment',
    'diagnosis', 'condition', 'history', 'examination', 'physical',
    'laboratory', 'clinical', 'present', 'initial', 'appropriate',
  ]);

  const stemWords = stem
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 5 && !commonWords.has(w));

  if (stemWords.length === 0) return false;

  const correctText = correct.text.toLowerCase();
  const distractorTexts = distractors.map((d) => d.text.toLowerCase());

  // A word cues if it appears in the correct answer but in none of the distractors
  return stemWords.some((word) =>
    correctText.includes(word) &&
    distractorTexts.every((dt) => !dt.includes(word)),
  );
}

// ── The 10 Rules ─────────────────────────────────────────────────────────────────

export const vignettePresent: NbmeRule = (item) => ({
  rule: 'vignette_present',
  passed: wordCount(item.vignette ?? '') > 50,
  message: 'Vignette must be >50 words',
});

export const stemQuestionMark: NbmeRule = (item) => ({
  rule: 'stem_question_mark',
  passed: item.stem?.trim().endsWith('?') ?? false,
  message: 'Stem must end with ?',
});

export const exactlyFiveOptions: NbmeRule = (item) => ({
  rule: 'exactly_five_options',
  passed: item.options?.length === 5,
  message: 'Exactly 5 options required',
});

export const oneCorrect: NbmeRule = (item) => ({
  rule: 'one_correct',
  passed: item.options?.filter((o) => o.is_correct).length === 1,
  message: 'Exactly 1 correct answer',
});

export const similarLength: NbmeRule = (item) => ({
  rule: 'similar_length',
  passed: checkSimilarLength(item.options ?? []),
  message: 'Option lengths must not differ by more than 2x',
});

export const noAbsolutes: NbmeRule = (item) => ({
  rule: 'no_absolutes',
  passed: !hasAbsoluteTerms(item.options ?? []),
  message: 'Options should not contain absolute terms (always, never)',
});

export const noAllAbove: NbmeRule = (item) => ({
  rule: 'no_all_above',
  passed: !hasAllAbove(item.options ?? []),
  message: 'Options must not include "all/none of the above"',
});

export const noGrammaticalCue: NbmeRule = (item) => ({
  rule: 'no_grammatical_cue',
  passed: !hasGrammaticalCue(item.stem ?? '', item.options ?? []),
  message: 'Correct answer must not be the only grammatically fitting option',
});

export const optionsOrdered: NbmeRule = (item) => ({
  rule: 'options_ordered',
  passed: areOptionsOrdered(item.options ?? []),
  message: 'Numeric options must be in ascending order',
});

export const noStemCueing: NbmeRule = (item) => ({
  rule: 'no_stem_cueing',
  passed: !hasStemCueing(item.stem ?? '', item.options ?? []),
  message: 'Stem should not cue the correct answer via repeated unusual words',
});

// ── Exported Rules Array ─────────────────────────────────────────────────────────

export const nbmeRules: NbmeRule[] = [
  vignettePresent,
  stemQuestionMark,
  exactlyFiveOptions,
  oneCorrect,
  similarLength,
  noAbsolutes,
  noAllAbove,
  noGrammaticalCue,
  optionsOrdered,
  noStemCueing,
];

/**
 * Run all 10 NBME rules against a generated question.
 * Returns an array of ValidationResult (one per rule).
 */
export function runAllRules(item: GeneratedQuestion): ValidationResult[] {
  return nbmeRules.map((rule) => rule(item));
}
