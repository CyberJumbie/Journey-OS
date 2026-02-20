import type { Metadata } from "next";
import { Suspense } from "react";
import { InvitationAcceptFlow } from "@web/components/auth/invitation-accept-form";

export const metadata: Metadata = {
  title: "Accept Invitation — Journey OS",
  description: "Accept your invitation and create your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function InviteAcceptPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-8">
              <span className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          }
        >
          <InvitationAcceptFlow />
        </Suspense>
      </div>
    </div>
  );
}
