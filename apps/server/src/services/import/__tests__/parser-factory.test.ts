import { describe, it, expect, beforeEach } from "vitest";
import { ParserFactory } from "../parser-factory.service";
import { CsvParser } from "../parsers/csv-parser";
import { QtiParser } from "../parsers/qti-parser";
import { TextParser } from "../parsers/text-parser";
import {
  UnsupportedFormatError,
  FileSizeLimitError,
} from "../../../errors/import.errors";

function toBuffer(str: string): Buffer {
  return Buffer.from(str, "utf-8");
}

describe("ParserFactory", () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  it("should auto-detect CSV format from .csv extension", () => {
    const buffer = toBuffer('stem,optionA\n"test","a"');
    const format = factory.detectFormat(buffer, "questions.csv");
    expect(format).toBe("csv");

    const parser = factory.getParser("questions.csv", buffer);
    expect(parser).toBeInstanceOf(CsvParser);
  });

  it("should auto-detect QTI format from .xml extension with QTI content sniffing", () => {
    const qtiBuffer = toBuffer(
      '<?xml version="1.0"?><assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">',
    );
    const nonQtiXml = toBuffer('<?xml version="1.0"?><root><data/></root>');

    const qtiFormat = factory.detectFormat(qtiBuffer, "export.xml");
    expect(qtiFormat).toBe("qti");

    const parser = factory.getParser("export.xml", qtiBuffer);
    expect(parser).toBeInstanceOf(QtiParser);

    // Non-QTI XML should throw
    expect(() => factory.detectFormat(nonQtiXml, "data.xml")).toThrow(
      UnsupportedFormatError,
    );
  });

  it("should auto-detect text format from .txt extension", () => {
    const buffer = toBuffer("1. Question stem\nA) Option A\n*B) Option B");
    const format = factory.detectFormat(buffer, "questions.txt");
    expect(format).toBe("text");

    const parser = factory.getParser("questions.txt", buffer);
    expect(parser).toBeInstanceOf(TextParser);
  });

  it("should throw FileSizeLimitError when buffer exceeds maxFileSizeBytes", async () => {
    const largeBuffer = Buffer.alloc(200, "x");

    await expect(
      factory.parse(largeBuffer, "test.csv", { maxFileSizeBytes: 100 }),
    ).rejects.toThrow(FileSizeLimitError);

    try {
      await factory.parse(largeBuffer, "test.csv", {
        maxFileSizeBytes: 100,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(FileSizeLimitError);
      const fErr = err as FileSizeLimitError;
      expect(fErr.fileSize).toBe(200);
      expect(fErr.maxSize).toBe(100);
    }
  });
});
