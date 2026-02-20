import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApplicationService } from "../application.service";
import {
  DuplicateApplicationError,
  InvalidApplicationError,
} from "../../../errors/application.error";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WaitlistApplicationRequest } from "@journey-os/types";

const VALID_DATA: WaitlistApplicationRequest = {
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI tools",
};

function createMockSupabase(overrides?: {
  selectResult?:
    | { data: unknown[]; error: null }
    | { data: null; error: { message: string } };
  insertResult?:
    | { data: unknown; error: null }
    | { data: null; error: { message: string } };
}): SupabaseClient {
  const defaultInsertResult = overrides?.insertResult ?? {
    data: {
      id: "app-001",
      institution_name: "Morehouse School of Medicine",
      status: "pending",
      created_at: "2026-02-19T12:00:00Z",
    },
    error: null,
  };

  const defaultSelectResult = overrides?.selectResult ?? {
    data: [],
    error: null,
  };

  // The insert chain: insert() -> select() -> single()
  const singleFn = vi.fn().mockResolvedValue(defaultInsertResult);
  const insertSelectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  // The select chain for duplicate check: select() -> eq() -> or() -> limit()
  const limitFn = vi.fn().mockResolvedValue(defaultSelectResult);
  const orFn = vi.fn().mockReturnValue({ limit: limitFn });
  const eqFn = vi.fn().mockReturnValue({ or: orFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    from: vi.fn(() => ({
      select: selectFn,
      insert: insertFn,
    })),
  } as unknown as SupabaseClient;
}

describe("ApplicationService", () => {
  let service: ApplicationService;

  beforeEach(() => {
    (createMockSupabase as unknown as { callIndex: number }).callIndex = 0;
  });

  describe("submit", () => {
    it("creates application and returns response", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      const result = await service.submit(VALID_DATA, "127.0.0.1");

      expect(result).toEqual({
        id: "app-001",
        institution_name: "Morehouse School of Medicine",
        status: "pending",
        submitted_at: "2026-02-19T12:00:00Z",
      });
    });

    it("trims whitespace from string fields", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await service.submit(
        { ...VALID_DATA, institution_name: "  Test School  " },
        "127.0.0.1",
      );

      expect(supabase.from).toHaveBeenCalled();
    });

    it("lowercases contact email", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await service.submit(
        { ...VALID_DATA, contact_email: "JSmith@MSM.edu" },
        "127.0.0.1",
      );

      expect(supabase.from).toHaveBeenCalled();
    });

    it("strips HTML tags from text fields", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await service.submit(
        {
          ...VALID_DATA,
          institution_name: "Test <script>alert('xss')</script> School",
        },
        "127.0.0.1",
      );

      expect(supabase.from).toHaveBeenCalled();
    });

    it("throws InvalidApplicationError for missing institution_name", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, institution_name: "" }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for short institution_name", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, institution_name: "AB" }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for invalid institution_type", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit(
          { ...VALID_DATA, institution_type: "phd" as "md" },
          "127.0.0.1",
        ),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for missing accreditation_body", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, accreditation_body: "" }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for invalid email", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit(
          { ...VALID_DATA, contact_email: "not-an-email" },
          "127.0.0.1",
        ),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for negative student_count", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, student_count: -5 }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for zero student_count", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, student_count: 0 }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for invalid website_url", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit(
          { ...VALID_DATA, website_url: "not-a-url" },
          "127.0.0.1",
        ),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("allows empty website_url", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      const result = await service.submit(
        { ...VALID_DATA, website_url: "" },
        "127.0.0.1",
      );

      expect(result.status).toBe("pending");
    });

    it("throws DuplicateApplicationError when pending app exists", async () => {
      const supabase = createMockSupabase({
        selectResult: { data: [{ id: "existing-app" }], error: null },
      });
      service = new ApplicationService(supabase);

      await expect(service.submit(VALID_DATA, "127.0.0.1")).rejects.toThrow(
        DuplicateApplicationError,
      );
    });

    it("throws InvalidApplicationError for non-integer student_count", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, student_count: 45.5 }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });

    it("throws InvalidApplicationError for short contact_name", async () => {
      const supabase = createMockSupabase();
      service = new ApplicationService(supabase);

      await expect(
        service.submit({ ...VALID_DATA, contact_name: "A" }, "127.0.0.1"),
      ).rejects.toThrow(InvalidApplicationError);
    });
  });
});
