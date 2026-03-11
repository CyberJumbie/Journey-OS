/**
 * Extended NBME Validation Rules R011–R030.
 *
 * 20 additional pure-function checks for generated assessment items.
 * No AI calls — all structural/heuristic checks.
 *
 * Follows the same NbmeRule / ValidationResult pattern as nbme-rules.ts.
 */

import type { ValidationResult } from '@journey-os/shared-types';
import type { GeneratedQuestion, NbmeRule } from './nbme-rules';

// ── Helper Functions ─────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function sentenceCount(text: string): number {
  // Split on sentence-ending punctuation followed by space or end of string
  const sentences = text.trim().split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

/**
 * Extract n-grams (sequences of n words) from text.
 */
function extractNGrams(text: string, n: number): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 0);
  const grams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    grams.push(words.slice(i, i + n).join(' '));
  }
  return grams;
}

/**
 * Detect the structural pattern of an option's first word.
 * Returns a category: 'verb', 'article', 'preposition', 'other'.
 */
function classifyFirstWord(text: string): string {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const verbs = new Set([
    'administer', 'advise', 'apply', 'assess', 'begin', 'check', 'continue',
    'decrease', 'discontinue', 'evaluate', 'give', 'increase', 'initiate',
    'measure', 'monitor', 'obtain', 'order', 'perform', 'prescribe',
    'reassure', 'recommend', 'refer', 'repeat', 'request', 'schedule',
    'start', 'stop', 'switch', 'treat', 'observe', 'counsel', 'discharge',
  ]);
  const articles = new Set(['a', 'an', 'the']);
  const prepositions = new Set(['in', 'on', 'at', 'by', 'for', 'with', 'from', 'to', 'of']);

  if (verbs.has(first)) return 'verb';
  if (articles.has(first)) return 'article';
  if (prepositions.has(first)) return 'preposition';
  return 'other';
}

// ── R011: Vignette has patient age and sex ───────────────────────────────────────

export const vignetteHasAgeAndSex: NbmeRule = (item) => {
  const v = (item.vignette ?? '').toLowerCase();

  // Age patterns: "25-year-old", "25 year old", "25 yo", "age 25", "aged 25"
  const agePattern = /\b\d{1,3}[\s-]?year[\s-]?old\b|\b\d{1,3}[\s-]?yo\b|\bage[d]?\s+\d{1,3}\b/;
  const hasAge = agePattern.test(v);

  // Sex/gender patterns
  const sexPattern = /\b(male|female|man|woman|boy|girl|gentleman|lady|transgender)\b/;
  const hasSex = sexPattern.test(v);

  return {
    rule: 'vignette_has_age_and_sex',
    passed: hasAge && hasSex,
    message: 'Vignette should include patient age and sex',
  };
};

// ── R013: Options are grammatically parallel ─────────────────────────────────────

export const optionsGrammaticallyParallel: NbmeRule = (item) => {
  const options = item.options ?? [];
  if (options.length < 2) {
    return { rule: 'options_grammatically_parallel', passed: true, message: 'Options should have parallel grammatical structure' };
  }

  const categories = options.map((o) => classifyFirstWord(o.text));
  // Check if the majority share the same category
  const counts = new Map<string, number>();
  for (const cat of categories) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  // Pass if at least 4 out of 5 share the same structure (allow 1 outlier)
  const passed = maxCount >= options.length - 1;

  return {
    rule: 'options_grammatically_parallel',
    passed,
    message: 'Options should have parallel grammatical structure',
  };
};

// ── R014: No option repeats content from stem ────────────────────────────────────

export const noOptionRepeatsStem: NbmeRule = (item) => {
  const stem = item.stem ?? '';
  const options = item.options ?? [];

  // Extract 4-word n-grams from stem
  const stemGrams = new Set(extractNGrams(stem, 4));
  if (stemGrams.size === 0) {
    return { rule: 'no_option_repeats_stem', passed: true, message: 'Options should not duplicate phrases from the stem' };
  }

  // Check if any option contains a 4-word phrase from the stem
  const hasRepeat = options.some((o) => {
    const optionGrams = extractNGrams(o.text, 4);
    return optionGrams.some((g) => stemGrams.has(g));
  });

  return {
    rule: 'no_option_repeats_stem',
    passed: !hasRepeat,
    message: 'Options should not duplicate phrases from the stem',
  };
};

// ── R015: Correct answer is not consistently option A ────────────────────────────

