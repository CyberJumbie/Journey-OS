import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver } from "neo4j-driver";
import { LCMESeeder } from "../lcme-seeder.service";
import { ACGMESeeder } from "../acgme-seeder.service";
import { AAMCSeeder } from "../aamc-seeder.service";
import { UMESeeder } from "../ume-seeder.service";
import { EPASeeder } from "../epa-seeder.service";
import { BloomSeeder } from "../bloom-seeder.service";
import { MillerSeeder } from "../miller-seeder.service";
import { LCME_STANDARDS, LCME_ELEMENTS } from "../data/lcme.data";
import { ACGME_DOMAINS, ACGME_SUBDOMAINS } from "../data/acgme.data";
import { AAMC_DOMAINS } from "../data/aamc.data";
import { UME_COMPETENCIES, UME_SUBCOMPETENCIES } from "../data/ume.data";
import { EPA_ACTIVITIES } from "../data/epa.data";
import { BLOOM_LEVELS } from "../data/bloom.data";
import { MILLER_LEVELS } from "../data/miller.data";

// --- Mock helpers (same pattern as usmle-seeder.test.ts) ---

function createMockCounters(
  nodesCreated: number = 1,
  propertiesSet: number = 7,
) {
  return {
    updates: () => ({ nodesCreated, propertiesSet }),
  };
}

function createMockSession(options?: {
  txRunResult?: {
    summary: { counters: ReturnType<typeof createMockCounters> };
  };
}) {
  const defaultTxResult = {
    records: [],
    summary: { counters: createMockCounters(1, 7) },
  };

  const mockTx = {
    run: vi.fn().mockResolvedValue(options?.txRunResult ?? defaultTxResult),
  };

  return {
    run: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        records: [{ get: vi.fn().mockReturnValue({ toNumber: () => 0 }) }],
      });
    }),
    close: vi.fn().mockResolvedValue(undefined),
    executeWrite: vi.fn().mockImplementation(async (fn) => fn(mockTx)),
    _tx: mockTx,
  };
}

function createMockDriver(
  sessionFactory?: () => ReturnType<typeof createMockSession>,
) {
  const defaultSession = createMockSession();
  return {
    session: vi
      .fn()
      .mockImplementation(() =>
        sessionFactory ? sessionFactory() : defaultSession,
      ),
    close: vi.fn().mockResolvedValue(undefined),
    _defaultSession: defaultSession,
  };
}

function makeVerifyDriver(counts: number[], hasOrphans: boolean = false) {
  let callIndex = 0;
  const session = {
    run: vi.fn().mockImplementation(() => {
      const val = counts[callIndex] ?? 0;
      callIndex++;
      return Promise.resolve({
        records: [
          {
            get: vi.fn().mockReturnValue({ toNumber: () => val }),
          },
        ],
      });
    }),
    close: vi.fn().mockResolvedValue(undefined),
    executeWrite: vi.fn(),
  };

  return {
    session: vi.fn().mockReturnValue(session),
    close: vi.fn(),
  };
}

