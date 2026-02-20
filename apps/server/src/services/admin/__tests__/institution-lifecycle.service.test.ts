import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionLifecycleService } from "../institution-lifecycle.service";
import {
  InstitutionAlreadySuspendedError,
  InstitutionNotSuspendedError,
  SuspendReasonRequiredError,
} from "../../../errors/institution-lifecycle.error";
import { InstitutionNotFoundError } from "../../../errors/registration.error";

function createMockSupabase() {
  const selectSingleChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  };

  const fromMap: Record<string, unknown> = {};

  const client = {
    from: vi.fn((table: string) => {
      if (fromMap[table]) return fromMap[table];
      return selectSingleChain;
    }),
  };

  return {
    client,
    selectSingleChain,
    updateChain,
    insertChain,
    countChain,
    fromMap,
  };
}

const MOCK_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  status: "approved",
};

const MOCK_SUSPENDED_INSTITUTION = {
  ...MOCK_INSTITUTION,
  status: "suspended",
};

describe("InstitutionLifecycleService", () => {
  describe("suspend", () => {
    it("updates institution status to 'suspended' in Supabase", async () => {
      const mock = createMockSupabase();

      // institutions.select (get institution)
      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_INSTITUTION, error: null }),
      };

      // institutions.update
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({
            data: { ...MOCK_INSTITUTION, status: "suspended" },
            error: null,
          }),
      };

      // institution_status_changes.insert
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "change-1" }, error: null }),
      };

      // profiles.select (count)
      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 450, error: null }),
      };

      let institutionsCallCount = 0;
      mock.client.from.mockImplementation((table: string) => {
        if (table === "institutions") {
          institutionsCallCount++;
          return institutionsCallCount === 1 ? getChain : updateChain;
        }
        if (table === "institution_status_changes") return insertChain;
        if (table === "profiles") return countChain;
        return getChain;
      });

      const service = new InstitutionLifecycleService(mock.client as never);

      const result = await service.suspend(
        "inst-1",
        "Policy violation: unauthorized sharing of content.",
        "sa-uuid-1",
      );

      expect(result.to_status).toBe("suspended");
      expect(result.from_status).toBe("approved");
      expect(result.institution_name).toBe("Morehouse School of Medicine");
    });

    it("creates audit record in institution_status_changes", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_INSTITUTION, error: null }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "change-1" }, error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      };

      let institutionsCallCount = 0;
      mock.client.from.mockImplementation((table: string) => {
        if (table === "institutions") {
          institutionsCallCount++;
          return institutionsCallCount === 1 ? getChain : updateChain;
        }
        if (table === "institution_status_changes") return insertChain;
        if (table === "profiles") return countChain;
        return getChain;
      });

      const service = new InstitutionLifecycleService(mock.client as never);

      await service.suspend(
        "inst-1",
        "Security breach investigation.",
        "sa-uuid-1",
      );

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: "inst-1",
          from_status: "approved",
          to_status: "suspended",
          reason: "Security breach investigation.",
          actor_id: "sa-uuid-1",
        }),
      );
    });

    it("counts affected users for the institution", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_INSTITUTION, error: null }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "change-1" }, error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 250, error: null }),
      };

      let institutionsCallCount = 0;
      mock.client.from.mockImplementation((table: string) => {
        if (table === "institutions") {
          institutionsCallCount++;
          return institutionsCallCount === 1 ? getChain : updateChain;
        }
        if (table === "institution_status_changes") return insertChain;
        if (table === "profiles") return countChain;
        return getChain;
      });

      const service = new InstitutionLifecycleService(mock.client as never);

      const result = await service.suspend(
        "inst-1",
        "Policy violation: unauthorized sharing.",
        "sa-uuid-1",
      );

      expect(result.affected_users).toBe(250);
    });

    it("throws SuspendReasonRequiredError for short reason", async () => {
      const mock = createMockSupabase();
      const service = new InstitutionLifecycleService(mock.client as never);

      await expect(
        service.suspend("inst-1", "Short", "sa-uuid-1"),
      ).rejects.toThrow(SuspendReasonRequiredError);
    });

    it("throws InstitutionAlreadySuspendedError for suspended institution", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_SUSPENDED_INSTITUTION, error: null }),
      };

      mock.client.from.mockReturnValue(getChain);

      const service = new InstitutionLifecycleService(mock.client as never);

      await expect(
        service.suspend("inst-1", "Already suspended test.", "sa-uuid-1"),
      ).rejects.toThrow(InstitutionAlreadySuspendedError);
    });

    it("throws InstitutionNotFoundError for non-existent institution", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };

      mock.client.from.mockReturnValue(getChain);

      const service = new InstitutionLifecycleService(mock.client as never);

      await expect(
        service.suspend("inst-999", "Non-existent institution.", "sa-uuid-1"),
      ).rejects.toThrow(InstitutionNotFoundError);
    });
  });

  describe("reactivate", () => {
    it("updates institution status to 'approved' in Supabase", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_SUSPENDED_INSTITUTION, error: null }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({
            data: { ...MOCK_SUSPENDED_INSTITUTION, status: "approved" },
            error: null,
          }),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "change-2" }, error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 450, error: null }),
      };

      let institutionsCallCount = 0;
      mock.client.from.mockImplementation((table: string) => {
        if (table === "institutions") {
          institutionsCallCount++;
          return institutionsCallCount === 1 ? getChain : updateChain;
        }
        if (table === "institution_status_changes") return insertChain;
        if (table === "profiles") return countChain;
        return getChain;
      });

      const service = new InstitutionLifecycleService(mock.client as never);

      const result = await service.reactivate(
        "inst-1",
        "Compliance verified.",
        "sa-uuid-1",
      );

      expect(result.from_status).toBe("suspended");
      expect(result.to_status).toBe("approved");
    });

    it("creates audit record in institution_status_changes", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_SUSPENDED_INSTITUTION, error: null }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "change-2" }, error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      };

      let institutionsCallCount = 0;
      mock.client.from.mockImplementation((table: string) => {
        if (table === "institutions") {
          institutionsCallCount++;
          return institutionsCallCount === 1 ? getChain : updateChain;
        }
        if (table === "institution_status_changes") return insertChain;
        if (table === "profiles") return countChain;
        return getChain;
      });

      const service = new InstitutionLifecycleService(mock.client as never);

      await service.reactivate("inst-1", "Review complete.", "sa-uuid-1");

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: "inst-1",
          from_status: "suspended",
          to_status: "approved",
          reason: "Review complete.",
          actor_id: "sa-uuid-1",
        }),
      );
    });

    it("throws InstitutionNotSuspendedError for active institution", async () => {
      const mock = createMockSupabase();

      const getChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: MOCK_INSTITUTION, error: null }),
      };

      mock.client.from.mockReturnValue(getChain);

      const service = new InstitutionLifecycleService(mock.client as never);

      await expect(
        service.reactivate("inst-1", null, "sa-uuid-1"),
      ).rejects.toThrow(InstitutionNotSuspendedError);
    });
  });
});
