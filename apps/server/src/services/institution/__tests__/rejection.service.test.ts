import { describe, it, expect, vi, beforeEach } from "vitest";
import { RejectionService } from "../rejection.service";
import { ApplicationNotFoundError } from "../../../errors/application.error";
import {
  ApplicationAlreadyProcessedError,
  RejectionReasonRequiredError,
} from "../../../errors/rejection.error";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RejectionEmailProvider } from "../../email/rejection-email.service";

const MOCK_PENDING_APP = {
  id: "app-1",
  institution_name: "Example Medical School",
  institution_type: "md",
  contact_name: "Dr. John Doe",
  contact_email: "jdoe@example.edu",
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const VALID_REASON =
  "Institution does not meet minimum accreditation requirements. Please reapply after obtaining LCME provisional accreditation.";

function createMockSupabaseClient(overrides?: {
  selectSingle?: ReturnType<typeof vi.fn>;
  updateEq?: ReturnType<typeof vi.fn>;
}) {
  const selectSingle =
    overrides?.selectSingle ??
    vi.fn().mockResolvedValue({
      data: MOCK_PENDING_APP,
      error: null,
    });

  const updateEq =
    overrides?.updateEq ??
    vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: selectSingle,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: updateEq,
        }),
      }),
    })),
  } as unknown as SupabaseClient;
}

function createMockEmailService(): RejectionEmailProvider {
  return {
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
}

describe("RejectionService", () => {
  let service: RejectionService;
  let mockClient: SupabaseClient;
  let mockEmail: RejectionEmailProvider;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    mockEmail = createMockEmailService();
    service = new RejectionService(mockClient, mockEmail);
  });

  it("rejects a pending application and returns result", async () => {
    const result = await service.reject("app-1", VALID_REASON, "sa-uuid-1");

    expect(result.application_id).toBe("app-1");
    expect(result.institution_name).toBe("Example Medical School");
    expect(result.status).toBe("rejected");
    expect(result.rejection_reason).toBe(VALID_REASON);
    expect(result.rejected_by).toBe("sa-uuid-1");
    expect(result.rejected_at).toBeDefined();
  });

  it("calls rejection email service with applicant details", async () => {
    await service.reject("app-1", VALID_REASON, "sa-uuid-1");

    expect(mockEmail.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        contactEmail: "jdoe@example.edu",
        contactName: "Dr. John Doe",
        institutionName: "Example Medical School",
        rejectionReason: VALID_REASON,
      }),
    );
  });

  it("throws ApplicationAlreadyProcessedError when status is not pending", async () => {
    const client = createMockSupabaseClient({
      selectSingle: vi.fn().mockResolvedValue({
        data: { ...MOCK_PENDING_APP, status: "approved" },
        error: null,
      }),
    });
    const svc = new RejectionService(client, createMockEmailService());

    await expect(
      svc.reject("app-1", VALID_REASON, "sa-uuid-1"),
    ).rejects.toThrow(ApplicationAlreadyProcessedError);
  });

  it("throws RejectionReasonRequiredError when reason is too short", async () => {
    await expect(service.reject("app-1", "No.", "sa-uuid-1")).rejects.toThrow(
      RejectionReasonRequiredError,
    );
  });

  it("throws RejectionReasonRequiredError when reason is only whitespace", async () => {
    await expect(
      service.reject("app-1", "          ", "sa-uuid-1"),
    ).rejects.toThrow(RejectionReasonRequiredError);
  });

  it("throws ApplicationNotFoundError when application does not exist", async () => {
    const client = createMockSupabaseClient({
      selectSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });
    const svc = new RejectionService(client, createMockEmailService());

    await expect(
      svc.reject("nonexistent", VALID_REASON, "sa-uuid-1"),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it("succeeds even if email sending fails (best-effort)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingEmail: RejectionEmailProvider = {
      sendNotification: vi.fn().mockRejectedValue(new Error("SMTP down")),
    };
    const svc = new RejectionService(mockClient, failingEmail);

    const result = await svc.reject("app-1", VALID_REASON, "sa-uuid-1");

    expect(result.application_id).toBe("app-1");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