// ═══════════════════════════════════════════════════
// LCME Seeder
// ═══════════════════════════════════════════════════
describe("LCMESeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: LCMESeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new LCMESeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("lcme");
      expect(seeder.label).toBe("LCME_Standard");
    });
  });

  describe("seed()", () => {
    it("calls executeBatch for standards and elements", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(105);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(105);
    });

    it("returns relationshipsCreated for elements", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(93);
    });

    it("returns empty errors on success", async () => {
      const result = await seeder.seed();
      expect(result.errors).toHaveLength(0);
    });

    it("MERGE query includes HAS_ELEMENT relationship for elements", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const elementQuery = queries.find((q) => q.includes("LCME_Element"))!;
      expect(elementQuery).toContain(
        "MATCH (s:LCME_Standard {id: $standard_id})",
      );
      expect(elementQuery).toContain("MERGE (s)-[:HAS_ELEMENT]->(e)");
    });
  });

  describe("verify()", () => {
    it("passes when counts match", async () => {
      const driver = makeVerifyDriver([12, 93, 0]);
      const s = new LCMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.actualCount).toBe(105);
      expect(result.expectedCount).toBe(105);
    });

    it("fails when standard count is wrong", async () => {
      const driver = makeVerifyDriver([10, 93, 0]);
      const s = new LCMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });

    it("fails when orphans exist", async () => {
      const driver = makeVerifyDriver([12, 93, 2]);
      const s = new LCMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
      expect(result.orphanCount).toBe(2);
    });
  });

  describe("data integrity", () => {
    it("has 12 standards with unique numbers", () => {
      expect(LCME_STANDARDS).toHaveLength(12);
      const numbers = LCME_STANDARDS.map((s) => s.number);
      expect(new Set(numbers).size).toBe(12);
    });

    it("has 93 elements with unique numbers", () => {
      expect(LCME_ELEMENTS).toHaveLength(93);
      const numbers = LCME_ELEMENTS.map((e) => e.number);
      expect(new Set(numbers).size).toBe(93);
    });

    it("every element references a valid standard", () => {
      const standardIds = new Set(LCME_STANDARDS.map((s) => s.id));
      for (const element of LCME_ELEMENTS) {
        expect(standardIds.has(element.standard_id)).toBe(true);
      }
    });

    it("all nodes have framework = lcme", () => {
      for (const s of LCME_STANDARDS) {
        expect(s.framework).toBe("lcme");
      }
      for (const e of LCME_ELEMENTS) {
        expect(e.framework).toBe("lcme");
      }
    });
  });
});

// ═══════════════════════════════════════════════════
// ACGME Seeder
// ═══════════════════════════════════════════════════
describe("ACGMESeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: ACGMESeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new ACGMESeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("acgme");
      expect(seeder.label).toBe("ACGME_Domain");
    });
  });

  describe("seed()", () => {
    it("calls executeBatch for domains and subdomains", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(36);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(36);
    });

    it("returns relationshipsCreated for subdomains", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(30);
    });

    it("MERGE query includes HAS_SUBDOMAIN relationship", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const subQuery = queries.find((q) => q.includes("ACGME_Subdomain"))!;
      expect(subQuery).toContain(
        "MATCH (d:ACGME_Domain {code: $parent_domain})",
      );
      expect(subQuery).toContain("MERGE (d)-[:HAS_SUBDOMAIN]->(s)");
    });
  });

  describe("verify()", () => {
    it("passes when counts match", async () => {
      const driver = makeVerifyDriver([6, 30, 0]);
      const s = new ACGMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.actualCount).toBe(36);
    });

    it("fails when subdomain count is wrong", async () => {
      const driver = makeVerifyDriver([6, 20, 0]);
      const s = new ACGMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });
  });

  describe("data integrity", () => {
    it("has 6 domains with unique codes", () => {
      expect(ACGME_DOMAINS).toHaveLength(6);
      const codes = ACGME_DOMAINS.map((d) => d.code);
      expect(new Set(codes).size).toBe(6);
    });

    it("has 30 subdomains with unique codes", () => {
      expect(ACGME_SUBDOMAINS).toHaveLength(30);
      const codes = ACGME_SUBDOMAINS.map((s) => s.code);
      expect(new Set(codes).size).toBe(30);
    });

    it("every subdomain references a valid domain code", () => {
      const domainCodes = new Set(ACGME_DOMAINS.map((d) => d.code));
      for (const sub of ACGME_SUBDOMAINS) {
        expect(domainCodes.has(sub.parent_domain)).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════
// AAMC Seeder
// ═══════════════════════════════════════════════════
describe("AAMCSeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: AAMCSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new AAMCSeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("aamc");
      expect(seeder.label).toBe("AAMC_Domain");
    });
  });

  describe("seed()", () => {
    it("creates 8 AAMC_Domain nodes", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(8);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(8);
    });

    it("returns 0 relationshipsCreated (flat structure)", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(0);
    });
  });

  describe("verify()", () => {
    it("passes when count matches", async () => {
      const driver = makeVerifyDriver([8]);
      const s = new AAMCSeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.actualCount).toBe(8);
    });

    it("fails when count is wrong", async () => {
      const driver = makeVerifyDriver([5]);
      const s = new AAMCSeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });
  });

  describe("data integrity", () => {
    it("has 8 domains with unique codes", () => {
      expect(AAMC_DOMAINS).toHaveLength(8);
      const codes = AAMC_DOMAINS.map((d) => d.code);
      expect(new Set(codes).size).toBe(8);
    });

    it("all nodes have framework = aamc", () => {
      for (const d of AAMC_DOMAINS) {
        expect(d.framework).toBe("aamc");
      }
    });
  });
});

