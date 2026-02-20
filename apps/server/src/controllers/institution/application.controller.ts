import { Request, Response } from "express";
import type {
  ApiResponse,
  WaitlistApplicationResponse,
} from "@journey-os/types";
import { ApplicationService } from "../../services/institution/application.service";
import {
  DuplicateApplicationError,
  InvalidApplicationError,
} from "../../errors/application.error";

export class ApplicationController {
  readonly #applicationService: ApplicationService;

  constructor(applicationService: ApplicationService) {
    this.#applicationService = applicationService;
  }

  async handleSubmit(req: Request, res: Response): Promise<void> {
    try {
      const {
        institution_name,
        institution_type,
        accreditation_body,
        contact_name,
        contact_email,
        contact_phone,
        student_count,
        website_url,
        reason,
      } = req.body;

      if (
        !institution_name ||
        !institution_type ||
        !accreditation_body ||
        !contact_name ||
        !contact_email
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
        typeof contact_email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email.trim())
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

      const result = await this.#applicationService.submit(
        {
          institution_name,
          institution_type,
          accreditation_body,
          contact_name,
          contact_email,
          contact_phone: contact_phone ?? "",
          student_count:
            typeof student_count === "number"
              ? student_count
              : parseInt(student_count, 10),
          website_url: website_url ?? "",
          reason: reason ?? "",
        },
        ipAddress,
      );

      const body: ApiResponse<WaitlistApplicationResponse> = {
        data: result,
        error: null,
      };
      res.status(201).json(body);
    } catch (error: unknown) {
      if (error instanceof DuplicateApplicationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(409).json(body);
        return;
      }

      if (error instanceof InvalidApplicationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
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
}
