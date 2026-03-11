import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';
import type { UserRole } from '@journey-os/shared-types';

const PUBLIC_PATHS = new Set([
  '/',
  '/home',
  '/apply',
  '/institution-application',
  '/login',
  '/register',
  '/role-selection',
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

  // Phase 2: Session check
  const { supabase, response } = createMiddlewareSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Phase 3: Profile + onboarding gate
  const requiredRoles = findRequiredRoles(pathname);
  if (requiredRoles === null) {
    return response();
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_course_director, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const roleUrl = request.nextUrl.clone();
    roleUrl.pathname = '/role-selection';
    return NextResponse.redirect(roleUrl);
  }

  // Onboarding gate — skip if already on onboarding pages
  if (!profile.onboarding_completed && !pathname.startsWith('/onboarding')) {
    const onboardingUrl = request.nextUrl.clone();
    const role = profile.role as UserRole;
    const onboardingRoutes: Record<string, string> = {
      faculty: '/onboarding',
      student: '/onboarding/student',
      institutional_admin: '/onboarding/admin',
      superadmin: '/onboarding/admin',
      advisor: '/onboarding',
    };
    onboardingUrl.pathname = onboardingRoutes[role] ?? '/onboarding';
    return NextResponse.redirect(onboardingUrl);
  }

  // Phase 4: Role-path guard
  if (requiredRoles === 'any_authenticated') {
    return response();
  }

  const userRole = profile.role as UserRole;
  const effectiveRoles: UserRole[] = [userRole];
  if (profile.is_course_director && !effectiveRoles.includes('faculty')) {
    effectiveRoles.push('faculty');
  }

  const hasAccess = requiredRoles.some(r => effectiveRoles.includes(r));
  if (!hasAccess) {
    const unauthorizedUrl = request.nextUrl.clone();
    unauthorizedUrl.pathname = '/unauthorized';
    return NextResponse.redirect(unauthorizedUrl);
  }

  return response();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
