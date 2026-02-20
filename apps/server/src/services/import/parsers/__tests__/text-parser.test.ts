import { describe, it, expect, beforeEach } from "vitest";
import { TextParser } from "../text-parser";
import type { ParserOptions } from "@journey-os/types";

const ASTERISK_FORMAT = `1. A 55-year-old man presents with sudden onset of severe chest pain. ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?
A) Left anterior descending
B) Left circumflex
*C) Right coronary artery
D) Left main coronary artery

2. Which of the following is a contraindication to thrombolytic therapy?
A) ST elevation MI
B) Symptom onset < 12 hours
*C) Active internal bleeding
D) Age > 65 years

3. A patient with heart failure has a B-type natriuretic peptide (BNP) level of 1200 pg/mL. This finding is most consistent with:
A) Normal cardiac function
B) Mild heart failure
C) Moderate heart failure
*D) Severe heart failure`;

const CORRECT_BRACKET_FORMAT = `Question 1:
A 35-year-old woman presents with palpitations. Her ECG shows an irregularly irregular rhythm with no discernible P waves.

A. Atrial fibrillation [CORRECT]
B. Atrial flutter
C. Ventricular tachycardia
D. Sinus tachycardia

Question 2:
Which class of antiarrhythmic drugs blocks sodium channels?

A. Class I [CORRECT]
B. Class II
C. Class III
D. Class IV`;

const EDGE_CASES = `1. This question has no correct answer marked
A) Option A
B) Option B
C) Option C
D) Option D

2.
A) Option A
*B) Option B
C) Option C
D) Option D

3. This question has only two options
*A) Correct
B) Wrong`;

const DEFAULT_OPTIONS: ParserOptions = {
  maxFileSizeBytes: 10 * 1024 * 1024,
};

function toBuffer(str: string): Buffer {
  return Buffer.from(str, "utf-8");
}

describe("TextParser", () => {
  let parser: TextParser;

  beforeEach(() => {
    parser = new TextParser();
  });

  it("should parse standard format with asterisk-marked correct answers", async () => {
    const result = await parser.parse(
      toBuffer(ASTERISK_FORMAT),
      "questions.txt",
      DEFAULT_OPTIONS,
    );

    expect(result.questions).toHaveLength(3);
    expect(result.format).toBe("text");

    const q1 = result.questions[0]!;
    expect(q1.correctAnswer).toBe("C");
    expect(q1.stem).toContain("ST elevation");
    expect(q1.options).toHaveLength(4);
    expect(q1.options[2]!.correct).toBe(true);
    expect(q1.options[2]!.text).toBe("Right coronary artery");

    const q3 = result.questions[2]!;
    expect(q3.correctAnswer).toBe("D");
  });

  it("should parse alternative format with [CORRECT] marker", async () => {
    const result = await parser.parse(
      toBuffer(CORRECT_BRACKET_FORMAT),
      "alt-format.txt",
      DEFAULT_OPTIONS,
    );

    expect(result.questions).toHaveLength(2);

    const q1 = result.questions[0]!;
    expect(q1.correctAnswer).toBe("A");
    expect(q1.stem).toContain("palpitations");
    expect(q1.options[0]!.text).toBe("Atrial fibrillation");
    expect(q1.options[0]!.correct).toBe(true);

    const q2 = result.questions[1]!;
    expect(q2.correctAnswer).toBe("A");
    expect(q2.stem).toContain("antiarrhythmic");
  });

  it("should collect errors for questions with no correct answer or missing stem", async () => {
    const result = await parser.parse(
      toBuffer(EDGE_CASES),
      "edge-cases.txt",
      DEFAULT_OPTIONS,
    );

    // All 3 should still be parsed (warnings, not fatal errors)
    expect(result.questions.length).toBeGreaterThanOrEqual(2);

    // Question 1: no correct answer marked
    const noCorrectError = result.errors.find(
      (e) => e.field === "correctAnswer" && e.index === 1,
    );
    expect(noCorrectError).toBeDefined();
    expect(noCorrectError!.severity).toBe("warning");

    // Question 2: empty stem
    const stemError = result.errors.find(
      (e) => e.field === "stem" && e.index === 2,
    );
    expect(stemError).toBeDefined();

    // Question 3: only 2 options — warning
    const optionsWarning = result.errors.find(
      (e) => e.field === "options" && e.index === 3,
    );
    expect(optionsWarning).toBeDefined();
    expect(optionsWarning!.severity).toBe("warning");
  });
});
