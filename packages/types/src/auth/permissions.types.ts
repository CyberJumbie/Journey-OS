import { AuthRole } from "./roles.types";
import { Resource, ResourceAction } from "./rbac.types";

/**
 * The full permission matrix type.
 * Keyed by resource, then by action, yielding the allowed roles.
 */
export type PermissionMatrix = {
  readonly [R in Resource]?: {
    readonly [A in ResourceAction]?: {
      readonly roles: readonly AuthRole[];
      readonly requireCourseDirector?: boolean;
    };
  };
};
