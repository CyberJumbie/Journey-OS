import { AuthRole } from "@journey-os/types";

/**
 * Maps each AuthRole to its dashboard base path.
 */
export const DASHBOARD_ROUTES: Record<AuthRole, string> = {
  [AuthRole.SUPERADMIN]: "/admin",
  [AuthRole.INSTITUTIONAL_ADMIN]: "/institution",
  [AuthRole.FACULTY]: "/faculty",
  [AuthRole.ADVISOR]: "/advisor",
  [AuthRole.STUDENT]: "/student",
};

/**
 * Routes accessible without authentication.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/apply",
  "/team",
];

/**
 * Routes that are part of the auth flow (login, register, etc.).
 * Authenticated users should be redirected away from these.
 */
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/team"];

/**
 * All dashboard base paths (values from DASHBOARD_ROUTES).
 */
const DASHBOARD_PATHS = Object.values(DASHBOARD_ROUTES);

/**
 * Returns the dashboard path for a given role.
 * Returns null if the role is not recognized.
 */
export function getDashboardPath(role: string): string | null {
  return DASHBOARD_ROUTES[role as AuthRole] ?? null;
}

/**
 * Checks if a path is publicly accessible (no auth required).
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Checks if a path is an auth route (login, register, forgot-password).
 * Authenticated users should be redirected away from these.
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Extracts the role that owns a given dashboard path.
 * Returns null if the path is not a dashboard route.
 */
export function getPathRole(pathname: string): AuthRole | null {
  for (const [role, basePath] of Object.entries(DASHBOARD_ROUTES)) {
    if (pathname === basePath || pathname.startsWith(`${basePath}/`)) {
      return role as AuthRole;
    }
  }
  return null;
}

/**
 * Checks if a role is allowed to access a given dashboard path.
 * SuperAdmin can access any dashboard path.
 * Other roles can only access their own dashboard.
 */
export function isRoleAllowedOnPath(role: AuthRole, pathname: string): boolean {
  if (role === AuthRole.SUPERADMIN) {
    return true;
  }

  const pathRole = getPathRole(pathname);
  if (pathRole === null) {
    return true; // Not a dashboard path — allow
  }

  return pathRole === role;
}

/**
 * Checks if a path is a dashboard route (any role's dashboard).
 */
export function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_PATHS.some(
    (basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`),
  );
}
