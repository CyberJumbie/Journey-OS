import type { Metadata } from "next";
import { ForgotPasswordForm } from "@web/components/auth/forgot-password-form";
import { AuthLayout } from "@web/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Forgot Password — Journey OS",
  description: "Request a password reset link for your Journey OS account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline="Reset your password"
      subheadline="We'll send you a secure link to set a new password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
