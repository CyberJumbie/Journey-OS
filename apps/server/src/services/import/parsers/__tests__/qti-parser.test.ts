import { describe, it, expect, beforeEach } from "vitest";
import { QtiParser } from "../qti-parser";
import { ParseError } from "../../../../errors/import.errors";
import type { ParserOptions } from "@journey-os/types";

const VALID_QTI = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                identifier="item001"
                title="Cardiac Enzymes"
                adaptive="false"
                timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse>
      <value>C</value>
    </correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue>
      <value>0</value>
    </defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <p>Which of the following cardiac enzymes is released first after myocardial injury?</p>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
      <simpleChoice identifier="A">Troponin T</simpleChoice>
      <simpleChoice identifier="B">CK-MB</simpleChoice>
      <simpleChoice identifier="C">Myoglobin</simpleChoice>
      <simpleChoice identifier="D">LDH</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`;

const INVALID_QTI = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
                identifier="item001">
  <itemBody>
    <p>This XML is malformed — missing closing tags
    <choiceInteraction>
      <simpleChoice identifier="A">Option A</simpleChoice>
  </itemBody>`;

const DEFAULT_OPTIONS: ParserOptions = {
  maxFileSizeBytes: 10 * 1024 * 1024,
};

function toBuffer(str: string): Buffer {
  return Buffer.from(str, "utf-8");
}

describe("QtiParser", () => {
  let parser: QtiParser;

  beforeEach(() => {
    parser = new QtiParser();
  });

  it("should parse valid QTI 2.1 single assessmentItem with correct answer extraction", async () => {
    const result = await parser.parse(
      toBuffer(VALID_QTI),
      "valid-qti.xml",
      DEFAULT_OPTIONS,
    );

    expect(result.questions).toHaveLength(1);
    expect(result.format).toBe("qti");
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);

    const q = result.questions[0]!;
    expect(q.stem).toContain("cardiac enzymes");
    expect(q.options).toHaveLength(4);
    expect(q.correctAnswer).toBe("C");

    // Myoglobin (option C) should be marked correct
    const correctOption = q.options.find((o) => o.letter === "C");
    expect(correctOption).toBeDefined();
    expect(correctOption!.correct).toBe(true);
    expect(correctOption!.text).toBe("Myoglobin");
  });

  it("should handle invalid XML gracefully without unhandled exceptions", async () => {
    // fast-xml-parser is lenient with malformed XML — it may parse partially
    // rather than throwing. Our parser should not throw unhandled exceptions.
    try {
      const result = await parser.parse(
        toBuffer(INVALID_QTI),
        "invalid-qti.xml",
        DEFAULT_OPTIONS,
      );
      // Lenient parse: result is returned but quality is degraded
      expect(result.format).toBe("qti");
      expect(result.filename).toBe("invalid-qti.xml");
      // Either errors collected or questions are incomplete (missing options, no correct answer)
      if (result.questions.length > 0) {
        const q = result.questions[0]!;
        // Malformed XML produces an item with only 1 option or no correct answer
        expect(q.options.length <= 1 || q.correctAnswer === "").toBe(true);
      }
    } catch (err) {
      // If parser does throw, it should be a ParseError
      expect(err).toBeInstanceOf(ParseError);
    }
  });

  it("should extract metadata from QTI attributes (identifier, title, adaptive)", async () => {
    const result = await parser.parse(
      toBuffer(VALID_QTI),
      "valid-qti.xml",
      DEFAULT_OPTIONS,
    );

    const q = result.questions[0]!;
    expect(q.rawMetadata["identifier"]).toBe("item001");
    expect(q.rawMetadata["title"]).toBe("Cardiac Enzymes");
    expect(q.rawMetadata["adaptive"]).toBe("false");
  });
});
