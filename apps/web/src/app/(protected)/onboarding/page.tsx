import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingFlow } from "@web/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Onboarding — Journey OS",
  description: "Get started with your personalized onboarding experience.",
};

/**
 * Onboarding page.
 * [STORY-U-13] Shows role-specific onboarding steps on first login.
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        }
      >
        <OnboardingFlow />
      </Suspense>
    </main>
  );
}
