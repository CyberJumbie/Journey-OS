import { Suspense } from "react";
import type { Metadata } from "next";
import { VerificationInterstitial } from "@web/components/auth/verification-interstitial";

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
    <main className="flex min-h-screen items-center justify-center bg-parchment p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-light border-t-blue-mid" />
          </div>
        }
      >
        <VerificationInterstitial />
      </Suspense>
    </main>
  );
}