// ═══════════════════════════════════════════════════
// UME Seeder
// ═══════════════════════════════════════════════════
describe("UMESeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: UMESeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new UMESeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("ume");
      expect(seeder.label).toBe("UME_Competency");
    });
  });

  describe("seed()", () => {
    it("calls executeBatch for competencies and subcompetencies", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(55);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(55);
    });

    it("returns relationshipsCreated for both levels", async () => {
      const result = await seeder.seed();
      // 6 ALIGNS_WITH + 49 HAS_SUBCOMPETENCY
      expect(result.relationshipsCreated).toBe(55);
    });

    it("MERGE query includes ALIGNS_WITH to ACGME_Domain", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const compQuery = queries.find((q) => q.includes("UME_Competency"))!;
      expect(compQuery).toContain(
        "MATCH (d:ACGME_Domain {code: $aligns_with})",
      );
      expect(compQuery).toContain("MERGE (n)-[:ALIGNS_WITH]->(d)");
    });

    it("MERGE query includes HAS_SUBCOMPETENCY relationship", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const subQuery = queries.find((q) => q.includes("UME_Subcompetency"))!;
      expect(subQuery).toContain(
        "MATCH (c:UME_Competency {code: $parent_code})",
      );
      expect(subQuery).toContain("MERGE (c)-[:HAS_SUBCOMPETENCY]->(s)");
    });
  });

  describe("verify()", () => {
    it("passes when counts match", async () => {
      const driver = makeVerifyDriver([6, 49, 0]);
      const s = new UMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.actualCount).toBe(55);
    });

    it("fails when orphans exist", async () => {
      const driver = makeVerifyDriver([6, 49, 3]);
      const s = new UMESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
      expect(result.orphanCount).toBe(3);
    });
  });

  describe("data integrity", () => {
    it("has 6 competencies with unique codes", () => {
      expect(UME_COMPETENCIES).toHaveLength(6);
      const codes = UME_COMPETENCIES.map((c) => c.code);
      expect(new Set(codes).size).toBe(6);
    });

    it("has 49 subcompetencies with unique codes", () => {
      expect(UME_SUBCOMPETENCIES).toHaveLength(49);
      const codes = UME_SUBCOMPETENCIES.map((s) => s.code);
      expect(new Set(codes).size).toBe(49);
    });

    it("every subcompetency references a valid competency code", () => {
      const compCodes = new Set(UME_COMPETENCIES.map((c) => c.code));
      for (const sub of UME_SUBCOMPETENCIES) {
        expect(compCodes.has(sub.parent_code)).toBe(true);
      }
    });

    it("every competency has an aligns_with mapping to ACGME", () => {
      for (const comp of UME_COMPETENCIES) {
        expect(comp.aligns_with).toMatch(/^acgme-dom-\d+$/);
      }
    });

    it("all 6 ACGME domain codes are referenced", () => {
      const alignedCodes = new Set(UME_COMPETENCIES.map((c) => c.aligns_with));
      expect(alignedCodes.size).toBe(6);
    });
  });
});

