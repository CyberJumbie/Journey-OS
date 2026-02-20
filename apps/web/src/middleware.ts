import { NextResponse, type NextRequest } from "next/server";
import { AuthRole } from "@journey-os/types";
import { createMiddlewareClient } from "@web/lib/supabase/middleware";
import {
  isPublicRoute,
  isAuthRoute,
  getDashboardPath,
  isRoleAllowedOnPath,
} from "@web/lib/auth/dashboard-routes";

/**
 * Next.js middleware: session refresh + route protection + role-based routing.
 *
 * Flow:
 * 1. Refresh Supabase session (getUser validates JWT server-side)
 * 2. Public routes → pass through
 * 3. Auth routes (login, register) + authenticated → redirect to dashboard
 * 4. Protected routes + unauthenticated → redirect to /login
 * 5. Dashboard routes + wrong role → redirect to /unauthorized
 */
// Next.js App Router requires default export for middleware
export default async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  // Always refresh session — getUser() validates JWT server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Root path: authenticated users go to dashboard, unauthenticated see landing page
  if (pathname === "/") {
    if (user) {
      const role = user.app_metadata?.role as string | undefined;
      const dashboardPath = role ? getDashboardPath(role) : null;
      const url = request.nextUrl.clone();
      url.pathname = dashboardPath ?? "/unauthorized";
      return NextResponse.redirect(url);
    }
    return response();
  }

  // Public routes: always accessible
  if (isPublicRoute(pathname)) {
    // Auth routes: if already authenticated, redirect to dashboard
    if (user && isAuthRoute(pathname)) {
      const role = user.app_metadata?.role as string | undefined;
      const dashboardPath = role ? getDashboardPath(role) : null;
      const url = request.nextUrl.clone();
      url.pathname = dashboardPath ?? "/unauthorized";
      return NextResponse.redirect(url);
    }
    return response();
  }

  // Auth callback: always pass through (handles PKCE exchange)
  if (pathname.startsWith("/auth/callback")) {
    return response();
  }

  // Protected routes: require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Dashboard routes: check role authorization
  const role = user.app_metadata?.role as string | undefined;
  if (role && !isRoleAllowedOnPath(role as AuthRole, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return response();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
