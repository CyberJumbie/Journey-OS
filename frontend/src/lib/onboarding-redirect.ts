import type { UserRole } from '@journey-os/shared-types';
import { ONBOARDING_ROUTE, ROLE_HOME } from '@journey-os/shared-types';

/**
 * Returns the onboarding route for a given primary role.
 * Called after /invite/accept password set and after first login
 * if onboarding_completed = false.
 */
export function getOnboardingRoute(primaryRole: UserRole): string {
  return ONBOARDING_ROUTE[primaryRole] ?? '/onboarding';
}

/**
 * Returns the post-onboarding dashboard for a given primary role.
 */
export function getDashboardRoute(primaryRole: UserRole): string {
  return ROLE_HOME[primaryRole] ?? '/dashboard';
}
