import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';
import type { UserRole } from '@journey-os/shared-types';

// ── Public routes — no session required ──────────────────────────────────────
const PUBLIC_PATHS = new Set([
  '/',
  '/home',
  '/apply',
  '/institution-application',
  '/login',
  '/register',
  '/forgot-password',
  '/email-verification',
  '/verify-email',
  '/invitation',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/register/')) return true;
  if (pathname.startsWith('/invitation/')) return true;
  return false;
}

// ── Route prefix → allowed roles ─────────────────────────────────────────────
interface RoleGuard {
  prefixes: string[];
  roles: UserRole[];
}

const ROLE_GUARDS: RoleGuard[] = [
  {
    prefixes: ['/admin'],
    roles: ['superadmin'],
  },
  {
    prefixes: ['/institution'],
    roles: ['institutional_admin', 'superadmin'],
  },
  {
    prefixes: [
      '/dashboard', '/courses', '/generation', '/questions', '/exams',
      '/workbench', '/repository', '/analytics', '/batches', '/history',
      '/uploads', '/items', '/collaboration', '/communications',
      '/operations', '/templates',
    ],
    roles: ['faculty', 'superadmin'],
  },
  {
    prefixes: ['/student-dashboard', '/student'],
    roles: ['student'],
  },
  {
    prefixes: ['/advisor'],
    roles: ['advisor', 'superadmin'],
  },
];

const SHARED_PATHS = ['/profile', '/settings', '/notifications', '/help'];

// ── Role → home route ────────────────────────────────────────────────────────
const ROLE_HOME: Record<string, string> = {
  faculty: '/dashboard',
  institutional_admin: '/institution/dashboard',
  superadmin: '/admin',
  student: '/student-dashboard',
  advisor: '/advisor/cohort',
};

// ── Onboarding ───────────────────────────────────────────────────────────────
const HAS_ONBOARDING = new Set(['faculty', 'institutional_admin', 'student']);
const ONBOARDING_ROUTE: Record<string, string> = {
  faculty: '/onboarding',
  institutional_admin: '/onboarding/admin',
  student: '/onboarding/student',
};

function findRequiredRoles(pathname: string): UserRole[] | 'any_authenticated' | null {
  for (const guard of ROLE_GUARDS) {
    for (const prefix of guard.prefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return guard.roles;
      }
    }
  }

  for (const p of SHARED_PATHS) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return 'any_authenticated';
    }
  }

  if (pathname.startsWith('/onboarding')) {
    return 'any_authenticated';
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Smoke-test bypass — development only
  if (process.env.SMOKE_TEST === 'true') {
    return NextResponse.next();
  }

  // Phase 1: Public bypass
  if (isPublicPath(pathname)) {
    const { supabase, response } = createMiddlewareSupabaseClient(request);
    await supabase.auth.getUser(); // refresh session cookies
    return response();
  }

  // Phase 2: Session check — read from JWT, no DB query
  const { supabase, response } = createMiddlewareSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Phase 3: Extract role from JWT app_metadata (populated by sync_jwt_claims trigger)
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  const role = (meta?.role as UserRole) ?? null;
  const onboardingCompleted = (meta?.onboarding_completed as boolean) ?? false;
  const isCourseDirector = (meta?.is_course_director as boolean) ?? false;

  // No role in JWT means no profile exists yet → send to register
  if (!role) {
    const registerUrl = request.nextUrl.clone();
    registerUrl.pathname = '/register';
    return NextResponse.redirect(registerUrl);
  }

  // Phase 4: Onboarding gate
  if (
    HAS_ONBOARDING.has(role) &&
    !onboardingCompleted &&
    !pathname.startsWith('/onboarding')
  ) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = ONBOARDING_ROUTE[role] ?? '/onboarding';
    return NextResponse.redirect(onboardingUrl);
  }

  // Phase 5: Role-path guard
  const requiredRoles = findRequiredRoles(pathname);

  if (requiredRoles === null) {
    return response();
  }

  if (requiredRoles === 'any_authenticated') {
    return response();
  }

  const effectiveRoles: UserRole[] = [role];
  if (isCourseDirector && !effectiveRoles.includes('faculty')) {
    effectiveRoles.push('faculty');
  }

  const hasAccess = requiredRoles.some(r => effectiveRoles.includes(r));
  if (!hasAccess) {
    // Wrong role → redirect to their own home, not a 403
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = ROLE_HOME[role] ?? '/dashboard';
    return NextResponse.redirect(homeUrl);
  }

  return response();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
