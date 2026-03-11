import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectUrl = request.nextUrl.clone();

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Read role from JWT app_metadata (populated by sync_jwt_claims trigger)
        const meta = user.app_metadata as Record<string, unknown> | undefined;
        const role = meta?.role as string | undefined;
        const onboardingCompleted = (meta?.onboarding_completed as boolean) ?? false;

        const hasOnboarding = new Set(['faculty', 'institutional_admin', 'student']);
        const onboardingRoutes: Record<string, string> = {
          faculty: '/onboarding',
          student: '/onboarding/student',
          institutional_admin: '/onboarding/admin',
        };
        const dashboardRoutes: Record<string, string> = {
          faculty: '/dashboard',
          student: '/student-dashboard',
          institutional_admin: '/institution/dashboard',
          superadmin: '/admin',
          advisor: '/advisor/cohort',
        };

        if (!role) {
          redirectUrl.pathname = '/register';
        } else if (!onboardingCompleted && hasOnboarding.has(role)) {
          redirectUrl.pathname = onboardingRoutes[role] ?? '/onboarding';
        } else {
          redirectUrl.pathname = dashboardRoutes[role] ?? '/dashboard';
        }
      } else {
        redirectUrl.pathname = '/login';
      }

      redirectUrl.searchParams.delete('code');
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.pathname = '/login';
  redirectUrl.searchParams.delete('code');
  return NextResponse.redirect(redirectUrl);
}
