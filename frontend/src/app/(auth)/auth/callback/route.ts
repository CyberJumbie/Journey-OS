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
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (!profile.onboarding_completed) {
            const onboardingRoutes: Record<string, string> = {
              faculty: '/onboarding',
              student: '/onboarding/student',
              institutional_admin: '/onboarding/admin',
              superadmin: '/onboarding/admin',
              advisor: '/onboarding',
            };
            redirectUrl.pathname = onboardingRoutes[profile.role] ?? '/onboarding';
          } else {
            const dashboardRoutes: Record<string, string> = {
              faculty: '/dashboard',
              student: '/student-dashboard',
              institutional_admin: '/institution/dashboard',
              superadmin: '/admin',
              advisor: '/advisor/cohort',
            };
            redirectUrl.pathname = dashboardRoutes[profile.role] ?? '/dashboard';
          }
        } else {
          redirectUrl.pathname = '/role-selection';
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
