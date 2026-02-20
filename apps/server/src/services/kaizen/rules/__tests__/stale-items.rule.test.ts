/**
 * StaleItemsRule tests.
 * [STORY-IA-12] 3 tests: stale detection, all recent, custom threshold.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaleItemsRule } from "../stale-items.rule";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(
  items: Array<{ id: string; updated_at: string }>,
): SupabaseClient {
  const query = {
    select: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  Object.defineProperty(query, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ data: items, error: null }),
  });

  return {
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient;
}

describe("StaleItemsRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns findings for items not updated in over 90 days", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const supabase = createMockSupabase([
      { id: "item-1", updated_at: oldDate.toISOString() },
      { id: "item-2", updated_at: oldDate.toISOString() },
    ]);

    const rule = new StaleItemsRule(supabase);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule_id).toBe("stale-items");
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.affected_nodes).toHaveLength(2);
    expect(findings[0]!.message).toContain("90 days");
  });

  it("returns empty findings when all items are recent", async () => {
    const supabase = createMockSupabase([]);

    const rule = new StaleItemsRule(supabase);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(0);
  });

  it("respects custom threshold from config", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);

    const supabase = createMockSupabase([
      { id: "item-1", updated_at: oldDate.toISOString() },
    ]);

    const rule = new StaleItemsRule(supabase, 30);

    const findings = await rule.execute({
      institution_id: "inst-uuid-1",
      mode: "full",
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain("30 days");
  });
});
