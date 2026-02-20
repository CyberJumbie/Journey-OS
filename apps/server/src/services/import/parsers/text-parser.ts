import type {
  IParser,
  ImportFormat,
  ParseResult,
  ParserOptions,
  ParsedQuestion,
  ParsedQuestionOption,
  ParseErrorDetail,
} from "@journey-os/types";

/**
 * Regex patterns for plain-text question formats.
 *
 * Format 1 — Numbered with asterisk:
 *   1. Stem text here?
 *   A) Option A
 *   *B) Option B (correct)
 *
 * Format 2 — "Question N:" with [CORRECT]:
 *   Question 1:
 *   Stem text here?
 *   A. Option A [CORRECT]
 *   B. Option B
 */

// Split on question boundaries: "N." at line start or "Question N:"
const QUESTION_SPLIT = /(?=^\d+\.\s|^Question\s+\d+\s*:)/im;

// Match a question number prefix
const QUESTION_NUMBER = /^(?:Question\s+)?(\d+)[.:]\s*/i;

// Match option lines: optional asterisk, letter A-E, separator (./) or ), then text, optional [CORRECT]
const OPTION_LINE = /^([*]?)([A-E])[.)]\s*(.+?)(?:\s*\[CORRECT\])?\s*$/i;

// Detect [CORRECT] marker
const CORRECT_BRACKET = /\[CORRECT\]\s*$/i;

export class TextParser implements IParser {
  readonly format: ImportFormat = "text";

  canParse(_buffer: Uint8Array, filename: string): boolean {
    return filename.toLowerCase().endsWith(".txt");
  }

  async parse(
    buffer: Uint8Array,
    filename: string,
    _options: ParserOptions,
  ): Promise<ParseResult> {
    const start = Date.now();
    const content = new TextDecoder().decode(buffer);

    const blocks = content
      .split(QUESTION_SPLIT)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const questions: ParsedQuestion[] = [];
    const errors: ParseErrorDetail[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!;
      const blockIndex = i + 1;
      const lines = block.split("\n").map((l) => l.trim());

      // Extract question number if present
      const numberMatch = lines[0]?.match(QUESTION_NUMBER);
      let stemLines: string[] = [];
      let optionStartIdx = -1;

      // Find where options begin
      for (let j = 0; j < lines.length; j++) {
        if (OPTION_LINE.test(lines[j]!)) {
          optionStartIdx = j;
          break;
        }
      }

      if (optionStartIdx === -1) {
        errors.push({
          index: blockIndex,
          line: blockIndex,
          message: "No answer options found",
          severity: "error",
          field: "options",
        });
        continue;
      }

      // Everything before options is the stem
      stemLines = lines.slice(0, optionStartIdx);
      // Remove question number prefix from first line
      if (stemLines.length > 0 && numberMatch) {
        stemLines[0] = stemLines[0]!.replace(QUESTION_NUMBER, "").trim();
      }

      const stem = stemLines
        .filter((l) => l.length > 0)
        .join(" ")
        .trim();

      if (!stem) {
        errors.push({
          index: blockIndex,
          line: blockIndex,
          message: "Empty question stem",
          severity: "error",
          field: "stem",
        });
      }

      // Parse options
      const questionOptions: ParsedQuestionOption[] = [];
      let correctAnswer = "";

      for (let j = optionStartIdx; j < lines.length; j++) {
        const line = lines[j]!;
        const match = line.match(OPTION_LINE);
        if (!match) continue;

        const asterisk = match[1];
        const letter = match[2]!.toUpperCase();
        let text = match[3]!.trim();

        // Remove [CORRECT] from display text
        text = text.replace(CORRECT_BRACKET, "").trim();

        const isCorrect = asterisk === "*" || CORRECT_BRACKET.test(line);

        if (isCorrect) {
          correctAnswer = letter;
        }

        questionOptions.push({
          letter,
          text,
          correct: isCorrect,
        });
      }

      if (!correctAnswer) {
        errors.push({
          index: blockIndex,
          line: blockIndex,
          message: "No correct answer marked",
          severity: "warning",
          field: "correctAnswer",
        });
      }

      if (questionOptions.length < 4) {
        errors.push({
          index: blockIndex,
          line: blockIndex,
          message: `Only ${questionOptions.length} option(s) found; standard MCQ expects 4-5`,
          severity: "warning",
          field: "options",
        });
      }

      // Even with warnings, include the question
      questions.push({
        sourceIndex: blockIndex,
        sourceLocation: `block ${blockIndex}`,
        vignette: "",
        stem,
        options: questionOptions,
        correctAnswer,
        bloomLevel: null,
        difficulty: null,
        topic: null,
        explanation: null,
        rawMetadata: {},
      });
    }

    return {
      questions,
      errors,
      totalFound: blocks.length,
      successCount: questions.length,
      errorCount: blocks.length - questions.length,
      format: "text",
      filename,
      durationMs: Date.now() - start,
    };
  }
}
