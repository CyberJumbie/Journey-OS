import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserReassignmentService } from "../user-reassignment.service";
import {
  SameInstitutionError,
  UserNotFoundError,
  InstitutionNotFoundError,
  ConcurrentModificationError,
  UserReassignmentError,
} from "../../../errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReassignmentEmailProvider } from "../../email/reassignment-email.service";

const MOCK_USER = {
  id: "user-1",
  email: "jsmith@msm.edu",
  full_name: "Dr. Jane Smith",
  institution_id: "inst-1",
  is_course_director: true,
  updated_at: "2026-02-19T10:00:00Z",
};

const MOCK_SOURCE_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  status: "approved",
};

const MOCK_TARGET_INSTITUTION = {
  id: "inst-2",
  name: "Howard University College of Medicine",
  status: "approved",
};

const ADMIN_USER_ID = "sa-uuid-1";
const REASON = "Faculty transfer to partner institution";

function createMockEmailService(): ReassignmentEmailProvider {
  return {
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockSupabase(
  overrides: {
    userData?: unknown;
    userError?: { message: string } | null;
    sourceInstitutionData?: unknown;
    targetInstitutionData?: unknown;
    targetInstitutionError?: { message: string } | null;
    rpcData?: { courses_archived: number; audit_log_id: string } | null;
    rpcError?: { message: string } | null;
  } = {},
): SupabaseClient {
  const {
    userData = MOCK_USER,
    userError = null,
    sourceInstitutionData = MOCK_SOURCE_INSTITUTION,
    targetInstitutionData = MOCK_TARGET_INSTITUTION,
    targetInstitutionError = null,
    rpcData = { courses_archived: 3, audit_log_id: "audit-1" },
    rpcError = null,
  } = overrides;

  const fromFn = vi.fn();
  let institutionCallCount = 0;

  fromFn.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: userData,
              error: userError,
            }),
          }),
        }),
      };
    }

    if (table === "institutions") {
      institutionCallCount++;
      const instData =
        institutionCallCount === 1
          ? sourceInstitutionData
          : targetInstitutionData;
      const instError =
        institutionCallCount === 1 ? null : targetInstitutionError;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: instData,
              error: instError,
            }),
          }),
        }),
      };
    }

    return {};
  });

  const rpcFn = vi.fn().mockResolvedValue({
    data: rpcData,
    error: rpcError,
  });

  return { from: fromFn, rpc: rpcFn } as unknown as SupabaseClient;
}

describe("UserReassignmentService", () => {
  let emailService: ReassignmentEmailProvider;

  beforeEach(() => {
    emailService = createMockEmailService();
  });

  describe("reassign", () => {
    it("updates user's institution_id via transactional RPC", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.to_institution_id).toBe("inst-2");
      expect(result.from_institution_id).toBe("inst-1");
      expect(supabase.rpc).toHaveBeenCalledWith("reassign_user", {
        p_user_id: "user-1",
        p_target_institution_id: "inst-2",
        p_expected_updated_at: "2026-02-19T10:00:00Z",
        p_admin_user_id: ADMIN_USER_ID,
        p_from_institution_id: "inst-1",
        p_from_institution_name: "Morehouse School of Medicine",
        p_to_institution_name: "Howard University College of Medicine",
        p_was_course_director: true,
        p_reason: REASON,
      });
    });

    it("resets is_course_director to false when user was CD", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.course_director_reset).toBe(true);
    });

    it("preserves is_course_director as false when user was not CD", async () => {
      const supabase = createMockSupabase({
        userData: { ...MOCK_USER, is_course_director: false },
      });
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.course_director_reset).toBe(false);
    });

    it("returns courses_archived count from RPC result", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.courses_archived).toBe(3);
    });

    it("returns audit_log_id from RPC result", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.audit_log_id).toBe("audit-1");
    });

    it("calls email service with notification details", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      await service.reassign("user-1", "inst-2", REASON, ADMIN_USER_ID);

      expect(emailService.sendNotification).toHaveBeenCalledTimes(1);
      const call = (emailService.sendNotification as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as Record<string, unknown>;
      expect(call.userEmail).toBe("jsmith@msm.edu");
      expect(call.userName).toBe("Dr. Jane Smith");
      expect(call.fromInstitutionName).toBe("Morehouse School of Medicine");
      expect(call.toInstitutionName).toBe(
        "Howard University College of Medicine",
      );
      expect(call.reason).toBe(REASON);
    });

    it("throws SameInstitutionError when target = current", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      await expect(
        service.reassign("user-1", "inst-1", REASON, ADMIN_USER_ID),
      ).rejects.toThrow(SameInstitutionError);
    });

    it("throws UserNotFoundError when user not found", async () => {
      const supabase = createMockSupabase({
        userData: null,
        userError: { message: "Row not found" },
      });
      const service = new UserReassignmentService(supabase, emailService);

      await expect(
        service.reassign("nonexistent", "inst-2", REASON, ADMIN_USER_ID),
      ).rejects.toThrow(UserNotFoundError);
    });

    it("throws InstitutionNotFoundError when target institution not found", async () => {
      const supabase = createMockSupabase({
        targetInstitutionData: null,
        targetInstitutionError: { message: "Row not found" },
      });
      const service = new UserReassignmentService(supabase, emailService);

      await expect(
        service.reassign("user-1", "inst-2", REASON, ADMIN_USER_ID),
      ).rejects.toThrow(InstitutionNotFoundError);
    });

    it("throws ConcurrentModificationError when RPC raises it", async () => {
      const supabase = createMockSupabase({
        rpcData: null,
        rpcError: { message: "CONCURRENT_MODIFICATION" },
      });
      const service = new UserReassignmentService(supabase, emailService);

      await expect(
        service.reassign("user-1", "inst-2", REASON, ADMIN_USER_ID),
      ).rejects.toThrow(ConcurrentModificationError);
    });

    it("throws UserReassignmentError for other RPC failures", async () => {
      const supabase = createMockSupabase({
        rpcData: null,
        rpcError: { message: "some database error" },
      });
      const service = new UserReassignmentService(supabase, emailService);

      await expect(
        service.reassign("user-1", "inst-2", REASON, ADMIN_USER_ID),
      ).rejects.toThrow(UserReassignmentError);
    });

    it("returns courses_archived=0 when RPC reports zero", async () => {
      const supabase = createMockSupabase({
        rpcData: { courses_archived: 0, audit_log_id: "audit-1" },
      });
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.courses_archived).toBe(0);
    });
  });
});
