import type { Metadata } from "next";
import { Suspense } from "react";
import { InvitationAcceptFlow } from "@web/components/auth/invitation-accept-form";
import { AuthLayout } from "@web/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Accept Invitation — Journey OS",
  description: "Accept your invitation and create your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function InviteAcceptPage() {
  return (
    <AuthLayout
      headline="Join your team"
      subheadline="Accept your invitation and start collaborating."
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-8">
            <span className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-border-light border-t-transparent" />
            <p className="text-sm text-text-secondary">Loading...</p>
          </div>
        }
      >
        <InvitationAcceptFlow />
      </Suspense>
    </AuthLayout>
  );
}
