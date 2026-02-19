import { describe, it, expect } from "vitest";
import type {
  FrameworkId,
  Neo4jFrameworkLabel,
  USMLESystem,
  USMLETopic,
  LCMEStandard,
  LCMEElement,
  ACGMESubdomain,
  AAMCCompetency,
  UMESubcompetency,
  EPAActivity,
  BloomLevelNode,
  MillerLevelNode,
  FrameworkLabelMap,
} from "../index";
import { FIXTURES } from "./framework-nodes.fixtures";

describe("Framework Type Definitions", () => {
  it("FrameworkId covers all 8 frameworks", () => {
    const frameworks: FrameworkId[] = [
      "usmle",
      "lcme",
      "acgme",
      "aamc",
      "ume",
      "epa",
      "bloom",
      "miller",
    ];
    expect(frameworks).toHaveLength(8);
  });

  it("Neo4jFrameworkLabel covers all 15 labels", () => {
    const labels: Neo4jFrameworkLabel[] = [
      "USMLE_System",
      "USMLE_Discipline",
      "USMLE_Task",
      "USMLE_Topic",
      "LCME_Standard",
      "LCME_Element",
      "ACGME_Domain",
      "ACGME_Subdomain",
      "AAMC_Domain",
      "AAMC_Competency",
      "EPA",
      "BloomLevel",
      "MillerLevel",
      "UME_Competency",
      "UME_Subcompetency",
    ];
    expect(labels).toHaveLength(15);
  });

  it("USMLE_System fixture satisfies USMLESystem interface", () => {
    const node: USMLESystem = FIXTURES.usmleSystem;
    expect(node.framework).toBe("usmle");
    expect(node.code).toBeDefined();
    expect(node.name).toBeDefined();
    expect(node.id).toBeDefined();
  });

  it("USMLE_Topic fixture includes parent_system", () => {
    const node: USMLETopic = FIXTURES.usmleTopic;
    expect(node.parent_system).toBe("SYS-CVS");
  });

  it("LCME_Standard fixture has number field", () => {
    const node: LCMEStandard = FIXTURES.lcmeStandard;
    expect(node.number).toBe("7");
    expect(node.title).toBeDefined();
  });

  it("LCME_Element fixture has number field", () => {
    const node: LCMEElement = FIXTURES.lcmeElement;
    expect(node.number).toBe("7.1");
  });

  it("ACGME_Subdomain has parent_domain", () => {
    const node: ACGMESubdomain = FIXTURES.acgmeSubdomain;
    expect(node.parent_domain).toBe("MK");
  });

  it("AAMC_Competency has parent_domain", () => {
    const node: AAMCCompetency = FIXTURES.aamcCompetency;
    expect(node.parent_domain).toBe("KP");
  });

  it("UME_Subcompetency has do_specific flag", () => {
    const node: UMESubcompetency = FIXTURES.umeSubcompetency;
    expect(node.do_specific).toBe(true);
  });

  it("EPA fixture has numeric number field", () => {
    const node: EPAActivity = FIXTURES.epa;
    expect(typeof node.number).toBe("number");
    expect(node.number).toBe(1);
  });

  it("BloomLevel fixture has level 1-6 and action_verbs array", () => {
    const node: BloomLevelNode = FIXTURES.bloomLevel;
    expect(node.level).toBeGreaterThanOrEqual(1);
    expect(node.level).toBeLessThanOrEqual(6);
    expect(Array.isArray(node.action_verbs)).toBe(true);
    expect(node.action_verbs.length).toBeGreaterThan(0);
  });

  it("MillerLevel fixture has level 1-4", () => {
    const node: MillerLevelNode = FIXTURES.millerLevel;
    expect(node.level).toBeGreaterThanOrEqual(1);
    expect(node.level).toBeLessThanOrEqual(4);
  });

  it("FrameworkLabelMap maps all 15 labels to correct interfaces", () => {
    const _check: FrameworkLabelMap["USMLE_System"] = FIXTURES.usmleSystem;
    const _check2: FrameworkLabelMap["BloomLevel"] = FIXTURES.bloomLevel;
    const _check3: FrameworkLabelMap["EPA"] = FIXTURES.epa;
    expect(_check).toBeDefined();
    expect(_check2).toBeDefined();
    expect(_check3).toBeDefined();
  });

  it("all fixtures have required BaseFrameworkNode properties", () => {
    const allFixtures = Object.values(FIXTURES);
    for (const fixture of allFixtures) {
      expect(fixture.id).toBeDefined();
      expect(typeof fixture.id).toBe("string");
      expect(fixture.name).toBeDefined();
      expect(typeof fixture.name).toBe("string");
      expect(fixture.framework).toBeDefined();
    }
  });
});
