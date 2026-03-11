import { redirect } from 'next/navigation';
import { requireAuth, getPostLoginRedirect } from '@/lib/auth';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  if (user.onboarding_completed) {
    redirect(getPostLoginRedirect({ ...user, onboarding_completed: true }));
  }

  return <>{children}</>;
}
