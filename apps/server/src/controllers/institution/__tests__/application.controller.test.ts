import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { ApplicationController } from "../application.controller";
import { ApplicationService } from "../../../services/institution/application.service";
import {
  DuplicateApplicationError,
  InvalidApplicationError,
} from "../../../errors/application.error";

const VALID_BODY = {
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(
  body: Record<string, unknown> = {},
  ip = "127.0.0.1",
): Request {
  return {
    body,
    ip,
    headers: {},
  } as unknown as Request;
}

describe("ApplicationController", () => {
  let controller: ApplicationController;
  let mockService: ApplicationService;

  beforeEach(() => {
    mockService = {
      submit: vi.fn().mockResolvedValue({
        id: "app-001",
        institution_name: "Morehouse School of Medicine",
        status: "pending",
        submitted_at: "2026-02-19T12:00:00Z",
      }),
    } as unknown as ApplicationService;

    controller = new ApplicationController(mockService);
  });

  describe("handleSubmit", () => {
    it("returns 201 on successful application submission", async () => {
      const req = createMockRequest(VALID_BODY);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "app-001",
            status: "pending",
          }),
          error: null,
        }),
      );
    });

    it("returns application id, name, status, and submitted_at", async () => {
      const req = createMockRequest(VALID_BODY);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      const responseData = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0].data;
      expect(responseData).toHaveProperty("id");
      expect(responseData).toHaveProperty("institution_name");
      expect(responseData).toHaveProperty("status");
      expect(responseData).toHaveProperty("submitted_at");
    });

    it("calls service with correct data and IP", async () => {
      const req = createMockRequest(VALID_BODY, "10.0.0.1");
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(mockService.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_name: "Morehouse School of Medicine",
          institution_type: "md",
          contact_email: "jsmith@msm.edu",
        }),
        "10.0.0.1",
      );
    });

    it("extracts IP from x-forwarded-for header", async () => {
      const req = createMockRequest(VALID_BODY);
      req.headers = { "x-forwarded-for": "203.0.113.50, 70.41.3.18" };
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(mockService.submit).toHaveBeenCalledWith(
        expect.anything(),
        "203.0.113.50",
      );
    });

    it("returns 400 when institution_name is missing", async () => {
      const req = createMockRequest({
        ...VALID_BODY,
        institution_name: "",
      });
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 400 when contact_email is missing", async () => {
      const req = createMockRequest({
        ...VALID_BODY,
        contact_email: "",
      });
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 on invalid email format", async () => {
      const req = createMockRequest({
        ...VALID_BODY,
        contact_email: "not-an-email",
      });
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "Invalid email format" }),
        }),
      );
    });

    it("returns 400 when service throws InvalidApplicationError", async () => {
      (mockService.submit as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvalidApplicationError(
          "Institution type must be one of: md, do, combined",
        ),
      );

      const req = createMockRequest(VALID_BODY);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 409 on duplicate application", async () => {
      (mockService.submit as ReturnType<typeof vi.fn>).mockRejectedValue(
        new DuplicateApplicationError(),
      );

      const req = createMockRequest(VALID_BODY);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "DUPLICATE_APPLICATION" }),
        }),
      );
    });

    it("returns 500 on unexpected error", async () => {
      (mockService.submit as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const req = createMockRequest(VALID_BODY);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });

    it("defaults optional fields to empty strings", async () => {
      const minimalBody = {
        institution_name: "Test School",
        institution_type: "do",
        accreditation_body: "AOA",
        contact_name: "Dr. Test",
        contact_email: "test@test.edu",
        student_count: 100,
      };

      const req = createMockRequest(minimalBody);
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(mockService.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_phone: "",
          website_url: "",
          reason: "",
        }),
        expect.any(String),
      );
    });

    it("parses student_count from string to number", async () => {
      const req = createMockRequest({
        ...VALID_BODY,
        student_count: "450",
      });
      const res = createMockResponse();

      await controller.handleSubmit(req, res);

      expect(mockService.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          student_count: 450,
        }),
        expect.any(String),
      );
    });
  });
});
