import { Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApiResponse,
  RegistrationResponse,
  InstitutionSearchResult,
} from "@journey-os/types";
import { RegistrationService } from "../../services/auth/registration.service";
import { ValidationError } from "../../errors/validation.error";
import {
  DuplicateEmailError,
  InvalidRegistrationError,
  InstitutionNotFoundError,
} from "../../errors/registration.error";

export class RegistrationController {
  readonly #registrationService: RegistrationService;
  readonly #supabaseClient: SupabaseClient;

  constructor(
    registrationService: RegistrationService,
    supabaseClient: SupabaseClient,
  ) {
    this.#registrationService = registrationService;
    this.#supabaseClient = supabaseClient;
  }

  async handleRegister(req: Request, res: Response): Promise<void> {
    try {
      const {
        role,
        email,
        password,
        display_name,
        institution_id,
        consented,
        consent_version,
      } = req.body;

      if (
        !role ||
        !email ||
        !password ||
        !display_name ||
        !institution_id ||
        consented === undefined ||
        !consent_version
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
          },
        };
        res.status(400).json(body);
        return;
      }

      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email format",
          },
        };
        res.status(400).json(body);
        return;
      }

      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.ip ||
        "127.0.0.1";

      const result = await this.#registrationService.register(
        {
          role,
          email,
          password,
          display_name,
          institution_id,
          consented,
          consent_version,
        },
        ipAddress,
      );

      const body: ApiResponse<RegistrationResponse> = {
        data: result,
        error: null,
      };
      res.status(201).json(body);
    } catch (error: unknown) {
      if (error instanceof DuplicateEmailError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(409).json(body);
        return;
      }

      if (
        error instanceof ValidationError ||
        error instanceof InvalidRegistrationError
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      if (error instanceof InstitutionNotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(404).json(body);
        return;
      }

      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }

  async handleInstitutionSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q;

      if (!query || typeof query !== "string" || query.trim().length < 2) {
        const body: ApiResponse<InstitutionSearchResult[]> = {
          data: [],
          error: null,
        };
        res.status(200).json(body);
        return;
      }

      const searchTerm = `%${query.trim()}%`;

      const { data: institutions, error } = await this.#supabaseClient
        .from("institutions")
        .select("id, name, domain")
        .eq("status", "approved")
        .or(`name.ilike.${searchTerm},domain.ilike.${searchTerm}`)
        .limit(10);

      if (error) {
        console.error(
          "[RegistrationController] Institution search error:",
          error.message,
        );
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to search institutions",
          },
        };
        res.status(500).json(body);
        return;
      }

      const body: ApiResponse<InstitutionSearchResult[]> = {
        data: institutions ?? [],
        error: null,
      };
      res.status(200).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }
}
