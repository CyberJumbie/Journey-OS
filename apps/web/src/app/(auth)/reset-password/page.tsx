import type { Metadata } from "next";
import { ResetPasswordForm } from "@web/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Journey OS",
  description: "Set a new password for your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
