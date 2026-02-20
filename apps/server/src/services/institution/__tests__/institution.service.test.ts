import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionService } from "../institution.service";
import { ApplicationNotFoundError } from "../../../errors/application.error";
import {
  DuplicateApprovalError,
  DuplicateDomainError,
  InstitutionCreationError,
} from "../../../errors/institution.error";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailService } from "../../email/invitation-email.service";

const MOCK_PENDING_APPLICATION = {
  id: "app-1",
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
  status: "pending",
  submitted_ip: "192.168.1.1",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const APPROVER_ID = "sa-uuid-1";
const DOMAIN = "msm.edu";

function createMockEmailService(): EmailService {
  return {
    sendInvitation: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock SupabaseClient that handles the multi-table approval flow.
 * Tables: waitlist_applications (select, update), institutions (select, insert), invitations (insert)
 */
function createMockSupabase(
  overrides: {
    applicationData?: unknown;
    applicationError?: { message: string } | null;
    domainCheckData?: unknown;
    updateError?: { message: string } | null;
    institutionInsertData?: { id: string } | null;
    institutionInsertError?: { message: string } | null;
    invitationInsertData?: { id: string } | null;
    invitationInsertError?: { message: string } | null;
  } = {},
): SupabaseClient {
  const {
    applicationData = MOCK_PENDING_APPLICATION,
    applicationError = null,
    domainCheckData = null,
    updateError = null,
    institutionInsertData = { id: "inst-new-1" },
    institutionInsertError = null,
    invitationInsertData = { id: "inv-1" },
    invitationInsertError = null,
  } = overrides;

  const fromFn = vi.fn();

  fromFn.mockImplementation((table: string) => {
    if (table === "waitlist_applications") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({
                data: applicationData,
                error: applicationError,
              }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: updateError }),
          }),
        }),
      };
    }

    if (table === "institutions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: domainCheckData, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: institutionInsertData,
              error: institutionInsertError,
            }),
          }),
        }),
      };
    }

    if (table === "invitations") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: invitationInsertData,
              error: invitationInsertError,
            }),
          }),
        }),
      };
    }

    return {};
  });

  return { from: fromFn } as unknown as SupabaseClient;
}

describe("InstitutionService", () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = createMockEmailService();
  });

  describe("createFromApplication", () => {
    it("updates application status to approved with reviewed_by and reviewed_at", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionService(supabase, emailService);

      const result = await service.createFromApplication(
        "app-1",
        DOMAIN,
        APPROVER_ID,
      );

      expect(result.approved_by).toBe(APPROVER_ID);
      expect(result.approved_at).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith("waitlist_applications");
    });

    it("creates institution record with name, domain, type, accreditation_body", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionService(supabase, emailService);

      const result = await service.createFromApplication(
        "app-1",
        DOMAIN,
        APPROVER_ID,
      );

      expect(result.institution_id).toBe("inst-new-1");
      expect(result.institution_name).toBe("Morehouse School of Medicine");
      expect(result.institution_domain).toBe(DOMAIN);
      expect(supabase.from).toHaveBeenCalledWith("institutions");
    });

    it("creates invitation record with token, email, role=institutional_admin, expires in 7 days", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionService(supabase, emailService);

      const result = await service.createFromApplication(
        "app-1",
        DOMAIN,
        APPROVER_ID,
      );

      expect(result.invitation_id).toBe("inv-1");
      expect(result.invitation_email).toBe("jsmith@msm.edu");

      // Verify expiry is approximately 7 days from now
      const expiresAt = new Date(result.invitation_expires_at).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      expect(expiresAt).toBeGreaterThan(now + sevenDaysMs - 5000);
      expect(expiresAt).toBeLessThan(now + sevenDaysMs + 5000);

      expect(supabase.from).toHaveBeenCalledWith("invitations");
    });

    it("calls invitation email service with correct details", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionService(supabase, emailService);

      await service.createFromApplication("app-1", DOMAIN, APPROVER_ID);

      expect(emailService.sendInvitation).toHaveBeenCalledTimes(1);
      const call = (emailService.sendInvitation as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as Record<string, unknown>;
      expect(call.email).toBe("jsmith@msm.edu");
      expect(call.institutionName).toBe("Morehouse School of Medicine");
      expect(call.role).toBe("institutional_admin");
      expect(call.inviteLink).toMatch(/^\/invite\/accept\?token=.+/);
    });

    it("generates unique 48-char token for invitation", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionService(supabase, emailService);

      await service.createFromApplication("app-1", DOMAIN, APPROVER_ID);

      const call = (emailService.sendInvitation as ReturnType<typeof vi.fn>)
        .mock.calls[0]![0] as Record<string, unknown>;
      const inviteLink = call.inviteLink as string;
      const token = inviteLink.split("token=")[1];
      expect(token).toBeDefined();
      expect(token!.length).toBe(48);
    });

    it("throws DuplicateApprovalError when application status is not pending", async () => {
      const supabase = createMockSupabase({
        applicationData: { ...MOCK_PENDING_APPLICATION, status: "approved" },
      });
      const service = new InstitutionService(supabase, emailService);

      await expect(
        service.createFromApplication("app-1", DOMAIN, APPROVER_ID),
      ).rejects.toThrow(DuplicateApprovalError);
    });

    it("throws DuplicateDomainError when domain already exists", async () => {
      const supabase = createMockSupabase({
        domainCheckData: { id: "existing-inst" },
      });
      const service = new InstitutionService(supabase, emailService);

      await expect(
        service.createFromApplication("app-1", DOMAIN, APPROVER_ID),
      ).rejects.toThrow(DuplicateDomainError);
    });

    it("throws ApplicationNotFoundError when application does not exist", async () => {
      const supabase = createMockSupabase({
        applicationData: null,
        applicationError: { message: "Row not found" },
      });
      const service = new InstitutionService(supabase, emailService);

      await expect(
        service.createFromApplication("nonexistent", DOMAIN, APPROVER_ID),
      ).rejects.toThrow(ApplicationNotFoundError);
    });
  });
});
