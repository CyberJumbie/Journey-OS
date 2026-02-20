/**
 * DanglingSloRule tests.
 * [STORY-IA-12] 2 tests: invalid course_id, all valid.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DanglingSloRule } from "../dangling-slo.rule";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(
  slos: Array<{ id: string; course_id: string }>,
  courses: Array<{ id: string }>,
): SupabaseClient {
  const sloQuery = {
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // Resolve the slo query
  Object.defineProperty(sloQuery, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ data: slos, error: null }),
  });

  const courseQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  Object.defineProperty(courseQuery, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ data: courses, error: null }),
  });

  let callCount = 0;
  return {
    from: vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? sloQuery : courseQuery;
    }),
  } as unknown as SupabaseClient;
}

describe("DanglingSloRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns critical finding for SLOs with invalid course_id", async () => {
    const supabase = createMockSupabase(
      [
        { id: "slo-1", course_id: "course-valid" },
        { id: "slo-2", course_id: "course-invalid" },
      ],
      [{ id: "course-valid" }],
    );

    const rule = new DanglingSloRule(supabase);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule_id).toBe("dangling-slo");
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.affected_nodes).toEqual(["slo-2"]);
  });

  it("returns empty findings when all SLOs have valid course references", async () => {
    const supabase = createMockSupabase(
      [{ id: "slo-1", course_id: "course-1" }],
      [{ id: "course-1" }],
    );

    const rule = new DanglingSloRule(supabase);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(0);
  });
});