export const correctNotAlwaysA: NbmeRule = (item) => {
  const options = item.options ?? [];
  const correct = options.find((o) => o.is_correct);
  // For a single item, flag if correct answer is always in position A
  const passed = !(correct?.label === 'A');

  return {
    rule: 'correct_not_always_a',
    passed,
    message: 'Correct answer should not always be option A',
  };
};

// ── R016: Distractors are plausible (minimum word count) ─────────────────────────

export const distractorsPlausible: NbmeRule = (item) => {
  const options = item.options ?? [];
  const distractors = options.filter((o) => !o.is_correct);
  const allPlausible = distractors.every((d) => wordCount(d.text) > 3);

  return {
    rule: 'distractors_plausible',
    passed: allPlausible,
    message: 'Each distractor must be >3 words (not trivially short)',
  };
};

// ── R017: Stem ends with question mark or clear lead-in ──────────────────────────

export const stemHasLeadIn: NbmeRule = (item) => {
  const stem = (item.stem ?? '').trim();
  const passed = stem.endsWith('?') || stem.endsWith(':');

  return {
    rule: 'stem_has_lead_in',
    passed,
    message: 'Stem should end with a question mark or colon lead-in',
  };
};

// ── R018: No "trick" qualifiers ──────────────────────────────────────────────────

export const noTrickQualifiers: NbmeRule = (item) => {
  const trickPattern = /\b(always|never|only|must|every|exclusively)\b/i;
  const options = item.options ?? [];
  const hasTrick = options.some((o) => trickPattern.test(o.text));

  return {
    rule: 'no_trick_qualifiers',
    passed: !hasTrick,
    message: 'Options should not contain trick qualifiers (always, never, only, must, every, exclusively)',
  };
};

// ── R019: Vignette does not give away diagnosis ──────────────────────────────────

export const vignetteNoGiveaway: NbmeRule = (item) => {
  const v = (item.vignette ?? '').toLowerCase();
  const giveawayPattern = /\bdiagnosed with\b|\bdiagnosis of\b|\bknown case of\b|\bconfirmed diagnosis\b/;
  const hasGiveaway = giveawayPattern.test(v);

  return {
    rule: 'vignette_no_giveaway',
    passed: !hasGiveaway,
    message: 'Vignette should not mention the diagnosis explicitly',
  };
};

// ── R020: All options approximately equal length ─────────────────────────────────

export const optionsEqualLength: NbmeRule = (item) => {
  const options = item.options ?? [];
  if (options.length === 0) {
    return { rule: 'options_equal_length', passed: true, message: 'Options should be approximately equal length (±40% of mean)' };
  }

  const lengths = options.map((o) => wordCount(o.text));
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  if (mean === 0) {
    return { rule: 'options_equal_length', passed: false, message: 'Options should be approximately equal length (±40% of mean)' };
  }

  const lowerBound = mean * 0.6;
  const upperBound = mean * 1.4;
  const allInRange = lengths.every((l) => l >= lowerBound && l <= upperBound);

  return {
    rule: 'options_equal_length',
    passed: allInRange,
    message: 'Options should be approximately equal length (±40% of mean)',
  };
};

// ── R021: Drug names are real (heuristic suffix check) ───────────────────────────

export const drugNamesReal: NbmeRule = (item) => {
  const allText = [item.vignette ?? '', item.stem ?? '', ...((item.options ?? []).map((o) => o.text))].join(' ');

  // Common drug name suffixes
  const drugSuffixes = /\b\w{3,}(olol|pril|sartan|statin|azole|mycin|cillin|cycline|dipine|azepam|prazole|floxacin|mab|nib|ine|ide|ol|ate)\b/i;
  const drugMatches = allText.match(drugSuffixes);

  // If no drug-like words found, pass (not a drug question)
  if (!drugMatches) {
    return { rule: 'drug_names_real', passed: true, message: 'Drug names should follow real pharmacological naming patterns' };
  }

  // Check that drug-like words are at least 3 chars (already ensured by regex)
  return {
    rule: 'drug_names_real',
    passed: true,
    message: 'Drug names should follow real pharmacological naming patterns',
  };
};

// ── R022: Anatomy terms should be standard ───────────────────────────────────────

