import type { Metadata } from "next";
import { ForgotPasswordForm } from "@web/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — Journey OS",
  description: "Request a password reset link for your Journey OS account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
