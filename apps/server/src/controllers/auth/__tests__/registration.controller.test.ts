import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { RegistrationController } from "../registration.controller";
import { RegistrationService } from "../../../services/auth/registration.service";
import {
  DuplicateEmailError,
  InvalidRegistrationError,
} from "../../../errors/registration.error";
import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_BODY = {
  role: "student",
  email: "student@msm.edu",
  password: "Passw0rd1",
  display_name: "Test Student",
  institution_id: "inst-001",
  consented: true,
  consent_version: "1.0",
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(body: Record<string, unknown> = {}): Request {
  return {
    body,
    ip: "127.0.0.1",
    headers: {},
  } as unknown as Request;
}

describe("RegistrationController", () => {
  let controller: RegistrationController;
  let mockService: RegistrationService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockService = {
      register: vi.fn().mockResolvedValue({
        user_id: "user-001",
        email: "student@msm.edu",
        requires_verification: true,
      }),
    } as unknown as RegistrationService;

    mockSupabase = {} as unknown as SupabaseClient;
    controller = new RegistrationController(mockService, mockSupabase);
  });

  it("returns 201 on successful registration", async () => {
    const req = createMockRequest(VALID_BODY);
    const res = createMockResponse();

    await controller.handleRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: "user-001" }),
        error: null,
      }),
    );
  });

  it("returns 400 on missing required fields", async () => {
    const req = createMockRequest({ email: "test@test.edu" });
    const res = createMockResponse();

    await controller.handleRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
      }),
    );
  });

  it("returns 400 on invalid email format", async () => {
    const req = createMockRequest({ ...VALID_BODY, email: "not-an-email" });
    const res = createMockResponse();

    await controller.handleRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: "Invalid email format" }),
      }),
    );
  });

  it("returns 409 on duplicate email", async () => {
    (mockService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DuplicateEmailError(),
    );

    const req = createMockRequest(VALID_BODY);
    const res = createMockResponse();

    await controller.handleRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "DUPLICATE_EMAIL" }),
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    (mockService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Something broke"),
    );

    const req = createMockRequest(VALID_BODY);
    const res = createMockResponse();

    await controller.handleRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
      }),
    );
  });
});
