import Papa from "papaparse";
import type {
  IParser,
  ImportFormat,
  ParseResult,
  ParserOptions,
  ParsedQuestion,
  ParsedQuestionOption,
  ParseErrorDetail,
  CsvColumnMapping,
} from "@journey-os/types";

const DEFAULT_MAPPING: Required<CsvColumnMapping> = {
  stem: "stem",
  vignette: "vignette",
  optionA: "optionA",
  optionB: "optionB",
  optionC: "optionC",
  optionD: "optionD",
  optionE: "optionE",
  correctAnswer: "correctAnswer",
  bloomLevel: "bloomLevel",
  difficulty: "difficulty",
  topic: "topic",
  explanation: "explanation",
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
const OPTION_KEYS = [
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
] as const;

export class CsvParser implements IParser {
  readonly format: ImportFormat = "csv";

  canParse(_buffer: Uint8Array, filename: string): boolean {
    return filename.toLowerCase().endsWith(".csv");
  }

  async parse(
    buffer: Uint8Array,
    filename: string,
    options: ParserOptions,
  ): Promise<ParseResult> {
    const start = Date.now();
    const csvString = new TextDecoder().decode(buffer);
    const mapping = { ...DEFAULT_MAPPING, ...options.columnMapping };

    const parsed = Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    const questions: ParsedQuestion[] = [];
    const errors: ParseErrorDetail[] = [];
    const mappedKeys = new Set(Object.values(mapping));

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i]!;
      const rowIndex = i + 1;
      const rowErrors: ParseErrorDetail[] = [];

      const stem = (row[mapping.stem] ?? "").trim();
      if (!stem) {
        rowErrors.push({
          index: rowIndex,
          line: rowIndex + 1,
          message: "Missing question stem",
          severity: "error",
          field: "stem",
        });
      }

      const optionTexts: string[] = [];
      for (const key of OPTION_KEYS) {
        const colName = mapping[key];
        if (colName) {
          optionTexts.push((row[colName] ?? "").trim());
        }
      }

      const nonEmptyOptions = optionTexts.filter((t) => t.length > 0);
      if (nonEmptyOptions.length < 2) {
        rowErrors.push({
          index: rowIndex,
          line: rowIndex + 1,
          message: `Only ${nonEmptyOptions.length} option(s) provided; at least 2 required`,
          severity: "error",
          field: "options",
        });
      }

      const correctRaw = (row[mapping.correctAnswer] ?? "")
        .trim()
        .toUpperCase();
      if (!correctRaw) {
        rowErrors.push({
          index: rowIndex,
          line: rowIndex + 1,
          message: "Missing correct answer",
          severity: "error",
          field: "correctAnswer",
        });
      }

      if (rowErrors.some((e) => e.severity === "error")) {
        errors.push(...rowErrors);
        if (options.strictMode) continue;
        if (!stem) continue;
      }

      const questionOptions: ParsedQuestionOption[] = [];
      for (let j = 0; j < optionTexts.length; j++) {
        const text = optionTexts[j]!;
        if (!text) continue;
        const letter = OPTION_LETTERS[j]!;
        questionOptions.push({
          letter,
          text,
          correct: letter === correctRaw,
        });
      }

      const rawMetadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (!mappedKeys.has(key)) {
          rawMetadata[key] = value;
        }
      }

      const bloomRaw = row[mapping.bloomLevel] ?? "";
      const diffRaw = row[mapping.difficulty] ?? "";

      questions.push({
        sourceIndex: rowIndex,
        sourceLocation: `row ${rowIndex + 1}`,
        vignette: (row[mapping.vignette] ?? "").trim(),
        stem,
        options: questionOptions,
        correctAnswer: correctRaw,
        bloomLevel: bloomRaw ? parseInt(bloomRaw, 10) || null : null,
        difficulty: diffRaw ? parseFloat(diffRaw) || null : null,
        topic: (row[mapping.topic] ?? "").trim() || null,
        explanation: (row[mapping.explanation] ?? "").trim() || null,
        rawMetadata,
      });
    }

    return {
      questions,
      errors,
      totalFound: parsed.data.length,
      successCount: questions.length,
      errorCount: parsed.data.length - questions.length,
      format: "csv",
      filename,
      durationMs: Date.now() - start,
    };
  }
}
