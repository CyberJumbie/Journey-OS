import type { Metadata } from "next";
import { ResetPasswordForm } from "@web/components/auth/reset-password-form";
import { AuthLayout } from "@web/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Reset Password — Journey OS",
  description: "Set a new password for your Journey OS account.",
};

// Next.js App Router requires default export for pages
export default function ResetPasswordPage() {
  return (
    <AuthLayout
      headline="Set a new password"
      subheadline="Choose a strong password to secure your account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
