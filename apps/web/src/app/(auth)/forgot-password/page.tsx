import type { Metadata } from "next";
import { ForgotPasswordForm } from "@web/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — Journey OS",
  description: "Request a password reset link for your Journey OS account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
