import {
  AuthRole,
  AuthTokenPayload,
  PermissionMatrix,
  PermissionCheckResult,
  Resource,
  ResourceAction,
} from "@journey-os/types";

/** Declarative permission matrix — data, not code. */
export const PERMISSION_MATRIX: PermissionMatrix = {
  waitlist: {
    list: { roles: [AuthRole.SUPERADMIN] },
    approve: { roles: [AuthRole.SUPERADMIN] },
  },
  institutions: {
    list: { roles: [AuthRole.SUPERADMIN] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    create: { roles: [AuthRole.SUPERADMIN] },
    update: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
  },
  users: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    update: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    create: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
  },
  courses: {
    list: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      ],
    },
    read: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.STUDENT,
      ],
    },
    create: {
      roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN],
      requireCourseDirector: true,
    },
    update: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      ],
    },
  },
  generation: {
    create: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      ],
    },
    bulk_generate: {
      roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN],
      requireCourseDirector: true,
    },
  },
  frameworks: {
    list: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      ],
    },
    read: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      ],
    },
  },
  notifications: {
    list: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.ADVISOR,
        AuthRole.STUDENT,
      ],
    },
    read: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.ADVISOR,
        AuthRole.STUDENT,
      ],
    },
  },
  analytics: {
    read: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.ADVISOR,
      ],
    },
  },
  students: {
    list: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.ADVISOR,
      ],
    },
    read: {
      roles: [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
        AuthRole.ADVISOR,
      ],
    },
  },
};

export class RbacService {
  readonly #matrix: PermissionMatrix;

  constructor(matrix: PermissionMatrix = PERMISSION_MATRIX) {
    this.#matrix = matrix;
  }

  /** Check if a role is in the allowed list. SuperAdmin always passes. */
  checkRole(
    userRole: AuthRole,
    allowedRoles: readonly AuthRole[],
  ): PermissionCheckResult {
    if (userRole === AuthRole.SUPERADMIN) {
      return { allowed: true };
    }
    if (allowedRoles.includes(userRole)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Access denied: role '${userRole}' is not authorized for this resource. Required: [${allowedRoles.map((r) => `'${r}'`).join(", ")}]`,
    };
  }

  /** Check institution scope. SuperAdmin bypasses. */
  checkInstitutionScope(
    user: AuthTokenPayload,
    resourceInstitutionId: string,
  ): PermissionCheckResult {
    if (user.role === AuthRole.SUPERADMIN) {
      return { allowed: true };
    }
    if (user.institution_id === resourceInstitutionId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason:
        "Access denied: you cannot access resources outside your institution",
    };
  }

  /** Check course director privilege. SuperAdmin and InstitutionalAdmin bypass. */
  checkCourseDirector(user: AuthTokenPayload): PermissionCheckResult {
    if (
      user.role === AuthRole.SUPERADMIN ||
      user.role === AuthRole.INSTITUTIONAL_ADMIN
    ) {
      return { allowed: true };
    }
    if (user.role === AuthRole.FACULTY && user.is_course_director) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Access denied: this action requires course director privileges",
    };
  }

  /** Lookup a permission from the matrix. */
  getPermission(resource: Resource, action: ResourceAction) {
    return this.#matrix[resource]?.[action];
  }
}