// ═══════════════════════════════════════════════════
// EPA Seeder
// ═══════════════════════════════════════════════════
describe("EPASeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: EPASeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new EPASeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("epa");
      expect(seeder.label).toBe("EPA");
    });
  });

  describe("seed()", () => {
    it("creates 13 EPA nodes", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(13);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(13);
    });

    it("returns 0 relationshipsCreated (flat structure)", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(0);
    });
  });

  describe("verify()", () => {
    it("passes when count matches", async () => {
      const driver = makeVerifyDriver([13]);
      const s = new EPASeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
    });

    it("fails when count is wrong", async () => {
      const driver = makeVerifyDriver([10]);
      const s = new EPASeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });
  });

  describe("data integrity", () => {
    it("has 13 EPAs with unique numbers", () => {
      expect(EPA_ACTIVITIES).toHaveLength(13);
      const numbers = EPA_ACTIVITIES.map((e) => e.number);
      expect(new Set(numbers).size).toBe(13);
    });

    it("numbers are sequential 1-13", () => {
      for (let i = 0; i < EPA_ACTIVITIES.length; i++) {
        expect(EPA_ACTIVITIES[i]!.number).toBe(i + 1);
      }
    });

    it("all nodes have framework = epa", () => {
      for (const e of EPA_ACTIVITIES) {
        expect(e.framework).toBe("epa");
      }
    });
  });
});

// ═══════════════════════════════════════════════════
// Bloom Seeder
// ═══════════════════════════════════════════════════
describe("BloomSeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: BloomSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new BloomSeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("bloom");
      expect(seeder.label).toBe("BloomLevel");
    });
  });

  describe("seed()", () => {
    it("creates 6 BloomLevel nodes", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(6);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(6);
    });

    it("returns 0 relationshipsCreated (flat structure)", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(0);
    });

    it("MERGE query stores action_verbs array", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const bloomQuery = queries[0]!;
      expect(bloomQuery).toContain("n.action_verbs = $action_verbs");
    });
  });

  describe("verify()", () => {
    it("passes when count matches", async () => {
      const driver = makeVerifyDriver([6]);
      const s = new BloomSeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
    });
  });

  describe("data integrity", () => {
    it("has 6 levels with unique level numbers", () => {
      expect(BLOOM_LEVELS).toHaveLength(6);
      const levels = BLOOM_LEVELS.map((l) => l.level);
      expect(new Set(levels).size).toBe(6);
    });

    it("levels are sequential 1-6", () => {
      for (let i = 0; i < BLOOM_LEVELS.length; i++) {
        expect(BLOOM_LEVELS[i]!.level).toBe(i + 1);
      }
    });

    it("every level has action_verbs array", () => {
      for (const level of BLOOM_LEVELS) {
        expect(Array.isArray(level.action_verbs)).toBe(true);
        expect(level.action_verbs.length).toBeGreaterThan(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════
// Miller Seeder
// ═══════════════════════════════════════════════════
describe("MillerSeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: MillerSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new MillerSeeder(mockDriver as unknown as Driver);
  });

  describe("construction", () => {
    it("has correct name and label", () => {
      expect(seeder.name).toBe("miller");
      expect(seeder.label).toBe("MillerLevel");
    });
  });

  describe("seed()", () => {
    it("creates 4 MillerLevel nodes", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      expect(tx.run).toHaveBeenCalledTimes(4);
    });

    it("returns correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(4);
    });

    it("returns 0 relationshipsCreated (flat structure)", async () => {
      const result = await seeder.seed();
      expect(result.relationshipsCreated).toBe(0);
    });

    it("MERGE query stores assessment_methods array", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const millerQuery = queries[0]!;
      expect(millerQuery).toContain(
        "n.assessment_methods = $assessment_methods",
      );
    });
  });

  describe("verify()", () => {
    it("passes when count matches", async () => {
      const driver = makeVerifyDriver([4]);
      const s = new MillerSeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
    });

    it("fails when count is wrong", async () => {
      const driver = makeVerifyDriver([2]);
      const s = new MillerSeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });
  });

  describe("data integrity", () => {
    it("has 4 levels with unique level numbers", () => {
      expect(MILLER_LEVELS).toHaveLength(4);
      const levels = MILLER_LEVELS.map((l) => l.level);
      expect(new Set(levels).size).toBe(4);
    });

    it("levels are sequential 1-4", () => {
      for (let i = 0; i < MILLER_LEVELS.length; i++) {
        expect(MILLER_LEVELS[i]!.level).toBe(i + 1);
      }
    });

    it("every level has assessment_methods array", () => {
      for (const level of MILLER_LEVELS) {
        expect(Array.isArray(level.assessment_methods)).toBe(true);
        expect(level.assessment_methods.length).toBeGreaterThan(0);
      }
    });
  });
});
