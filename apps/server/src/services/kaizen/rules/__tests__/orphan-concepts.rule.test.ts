/**
 * OrphanConceptsRule tests.
 * [STORY-IA-12] 3 tests: finding detection, empty results, institution scope.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrphanConceptsRule } from "../orphan-concepts.rule";
import type { Driver } from "neo4j-driver";

function createMockSession(records: Array<{ id: string }> = []) {
  return {
    run: vi.fn().mockResolvedValue({
      records: records.map((r) => ({
        get: vi.fn().mockReturnValue(r.id),
      })),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDriver(records: Array<{ id: string }> = []) {
  const session = createMockSession(records);
  return {
    session: vi.fn().mockReturnValue(session),
    _mockSession: session,
  } as unknown as Driver & {
    _mockSession: ReturnType<typeof createMockSession>;
  };
}

describe("OrphanConceptsRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns findings for SubConcepts with no TEACHES edges", async () => {
    const driver = createMockDriver([
      { id: "subconcept-uuid-1" },
      { id: "subconcept-uuid-2" },
    ]);
    const rule = new OrphanConceptsRule(driver);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule_id).toBe("orphan-concepts");
    expect(findings[0]!.severity).toBe("warning");
    expect(findings[0]!.affected_nodes).toEqual([
      "subconcept-uuid-1",
      "subconcept-uuid-2",
    ]);
    expect(findings[0]!.message).toContain("2 SubConcept nodes");
  });

  it("returns empty findings when all SubConcepts have TEACHES edges", async () => {
    const driver = createMockDriver([]);
    const rule = new OrphanConceptsRule(driver);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(0);
  });

  it("respects institution_id scope", async () => {
    const driver = createMockDriver([{ id: "subconcept-uuid-1" }]);
    const rule = new OrphanConceptsRule(driver);

    await rule.execute({
      institution_id: "inst-uuid-42",
      mode: "full",
    });

    expect(driver._mockSession.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ institutionId: "inst-uuid-42" }),
    );
  });
});
