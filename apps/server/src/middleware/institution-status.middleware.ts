import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../config/supabase.config";
import { InstitutionSuspendedError } from "../errors/institution-lifecycle.error";
import type { ApiResponse } from "@journey-os/types";

/**
 * Middleware that blocks API access for users whose institution is suspended.
 * Runs AFTER AuthMiddleware (needs req.user) and BEFORE route handlers.
 * SuperAdmin users (no institution_id) skip this check.
 */
export class InstitutionStatusMiddleware {
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    const user = (req as unknown as Record<string, unknown>).user as
      | { institution_id?: string; role?: string }
      | undefined;

    // No user attached yet (shouldn't happen after AuthMiddleware, but be safe)
    if (!user) {
      next();
      return;
    }

    // SuperAdmin users have no institution_id — skip check
    if (!user.institution_id) {
      next();
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: institution, error } = await supabase
        .from("institutions")
        .select("status")
        .eq("id", user.institution_id)
        .single();

      if (error || !institution) {
        // Institution not found — let downstream handle it
        next();
        return;
      }

      if (institution.status === "suspended") {
        const suspendedError = new InstitutionSuspendedError();
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: suspendedError.code,
            message: suspendedError.message,
          },
        };
        res.status(403).json(body);
        return;
      }

      next();
    } catch {
      // Don't block users on middleware failure — let request through
      next();
    }
  }
}

/**
 * Factory function: creates an institution status middleware handler.
 */
export function createInstitutionStatusMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> {
  const middleware = new InstitutionStatusMiddleware();
  return (req: Request, res: Response, next: NextFunction) =>
    middleware.handle(req, res, next);
}