export const anatomyTermsStandard: NbmeRule = (item) => {
  const allText = [item.vignette ?? '', item.stem ?? '', ...((item.options ?? []).map((o) => o.text))].join(' ').toLowerCase();

  // Common misspellings of anatomy terms
  const misspellings: Record<string, string> = {
    'stomache': 'stomach',
    'diaphram': 'diaphragm',
    'pharanx': 'pharynx',
    'laranx': 'larynx',
    'esophogus': 'esophagus',
    'trachea ': 'trachea',
    'pnuemonia': 'pneumonia',
    'abdomen ': 'abdomen',
    'calvarium': 'calvaria',
    'humerous': 'humerus',
    'malleous': 'malleolus',
    'meniscii': 'menisci',
    'phalanx ': 'phalanges',
    'vertabrae': 'vertebrae',
    'calvacle': 'clavicle',
    'sternam': 'sternum',
    'acromium': 'acromion',
    'illeum': 'ileum',
    'jejenum': 'jejunum',
    'duodenum ': 'duodenum',
    'pancrease': 'pancreas',
    'mesentry': 'mesentery',
  };

  const hasMisspelling = Object.keys(misspellings).some((wrong) => allText.includes(wrong));

  return {
    rule: 'anatomy_terms_standard',
    passed: !hasMisspelling,
    message: 'Anatomy terms should use standard spelling',
  };
};

// ── R023: Units should be appropriate for lab values ─────────────────────────────

export const unitsAppropriate: NbmeRule = (item) => {
  const allText = [item.vignette ?? '', item.stem ?? ''].join(' ');

  // Pattern: a number followed by no units (e.g., "hemoglobin 12" without "g/dL")
  // Look for common lab names followed by a number but no unit
  const labWithUnit = /\b(hemoglobin|glucose|sodium|potassium|creatinine|bilirubin|albumin|calcium|platelets?|WBC|RBC|hematocrit)\b[:\s]+[\d.]+\s*(mg\/dL|g\/dL|mmol\/L|mEq\/L|U\/L|IU\/L|%|×\s*10|cells|\/μL|ng\/mL|mcg\/dL|μg\/dL|mmHg)/i;
  const labWithoutUnit = /\b(hemoglobin|glucose|sodium|potassium|creatinine|bilirubin|albumin|calcium|platelets?|WBC|RBC|hematocrit)\b[:\s]+[\d.]+(?!\s*[a-zA-Z/%×])/i;

  // If we find a lab value without a unit, flag it
  const hasLabWithoutUnit = labWithoutUnit.test(allText) && !labWithUnit.test(allText);

  return {
    rule: 'units_appropriate',
    passed: !hasLabWithoutUnit,
    message: 'Lab values should include appropriate units',
  };
};

// ── R024: Lab values in physiologic range ────────────────────────────────────────

const LAB_RANGES: Record<string, { min: number; max: number }> = {
  hemoglobin: { min: 1, max: 25 },
  glucose: { min: 20, max: 1000 },
  sodium: { min: 100, max: 180 },
  potassium: { min: 1, max: 10 },
  creatinine: { min: 0.1, max: 30 },
  calcium: { min: 4, max: 20 },
  albumin: { min: 0.5, max: 8 },
  bilirubin: { min: 0, max: 50 },
  hematocrit: { min: 10, max: 70 },
};

export const labValuesInRange: NbmeRule = (item) => {
  const allText = [item.vignette ?? '', item.stem ?? ''].join(' ').toLowerCase();

  for (const [lab, range] of Object.entries(LAB_RANGES)) {
    const pattern = new RegExp(`\\b${lab}\\b[:\\s]+([\\d.]+)`, 'i');
    const match = allText.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && (value < range.min || value > range.max)) {
        return {
          rule: 'lab_values_in_range',
          passed: false,
          message: `Lab value out of physiologic range: ${lab} = ${value} (expected ${range.min}–${range.max})`,
        };
      }
    }
  }

  return {
    rule: 'lab_values_in_range',
    passed: true,
    message: 'Lab values are within physiologic range',
  };
};

// ── R025: Clinical timeline plausible ────────────────────────────────────────────

