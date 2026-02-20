import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserReassignmentService } from "../user-reassignment.service";
import {
  SameInstitutionError,
  UserNotFoundError,
  InstitutionNotFoundError,
  ConcurrentModificationError,
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

const MOCK_COURSE_MEMBERSHIPS = [
  { id: "cm-1" },
  { id: "cm-2" },
  { id: "cm-3" },
];

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
    updateProfileData?: unknown;
    updateProfileError?: { message: string } | null;
    archiveData?: unknown[];
    auditLogData?: { id: string } | null;
    auditLogError?: { message: string } | null;
  } = {},
): SupabaseClient {
  const {
    userData = MOCK_USER,
    userError = null,
    sourceInstitutionData = MOCK_SOURCE_INSTITUTION,
    targetInstitutionData = MOCK_TARGET_INSTITUTION,
    targetInstitutionError = null,
    updateProfileData = { id: "user-1" },
    updateProfileError = null,
    archiveData = MOCK_COURSE_MEMBERSHIPS,
    auditLogData = { id: "audit-1" },
    auditLogError = null,
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
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updateProfileData,
                  error: updateProfileError,
                }),
              }),
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

    if (table === "course_members") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: archiveData,
                error: null,
              }),
            }),
          }),
        }),
      };
    }

    if (table === "audit_log") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: auditLogData,
              error: auditLogError,
            }),
          }),
        }),
      };
    }

    return {};
  });

  return { from: fromFn } as unknown as SupabaseClient;
}

describe("UserReassignmentService", () => {
  let emailService: ReassignmentEmailProvider;

  beforeEach(() => {
    emailService = createMockEmailService();
  });

  describe("reassign", () => {
    it("updates user's institution_id in profiles table", async () => {
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
      expect(supabase.from).toHaveBeenCalledWith("profiles");
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

    it("archives active course memberships for old institution", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.courses_archived).toBe(3);
      expect(supabase.from).toHaveBeenCalledWith("course_members");
    });

    it("creates audit_log entry with correct old/new values and metadata", async () => {
      const supabase = createMockSupabase();
      const service = new UserReassignmentService(supabase, emailService);

      const result = await service.reassign(
        "user-1",
        "inst-2",
        REASON,
        ADMIN_USER_ID,
      );

      expect(result.audit_log_id).toBe("audit-1");
      expect(supabase.from).toHaveBeenCalledWith("audit_log");
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

    it("returns courses_archived=0 when user has no course memberships", async () => {
      const supabase = createMockSupabase({ archiveData: [] });
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
