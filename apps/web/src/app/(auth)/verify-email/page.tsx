import { Suspense } from "react";
import type { Metadata } from "next";
import { VerificationInterstitial } from "@web/components/auth/verification-interstitial";
import { AuthLayout } from "@web/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Verify Your Email — Journey OS",
  description: "Please verify your email address to continue.",
};

/**
 * Email verification interstitial page.
 * [STORY-U-14] Shown to authenticated but unverified users.
 */
export default function VerifyEmailPage() {
  return (
    <AuthLayout
      headline="Check your inbox"
      subheadline="We sent a verification link to your email address."
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-light border-t-blue-mid" />
          </div>
        }
      >
        <VerificationInterstitial />
      </Suspense>
    </AuthLayout>
  );
}
