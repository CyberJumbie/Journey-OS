/**
 * Onboarding types.
 * [STORY-U-13] Types for persona onboarding screens and status tracking.
 */

/** A single onboarding step definition */
export interface OnboardingStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly action_label?: string;
  readonly action_href?: string;
}

/** Onboarding configuration for a specific role */
export interface OnboardingConfig {
  readonly role: string;
  readonly welcome_title: string;
  readonly welcome_subtitle: string;
  readonly steps: readonly OnboardingStep[];
}

/** Status response from the API */
export interface OnboardingStatus {
  readonly onboarding_complete: boolean;
  readonly role: string;
}

/** Request to mark onboarding as complete */
export interface OnboardingCompleteRequest {
  readonly skipped: boolean;
}

/** Result after marking onboarding complete */
export interface OnboardingCompleteResult {
  readonly user_id: string;
  readonly onboarding_complete: boolean;
  readonly completed_at: string;
}
