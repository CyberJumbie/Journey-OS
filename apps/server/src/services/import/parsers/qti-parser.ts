import { XMLParser } from "fast-xml-parser";
import type {
  IParser,
  ImportFormat,
  ParseResult,
  ParserOptions,
  ParsedQuestion,
  ParsedQuestionOption,
  ParseErrorDetail,
} from "@journey-os/types";
import { ParseError } from "../../../errors/import.errors";

const QTI_NAMESPACE = "http://www.imsglobal.org/xsd/imsqti_v2p1";

export class QtiParser implements IParser {
  readonly format: ImportFormat = "qti";

  canParse(buffer: Uint8Array, filename: string): boolean {
    if (!filename.toLowerCase().endsWith(".xml")) return false;
    const content = new TextDecoder().decode(buffer.slice(0, 1024));
    return (
      content.includes("imsqti") ||
      content.includes("assessmentItem") ||
      content.includes("assessmentTest")
    );
  }

  async parse(
    buffer: Uint8Array,
    filename: string,
    options: ParserOptions,
  ): Promise<ParseResult> {
    const start = Date.now();
    const xmlString = new TextDecoder().decode(buffer);

    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (_name: string, _jpath: string, isLeafNode: boolean) => {
        if (_name === "simpleChoice" || _name === "value") return true;
        return !isLeafNode && false;
      },
      removeNSPrefix: true,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = xmlParser.parse(xmlString) as Record<string, unknown>;
    } catch (err) {
      throw new ParseError({
        message: `Failed to parse XML: ${err instanceof Error ? err.message : String(err)}`,
        format: "qti",
        filename,
      });
    }

    const questions: ParsedQuestion[] = [];
    const errors: ParseErrorDetail[] = [];

    const items = this.#extractAssessmentItems(parsed);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const itemIndex = i + 1;

      try {
        const question = this.#parseAssessmentItem(item, itemIndex);
        questions.push(question);
      } catch (err) {
        errors.push({
          index: itemIndex,
          line: itemIndex,
          message:
            err instanceof Error
              ? err.message
              : `Failed to parse item ${itemIndex}`,
          severity: "error",
          field: null,
        });
      }
    }

    return {
      questions,
      errors,
      totalFound: items.length,
      successCount: questions.length,
      errorCount: items.length - questions.length,
      format: "qti",
      filename,
      durationMs: Date.now() - start,
    };
  }

  #extractAssessmentItems(
    parsed: Record<string, unknown>,
  ): Record<string, unknown>[] {
    // Single assessmentItem document
    if (parsed["assessmentItem"]) {
      return [parsed["assessmentItem"] as Record<string, unknown>];
    }

    // assessmentTest with sections containing assessmentItemRef
    const test = parsed["assessmentTest"] as
      | Record<string, unknown>
      | undefined;
    if (!test) return [];

    // Try to extract inline items from test structure
    const items: Record<string, unknown>[] = [];
    this.#walkForItems(test, items);
    return items;
  }

  #walkForItems(
    node: Record<string, unknown>,
    items: Record<string, unknown>[],
  ): void {
    if (node["assessmentItem"]) {
      const item = node["assessmentItem"];
      if (Array.isArray(item)) {
        items.push(...(item as Record<string, unknown>[]));
      } else {
        items.push(item as Record<string, unknown>);
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        this.#walkForItems(value as Record<string, unknown>, items);
      } else if (Array.isArray(value)) {
        for (const element of value) {
          if (element && typeof element === "object") {
            this.#walkForItems(element as Record<string, unknown>, items);
          }
        }
      }
    }
  }

  #parseAssessmentItem(
    item: Record<string, unknown>,
    index: number,
  ): ParsedQuestion {
    // Extract stem from itemBody
    const itemBody = item["itemBody"] as Record<string, unknown> | undefined;
    let stem = "";
    if (itemBody) {
      stem = this.#extractText(itemBody["p"]);
    }

    // Extract choices from choiceInteraction
    const choiceInteraction = this.#findChoiceInteraction(itemBody);
    const simpleChoices = choiceInteraction
      ? ((choiceInteraction["simpleChoice"] as Record<string, unknown>[]) ?? [])
      : [];

    const questionOptions: ParsedQuestionOption[] = simpleChoices.map(
      (choice) => {
        const identifier = String(
          (choice as Record<string, unknown>)["@_identifier"] ?? "",
        );
        const text = this.#extractChoiceText(choice);
        return { letter: identifier, text, correct: false };
      },
    );

    // Extract correct answer from responseDeclaration
    const responseDecl = item["responseDeclaration"] as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined;
    const decl = Array.isArray(responseDecl) ? responseDecl[0] : responseDecl;
    let correctAnswer = "";
    if (decl) {
      const correctResponse = decl["correctResponse"] as
        | Record<string, unknown>
        | undefined;
      if (correctResponse) {
        const values = correctResponse["value"];
        if (Array.isArray(values)) {
          correctAnswer = String(values[0] ?? "");
        } else {
          correctAnswer = String(values ?? "");
        }
      }
    }

    // Mark correct option
    const finalOptions = questionOptions.map((opt) => ({
      ...opt,
      correct: opt.letter === correctAnswer,
    }));

    // Raw metadata from attributes
    const rawMetadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key.startsWith("@_")) {
        rawMetadata[key.slice(2)] = value;
      }
    }

    return {
      sourceIndex: index,
      sourceLocation: `assessmentItem[${index}]`,
      vignette: "",
      stem,
      options: finalOptions,
      correctAnswer,
      bloomLevel: null,
      difficulty: null,
      topic: null,
      explanation: null,
      rawMetadata,
    };
  }

  #findChoiceInteraction(
    itemBody: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!itemBody) return undefined;

    if (itemBody["choiceInteraction"]) {
      const ci = itemBody["choiceInteraction"];
      return Array.isArray(ci)
        ? (ci[0] as Record<string, unknown>)
        : (ci as Record<string, unknown>);
    }

    // Recurse through body elements
    for (const value of Object.values(itemBody)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const found = this.#findChoiceInteraction(
          value as Record<string, unknown>,
        );
        if (found) return found;
      }
    }
    return undefined;
  }

  #extractText(node: unknown): string {
    if (typeof node === "string") return node.trim();
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) {
      return node.map((n) => this.#extractText(n)).join(" ");
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if ("#text" in obj) return String(obj["#text"]).trim();
      return Object.values(obj)
        .map((v) => this.#extractText(v))
        .join(" ")
        .trim();
    }
    return "";
  }

  #extractChoiceText(choice: Record<string, unknown>): string {
    if ("#text" in choice) return String(choice["#text"]).trim();
    // Choice may just be a string
    const values = Object.entries(choice).filter(([k]) => !k.startsWith("@_"));
    return values
      .map(([, v]) => this.#extractText(v))
      .join(" ")
      .trim();
  }
}