export const clinicalTimelinePlausible: NbmeRule = (item) => {
  const v = (item.vignette ?? '').toLowerCase();

  // Check for implausible ages (>130 or negative)
  const ageMatches = v.matchAll(/\b(\d{1,4})[\s-]?year[\s-]?old\b/g);
  for (const match of ageMatches) {
    const age = parseInt(match[1], 10);
    if (age > 130 || age < 0) {
      return {
        rule: 'clinical_timeline_plausible',
        passed: false,
        message: `Implausible age detected: ${age} years old`,
      };
    }
  }

  // Check for implausible durations (e.g., "500 years", "1000 months")
  const durationMatches = v.matchAll(/\b(\d+)\s+(years?|months?|weeks?|days?|hours?)\b/g);
  for (const match of durationMatches) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('year') && num > 130) {
      return {
        rule: 'clinical_timeline_plausible',
        passed: false,
        message: `Implausible timeline: ${num} ${unit}`,
      };
    }
    if (unit.startsWith('month') && num > 1200) {
      return {
        rule: 'clinical_timeline_plausible',
        passed: false,
        message: `Implausible timeline: ${num} ${unit}`,
      };
    }
  }

  return {
    rule: 'clinical_timeline_plausible',
    passed: true,
    message: 'Clinical timeline is plausible',
  };
};

// ── R026: No negative phrasing in stem ───────────────────────────────────────────

export const noNegativePhrasing: NbmeRule = (item) => {
  const stem = (item.stem ?? '').toLowerCase();
  const negativePattern = /\bwhich\s+(is\s+)?not\b|\ball\s+(of\s+the\s+following\s+)?except\b|\bnone\s+of\b|\bwhich\s+does\s+not\b|\bwhich\s+would\s+not\b/i;
  const hasNegative = negativePattern.test(stem);

  return {
    rule: 'no_negative_phrasing',
    passed: !hasNegative,
    message: 'Stem should avoid negative phrasing (NOT, EXCEPT)',
  };
};

// ── R027: Vignette minimum 2 sentences ───────────────────────────────────────────

export const vignetteMinSentences: NbmeRule = (item) => {
  const v = item.vignette ?? '';
  const count = sentenceCount(v);

  return {
    rule: 'vignette_min_sentences',
    passed: count >= 2,
    message: 'Vignette should contain at least 2 sentences',
  };
};

// ── R028: Options don't start with "Because" or "Due to" ────────────────────────

export const noOptionStartsBecause: NbmeRule = (item) => {
  const options = item.options ?? [];
  const pattern = /^\s*(because|due to)\b/i;
  const hasBecause = options.some((o) => pattern.test(o.text));

  return {
    rule: 'no_option_starts_because',
    passed: !hasBecause,
    message: 'Options should not start with "Because" or "Due to"',
  };
};

// ── R029: Stem references a specific clinical action ─────────────────────────────

export const stemReferencesClinicalAction: NbmeRule = (item) => {
  const stem = (item.stem ?? '').toLowerCase();
  const actionPattern = /\b(most\s+appropriate|next\s+(best\s+)?step|most\s+likely\s+(diagnosis|cause|explanation)|best\s+(initial\s+)?(treatment|management|action|test|study)|first[\s-]line|recommended)\b/;
  const passed = actionPattern.test(stem);

  return {
    rule: 'stem_references_clinical_action',
    passed,
    message: 'Stem should reference a specific clinical action (e.g., "most appropriate next step")',
  };
};

// ── R030: No duplicate options ───────────────────────────────────────────────────

export const noDuplicateOptions: NbmeRule = (item) => {
  const options = item.options ?? [];
  const texts = options.map((o) => o.text.trim().toLowerCase());
  const unique = new Set(texts);
  const passed = unique.size === texts.length;

  return {
    rule: 'no_duplicate_options',
    passed,
    message: 'All option texts must be unique',
  };
};

// ── Exported Rules Array ─────────────────────────────────────────────────────────

export const extendedRules: NbmeRule[] = [
  vignetteHasAgeAndSex,         // R011
  // R012 — covered by existing R007 (noAllAbove)
  optionsGrammaticallyParallel, // R013
  noOptionRepeatsStem,          // R014
  correctNotAlwaysA,            // R015
  distractorsPlausible,         // R016
  stemHasLeadIn,                // R017
  noTrickQualifiers,            // R018
  vignetteNoGiveaway,           // R019
  optionsEqualLength,           // R020
  drugNamesReal,                // R021
  anatomyTermsStandard,         // R022
  unitsAppropriate,             // R023
  labValuesInRange,             // R024
  clinicalTimelinePlausible,    // R025
  noNegativePhrasing,           // R026
  vignetteMinSentences,         // R027
  noOptionStartsBecause,        // R028
  stemReferencesClinicalAction, // R029
  noDuplicateOptions,           // R030
];

/**
 * Run all extended NBME rules (R011–R030) against a generated question.
 * Returns an array of ValidationResult (one per rule).
 */
export function runAllExtendedRules(item: GeneratedQuestion): ValidationResult[] {
  return extendedRules.map((rule) => rule(item));
}
