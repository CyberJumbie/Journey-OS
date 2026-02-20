import { describe, it, expect, beforeEach } from "vitest";
import { CsvParser } from "../csv-parser";
import type { ParserOptions } from "@journey-os/types";

const VALID_CSV = `stem,optionA,optionB,optionC,optionD,correctAnswer,topic,explanation
"A 45-year-old patient presents with chest pain radiating to the left arm. Which of the following is the most likely diagnosis?","Acute myocardial infarction","Pulmonary embolism","Pneumothorax","Costochondritis","A","Cardiovascular","MI typically presents with chest pain radiating to the left arm, jaw, or shoulder."
"Which enzyme is most specific for myocardial damage?","AST","ALT","Troponin I","LDH","C","Cardiovascular","Troponin I is the gold standard biomarker for myocardial injury."
"A patient with type 2 diabetes presents with polyuria and polydipsia. Their fasting glucose is 280 mg/dL. Which medication should be initiated first?","Metformin","Insulin glargine","Glipizide","Sitagliptin","A","Endocrine","Metformin is first-line therapy for type 2 diabetes per ADA guidelines."`;

const MALFORMED_CSV = `stem,optionA,optionB,optionC,optionD,correctAnswer
"Valid question stem here?","Option A","Option B","Option C","Option D","B"
"Missing options question",,,,"A"
"No correct answer specified","Option A","Option B","Option C","Option D",""
,"Option A","Option B","Option C","Option D","C"`;

const EMPTY_CSV = `stem,optionA,optionB,optionC,optionD,correctAnswer`;

const CUSTOM_HEADERS_CSV = `Question Text,Choice 1,Choice 2,Choice 3,Choice 4,Answer,Extra Col
"What is 2+2?","1","2","3","4","D","some extra data"`;

const DEFAULT_OPTIONS: ParserOptions = {
  maxFileSizeBytes: 10 * 1024 * 1024,
};

function toBuffer(str: string): Buffer {
  return Buffer.from(str, "utf-8");
}

describe("CsvParser", () => {
  let parser: CsvParser;

  beforeEach(() => {
    parser = new CsvParser();
  });

  it("should parse valid CSV with 3 questions and correct column mapping", async () => {
    const result = await parser.parse(
      toBuffer(VALID_CSV),
      "valid-questions.csv",
      DEFAULT_OPTIONS,
    );

    expect(result.questions).toHaveLength(3);
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);
    expect(result.format).toBe("csv");
    expect(result.filename).toBe("valid-questions.csv");

    const first = result.questions[0]!;
    expect(first.stem).toContain("45-year-old patient");
    expect(first.options).toHaveLength(4);
    expect(first.correctAnswer).toBe("A");
    expect(first.options[0]!.correct).toBe(true);
    expect(first.topic).toBe("Cardiovascular");
    expect(first.explanation).toContain("MI typically presents");

    const second = result.questions[1]!;
    expect(second.correctAnswer).toBe("C");
    expect(second.options[2]!.correct).toBe(true);
  });

  it("should collect non-fatal errors for malformed rows without stopping", async () => {
    const result = await parser.parse(
      toBuffer(MALFORMED_CSV),
      "malformed.csv",
      DEFAULT_OPTIONS,
    );

    // Row 1 is valid, rows 2-4 have issues
    expect(result.questions.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);

    // Check error structure
    const firstError = result.errors[0]!;
    expect(firstError.index).toBeGreaterThan(0);
    expect(firstError.line).toBeGreaterThan(0);
    expect(firstError.message).toBeTruthy();
    expect(firstError.severity).toBeTruthy();

    // Missing stem error should exist for row 4
    const stemError = result.errors.find((e) => e.field === "stem");
    expect(stemError).toBeDefined();

    // Missing correct answer error for row 3
    const correctError = result.errors.find((e) => e.field === "correctAnswer");
    expect(correctError).toBeDefined();
  });

  it("should return empty results for CSV with headers only", async () => {
    const result = await parser.parse(
      toBuffer(EMPTY_CSV),
      "empty.csv",
      DEFAULT_OPTIONS,
    );

    expect(result.questions).toHaveLength(0);
    expect(result.totalFound).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should handle custom column mapping (non-standard header names)", async () => {
    const options: ParserOptions = {
      maxFileSizeBytes: 10 * 1024 * 1024,
      columnMapping: {
        stem: "Question Text",
        optionA: "Choice 1",
        optionB: "Choice 2",
        optionC: "Choice 3",
        optionD: "Choice 4",
        correctAnswer: "Answer",
      },
    };

    const result = await parser.parse(
      toBuffer(CUSTOM_HEADERS_CSV),
      "custom.csv",
      options,
    );

    expect(result.questions).toHaveLength(1);
    const q = result.questions[0]!;
    expect(q.stem).toBe("What is 2+2?");
    expect(q.correctAnswer).toBe("D");
    expect(q.options).toHaveLength(4);
    expect(q.options[3]!.text).toBe("4");
    expect(q.options[3]!.correct).toBe(true);

    // Unmapped column should be in rawMetadata
    expect(q.rawMetadata["Extra Col"]).toBe("some extra data");
  });
});
