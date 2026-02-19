import { describe, it, expect } from "vitest";
import { FrameworkNodeModel } from "../framework-node.model";
import { InvalidFrameworkNodeError } from "../../errors/framework.errors";
import { FIXTURES } from "@test/fixtures/framework-nodes.fixtures";

describe("FrameworkNodeModel", () => {
  describe("construction", () => {
    it("creates a model from USMLESystem fixture", () => {
      const model = new FrameworkNodeModel(
        FIXTURES.usmleSystem,
        "USMLE_System",
      );
      expect(model.id).toBe("usmle-sys-001");
      expect(model.name).toBe("Cardiovascular System");
      expect(model.framework).toBe("usmle");
      expect(model.neo4jLabel).toBe("USMLE_System");
    });

    it("creates a model from BloomLevel fixture", () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, "BloomLevel");
      expect(model.neo4jLabel).toBe("BloomLevel");
      expect(model.framework).toBe("bloom");
    });

    it("throws InvalidFrameworkNodeError when id is missing", () => {
      expect(() => {
        new FrameworkNodeModel(
          { ...FIXTURES.usmleSystem, id: "" },
          "USMLE_System",
        );
      }).toThrow(InvalidFrameworkNodeError);
    });

    it("throws InvalidFrameworkNodeError when name is missing", () => {
      expect(() => {
        new FrameworkNodeModel(
          { ...FIXTURES.usmleSystem, name: "" },
          "USMLE_System",
        );
      }).toThrow(InvalidFrameworkNodeError);
    });

    it("throws InvalidFrameworkNodeError for invalid framework", () => {
      expect(() => {
        new FrameworkNodeModel(
          {
            ...FIXTURES.usmleSystem,
            framework: "invalid" as unknown as "usmle",
          },
          "USMLE_System",
        );
      }).toThrow(InvalidFrameworkNodeError);
    });
  });

  describe("toDTO", () => {
    it("returns a plain object matching the input fixture", () => {
      const model = new FrameworkNodeModel(
        FIXTURES.acgmeDomain,
        "ACGME_Domain",
      );
      const dto = model.toDTO();
      expect(dto.id).toBe("acgme-dom-001");
      expect(dto.code).toBe("MK");
      expect(dto.framework).toBe("acgme");
    });
  });

  describe("toNeo4jProperties", () => {
    it("returns a flat property map suitable for Cypher params", () => {
      const model = new FrameworkNodeModel(
        FIXTURES.lcmeElement,
        "LCME_Element",
      );
      const props = model.toNeo4jProperties();
      expect(props.id).toBe("lcme-elem-001");
      expect(props.number).toBe("7.1");
      expect(props.name).toBe("Biomedical Sciences");
      expect(Object.values(props).every((v) => v !== undefined)).toBe(true);
    });

    it("serializes action_verbs array for BloomLevel", () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, "BloomLevel");
      const props = model.toNeo4jProperties();
      expect(Array.isArray(props.action_verbs)).toBe(true);
    });
  });

  describe("getNeo4jLabel", () => {
    it("returns SCREAMING_SNAKE for acronym-prefixed labels", () => {
      const model = new FrameworkNodeModel(
        FIXTURES.usmleSystem,
        "USMLE_System",
      );
      expect(model.neo4jLabel).toBe("USMLE_System");
    });

    it("returns PascalCase for single-concept labels", () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, "BloomLevel");
      expect(model.neo4jLabel).toBe("BloomLevel");
    });

    it("returns PascalCase for EPA", () => {
      const model = new FrameworkNodeModel(FIXTURES.epa, "EPA");
      expect(model.neo4jLabel).toBe("EPA");
    });
  });

  describe("all 15 node types instantiate correctly", () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["USMLE_System", FIXTURES.usmleSystem, "USMLE_System"],
      ["USMLE_Discipline", FIXTURES.usmleDiscipline, "USMLE_Discipline"],
      ["USMLE_Task", FIXTURES.usmleTask, "USMLE_Task"],
      ["USMLE_Topic", FIXTURES.usmleTopic, "USMLE_Topic"],
      ["LCME_Standard", FIXTURES.lcmeStandard, "LCME_Standard"],
      ["LCME_Element", FIXTURES.lcmeElement, "LCME_Element"],
      ["ACGME_Domain", FIXTURES.acgmeDomain, "ACGME_Domain"],
      ["ACGME_Subdomain", FIXTURES.acgmeSubdomain, "ACGME_Subdomain"],
      ["AAMC_Domain", FIXTURES.aamcDomain, "AAMC_Domain"],
      ["AAMC_Competency", FIXTURES.aamcCompetency, "AAMC_Competency"],
      ["UME_Competency", FIXTURES.umeCompetency, "UME_Competency"],
      ["UME_Subcompetency", FIXTURES.umeSubcompetency, "UME_Subcompetency"],
      ["EPA", FIXTURES.epa, "EPA"],
      ["BloomLevel", FIXTURES.bloomLevel, "BloomLevel"],
      ["MillerLevel", FIXTURES.millerLevel, "MillerLevel"],
    ];

    it.each(cases)(
      "%s instantiates without error",
      (_label, fixture, neo4jLabel) => {
        expect(
          () =>
            new FrameworkNodeModel(
              fixture as Record<string, unknown> & {
                id: string;
                name: string;
                framework: "usmle";
              },
              neo4jLabel as
                | "USMLE_System"
                | "USMLE_Discipline"
                | "USMLE_Task"
                | "USMLE_Topic"
                | "LCME_Standard"
                | "LCME_Element"
                | "ACGME_Domain"
                | "ACGME_Subdomain"
                | "AAMC_Domain"
                | "AAMC_Competency"
                | "EPA"
                | "BloomLevel"
                | "MillerLevel"
                | "UME_Competency"
                | "UME_Subcompetency",
            ),
        ).not.toThrow();
      },
    );
  });
});
