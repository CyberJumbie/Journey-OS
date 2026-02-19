import { Request, Response, NextFunction } from "express";
import { AuthRole, ApiResponse, isAuthenticated } from "@journey-os/types";
import { RbacService } from "../services/auth/rbac.service";
import {
  ForbiddenError,
  InstitutionScopeError,
} from "../errors/forbidden.error";

export class RbacMiddleware {
  readonly #rbacService: RbacService;

  constructor(rbacService: RbacService) {
    this.#rbacService = rbacService;
  }

  /**
   * Returns middleware that checks user role against allowed roles.
   * SuperAdmin always passes.
   * Usage: rbac.require("superadmin", "institutional_admin")
   */
  require(...roles: AuthRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const result = this.#rbacService.checkRole(req.user.role, roles);
      if (!result.allowed) {
        this.#sendForbidden(
          res,
          new ForbiddenError(result.reason!, req.user.role, roles),
        );
        return;
      }

      next();
    };
  }

  /**
   * Returns middleware that checks role AND institution scope.
   * Reads institution_id from req.params.institutionId.
   * SuperAdmin bypasses institution check.
   * Usage: rbac.requireScoped("institutional_admin", "faculty")
   */
  requireScoped(...roles: AuthRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const roleResult = this.#rbacService.checkRole(req.user.role, roles);
      if (!roleResult.allowed) {
        this.#sendForbidden(
          res,
          new ForbiddenError(roleResult.reason!, req.user.role, roles),
        );
        return;
      }

      const resourceInstitutionId = req.params.institutionId;
      if (resourceInstitutionId) {
        const scopeResult = this.#rbacService.checkInstitutionScope(
          req.user,
          resourceInstitutionId,
        );
        if (!scopeResult.allowed) {
          this.#sendForbidden(
            res,
            new InstitutionScopeError(scopeResult.reason),
          );
          return;
        }
      }

      next();
    };
  }

  /**
   * Returns middleware that requires course director privileges.
   * Allows: SuperAdmin, InstitutionalAdmin, Faculty with is_course_director=true.
   * Usage: rbac.requireCourseDirector()
   */
  requireCourseDirector() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const result = this.#rbacService.checkCourseDirector(req.user);
      if (!result.allowed) {
        this.#sendForbidden(
          res,
          new ForbiddenError(result.reason!, req.user.role, []),
        );
        return;
      }

      next();
    };
  }

  #sendUnauthorized(res: Response): void {
    const body: ApiResponse<null> = {
      data: null,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
    res.status(401).json(body);
  }

  #sendForbidden(
    res: Response,
    error: ForbiddenError | InstitutionScopeError,
  ): void {
    const body: ApiResponse<null> = {
      data: null,
      error: { code: error.code, message: error.message },
    };
    res.status(403).json(body);
  }
}

/**
 * Factory function: creates an RbacMiddleware instance with default permission matrix.
 */
export function createRbacMiddleware(): RbacMiddleware {
  const rbacService = new RbacService();
  return new RbacMiddleware(rbacService);
}
