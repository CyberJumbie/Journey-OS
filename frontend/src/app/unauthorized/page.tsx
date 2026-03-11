import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser, getPostLoginRedirect } from '@/lib/auth';

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  const dashboardLink = user
    ? getPostLoginRedirect({ ...user, onboarding_completed: true })
    : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--gray-300)]/40 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[var(--red)]/10">
          <ShieldAlert className="size-8 text-[var(--red)]" />
        </div>

        <h1 className="mb-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)]">
          Access Denied
        </h1>

        <p className="mb-6 text-sm text-[var(--gray-600)]">
          You don&apos;t have permission to view this page.
          {user && (
            <>
              {' '}Your current role is{' '}
              <span className="font-semibold text-[var(--navy)]">
                {user.role.replace('_', ' ')}
              </span>.
            </>
          )}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={dashboardLink}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--navy)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--blue)]"
          >
            {user ? 'Go to Dashboard' : 'Sign In'}
          </Link>

          {user && (
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--gray-600)] transition-colors hover:text-[var(--navy)]"
            >
              Sign out and use a different account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
